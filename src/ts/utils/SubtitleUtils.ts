import { ListItem, ListSelector, ListSelectorConfig } from '../components/lists/ListSelector';
import { UIInstanceManager } from '../UIManager';
import { PlayerAPI, SubtitleEvent, SubtitleTrack } from 'bitmovin-player';
import { i18n } from '../localization/i18n';
import { StorageUtils } from './StorageUtils';
import { prefixCss } from '../components/DummyComponent';

/**
 * Persisted subtitle preference. Stored as JSON so we can fall back to language
 * matching when the track `id` differs across sources (e.g. different HLS manifests).
 */
interface PersistedSubtitleTrack {
  id: string;
  lang: string;
  label: string;
}

/**
 * Helper class to handle all subtitle related events
 *
 * This class listens to player events as well as the `ListSelector` event if selection changed
 *
 * @category Utils
 */
export class SubtitleSwitchHandler {
  private static SUBTITLES_OFF_KEY: string = 'null';

  /** localStorage key for the user's last chosen subtitle track (persists across sources). */
  private static readonly STORAGE_KEY = prefixCss('subtitle-preference');

  private player: PlayerAPI;
  private listElement: ListSelector<ListSelectorConfig>;
  private uimanager: UIInstanceManager;

  /**
   * Guards against programmatic selectItem calls (during restore / UI sync) being
   * mistaken for user-initiated selections and triggering a storage write.
   */
  private isRestoringPreference = false;

  constructor(player: PlayerAPI, element: ListSelector<ListSelectorConfig>, uimanager: UIInstanceManager) {
    this.player = player;
    this.listElement = element;
    this.uimanager = uimanager;

    this.bindSelectionEvent();
    this.bindPlayerEvents();
    this.refreshSubtitles();
  }

  // ─── Storage helpers ───────────────────────────────────────────────────────

  /**
   * Parses the raw localStorage value into a typed preference object.
   * Handles both the current JSON format and the legacy plain-string-ID format.
   * Returns `null` when nothing is stored.
   */
  private static parsePersistedSubtitle(raw: string): PersistedSubtitleTrack | 'off' | null {
    if (raw === SubtitleSwitchHandler.SUBTITLES_OFF_KEY) {
      return 'off';
    }
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if (parsed && typeof parsed.id === 'string') {
        return { id: parsed.id, lang: (parsed.lang as string) ?? '', label: (parsed.label as string) ?? '' };
      }
    } catch {
      // Legacy format: value was stored as a plain subtitle id string.
    }
    // Legacy plain-string fallback — wrap in the struct so the rest of the code is uniform.
    return { id: raw, lang: '', label: '' };
  }

  /** Strips region/script suffix so "en-US" and "en" both normalise to "en". */
  private static normalizeLang(lang: string): string {
    return lang.toLowerCase().split(/[-_]/)[0];
  }

  /**
   * Returns true when a player subtitle track matches the persisted preference.
   * Match order: exact id → exact lang → normalised lang (e.g. "en" matches "en-US") → label.
   */
  private static trackMatchesPersisted(track: SubtitleTrack, persisted: PersistedSubtitleTrack): boolean {
    if (track.id === persisted.id) {
      return true;
    }
    if (persisted.lang && track.lang) {
      if (track.lang === persisted.lang) {
        return true;
      }
      if (SubtitleSwitchHandler.normalizeLang(track.lang) === SubtitleSwitchHandler.normalizeLang(persisted.lang)) {
        return true;
      }
    }
    // Label fallback: useful when lang is absent or encoded differently.
    if (persisted.label && track.label && track.label.toLowerCase() === persisted.label.toLowerCase()) {
      return true;
    }
    return false;
  }

  /** Saves the selected subtitle track (or "off") to localStorage. */
  private persistSubtitleChoice(value: string): void {
    if (value === SubtitleSwitchHandler.SUBTITLES_OFF_KEY) {
      StorageUtils.setItem(SubtitleSwitchHandler.STORAGE_KEY, SubtitleSwitchHandler.SUBTITLES_OFF_KEY);
      return;
    }
    const track = this.player.subtitles.list().find(s => s.id === value);
    if (track) {
      const toStore: PersistedSubtitleTrack = { id: track.id, lang: track.lang ?? '', label: track.label ?? '' };
      StorageUtils.setItem(SubtitleSwitchHandler.STORAGE_KEY, JSON.stringify(toStore));
    } else {
      // Fallback: at least store the id so something is persisted.
      StorageUtils.setItem(SubtitleSwitchHandler.STORAGE_KEY, value);
    }
  }

  // ─── Event binding ─────────────────────────────────────────────────────────

  private bindSelectionEvent(): void {
    this.listElement.onItemSelected.subscribe((_, value: string) => {
      // Programmatic selectItem calls (UI sync during restore) must not be treated
      // as user selections — they would overwrite the stored preference.
      if (this.isRestoringPreference) {
        return;
      }

      // TODO add support for multiple concurrent subtitle selections
      if (value === SubtitleSwitchHandler.SUBTITLES_OFF_KEY) {
        const currentSubtitle = this.player.subtitles
          .list()
          .filter(subtitle => subtitle.enabled)
          .pop();
        if (currentSubtitle) {
          this.player.subtitles.disable(currentSubtitle.id);
        }
      } else {
        this.player.subtitles.enable(value, true);
      }
      this.persistSubtitleChoice(value);
    });
  }

  private bindPlayerEvents(): void {
    this.player.on(this.player.exports.PlayerEvent.SubtitleAdded, this.addSubtitle);
    this.player.on(this.player.exports.PlayerEvent.SubtitleEnabled, this.selectCurrentSubtitle);
    this.player.on(this.player.exports.PlayerEvent.SubtitleDisabled, this.selectCurrentSubtitle);
    this.player.on(this.player.exports.PlayerEvent.SubtitleRemoved, this.removeSubtitle);
    // Update subtitles when source goes away
    this.player.on(this.player.exports.PlayerEvent.SourceUnloaded, this.clearSubtitles);
    // Update subtitles when the period within a source changes
    this.player.on(this.player.exports.PlayerEvent.PeriodSwitched, this.refreshSubtitles);
    this.uimanager.getConfig().events.onUpdated.subscribe(this.refreshSubtitles);
  }

  private addSubtitle = (event: SubtitleEvent) => {
    const subtitle = event.subtitle;
    if (!this.listElement.hasItem(subtitle.id)) {
      this.listElement.addItem(subtitle.id, subtitle.label);
    }

    // Enable the track immediately if it matches the user's persisted preference.
    // This is timing-safe: onUpdated fires before SubtitleAdded events, so by the
    // time refreshSubtitles runs the track list is often still empty. Hooking here
    // ensures we catch the track the moment the player discovers it.
    const raw = StorageUtils.getItem(SubtitleSwitchHandler.STORAGE_KEY);
    if (raw && raw !== SubtitleSwitchHandler.SUBTITLES_OFF_KEY) {
      const persisted = SubtitleSwitchHandler.parsePersistedSubtitle(raw);
      if (
        persisted !== null &&
        persisted !== 'off' &&
        SubtitleSwitchHandler.trackMatchesPersisted(subtitle, persisted)
      ) {
        // SubtitleEnabled will fire synchronously → selectCurrentSubtitle updates the UI
        // with isRestoringPreference = true, so no storage write occurs.
        this.player.subtitles.enable(subtitle.id, true);
      }
    }
  };

  private removeSubtitle = (event: SubtitleEvent) => {
    const subtitle = event.subtitle;
    if (this.listElement.hasItem(subtitle.id)) {
      this.listElement.removeItem(subtitle.id);
    }

    this.selectCurrentSubtitle();
  };

  /**
   * Updates the list selection to reflect the player's current subtitle state.
   * Always runs with the restore guard active so it never triggers a storage write —
   * this method is only for keeping the UI in sync, not recording user intent.
   */
  private selectCurrentSubtitle = () => {
    if (!this.player.subtitles) {
      // Subtitles API not available (yet)
      return;
    }

    const currentSubtitle = this.player.subtitles
      .list()
      .filter(subtitle => subtitle.enabled)
      .pop();
    const key = currentSubtitle ? currentSubtitle.id : SubtitleSwitchHandler.SUBTITLES_OFF_KEY;

    this.isRestoringPreference = true;
    this.listElement.selectItem(key);
    this.isRestoringPreference = false;
  };

  private clearSubtitles = () => {
    this.listElement.clearItems();
  };

  private refreshSubtitles = () => {
    if (!this.player.subtitles) {
      // Subtitles API not available (yet)
      return;
    }

    const offListItem: ListItem = {
      key: SubtitleSwitchHandler.SUBTITLES_OFF_KEY,
      label: i18n.getLocalizer('off'),
    };

    const subtitles = this.player.subtitles.list();
    const subtitleToListItem = (subtitle: SubtitleTrack): ListItem => {
      return { key: subtitle.id, label: subtitle.label };
    };

    this.listElement.synchronizeItems([offListItem, ...subtitles.map(subtitleToListItem)]);
    // Apply preference against whatever tracks are already available. Tracks that
    // arrive later are handled by addSubtitle.
    this.applyPersistedSubtitle();
  };

  // ─── Persistence restore ───────────────────────────────────────────────────

  /**
   * Restores the user's last chosen subtitle from localStorage against the currently
   * available track list. Falls back to mirroring the player's current state when no
   * matching track exists yet (addSubtitle will retry when the track eventually arrives).
   *
   * Never writes to storage — only the user's own selections do that.
   */
  private applyPersistedSubtitle(): void {
    const raw = StorageUtils.getItem(SubtitleSwitchHandler.STORAGE_KEY);

    // No saved preference — mirror whatever the player reports.
    if (raw === null) {
      this.selectCurrentSubtitle();
      return;
    }

    const persisted = SubtitleSwitchHandler.parsePersistedSubtitle(raw);

    // User previously chose "off".
    if (persisted === 'off') {
      const enabledSubtitle = this.player.subtitles
        .list()
        .filter(s => s.enabled)
        .pop();
      if (enabledSubtitle) {
        // SubtitleDisabled fires synchronously → selectCurrentSubtitle (guarded) updates the UI.
        this.player.subtitles.disable(enabledSubtitle.id);
      } else {
        this.selectCurrentSubtitle();
      }
      return;
    }

    if (persisted === null) {
      this.selectCurrentSubtitle();
      return;
    }

    // Try to find a matching track in the current source (by id, then by lang, then by label).
    const available = this.player.subtitles.list();
    const match = available.find(s => SubtitleSwitchHandler.trackMatchesPersisted(s, persisted));
    if (match) {
      // SubtitleEnabled fires synchronously → selectCurrentSubtitle (guarded) updates the UI.
      this.player.subtitles.enable(match.id, true);
      return;
    }

    // No match yet — addSubtitle will handle it when the track arrives.
    // Do NOT write to storage: the user's original preference must be preserved for
    // future sources that may include the requested track.
    this.selectCurrentSubtitle();
  }
}
