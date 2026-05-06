import { ListItem, ListSelector, ListSelectorConfig } from '../components/lists/ListSelector';
import { UIInstanceManager } from '../UIManager';
import { AudioTrackEvent, PlayerAPI, AudioTrack } from 'bitmovin-player';
import { i18n } from '../localization/i18n';
import { StorageUtils } from './StorageUtils';
import { prefixCss } from '../components/DummyComponent';

/**
 * Persisted audio track preference. Stored as JSON so we can fall back to language
 * matching when the track `id` differs across sources (e.g. different HLS manifests).
 */
interface PersistedAudioTrack {
  id: string;
  lang: string;
  label: string;
}

/**
 * Helper class to handle all audio tracks related events
 *
 * This class listens to player events as well as the `ListSelector` event if selection changed
 *
 * @category Utils
 */
export class AudioTrackSwitchHandler {
  private player: PlayerAPI;
  private listElement: ListSelector<ListSelectorConfig>;
  private uimanager: UIInstanceManager;

  /** localStorage key for the user's last chosen audio track (persists across sources). */
  private static readonly STORAGE_KEY = prefixCss('audio-track-preference');

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
    this.refreshAudioTracks();
  }

  // ─── Storage helpers ───────────────────────────────────────────────────────

  /** Strips region/script suffix so "en-US" and "en" both normalise to "en". */
  private static normalizeLang(lang: string): string {
    return lang.toLowerCase().split(/[-_]/)[0];
  }

  /**
   * Returns true when a player audio track matches the persisted preference.
   * Match order: exact id → exact lang → normalised lang → label.
   */
  private static trackMatchesPersisted(track: AudioTrack, persisted: PersistedAudioTrack): boolean {
    if (track.id === persisted.id) {
      return true;
    }
    if (persisted.lang && track.lang) {
      if (track.lang === persisted.lang) {
        return true;
      }
      if (AudioTrackSwitchHandler.normalizeLang(track.lang) === AudioTrackSwitchHandler.normalizeLang(persisted.lang)) {
        return true;
      }
    }
    // Label fallback: useful when lang is absent or encoded differently.
    if (persisted.label && track.label && track.label.toLowerCase() === persisted.label.toLowerCase()) {
      return true;
    }
    return false;
  }

  /** Saves the selected audio track to localStorage. */
  private persistAudioTrackChoice(id: string): void {
    const track = this.player.getAvailableAudio().find(t => t.id === id);
    if (track) {
      const toStore: PersistedAudioTrack = { id: track.id, lang: track.lang ?? '', label: track.label ?? '' };
      StorageUtils.setItem(AudioTrackSwitchHandler.STORAGE_KEY, JSON.stringify(toStore));
    }
  }

  // ─── Persistence restore ───────────────────────────────────────────────────

  /**
   * Restores the user's last chosen audio track from localStorage against the currently
   * available track list. Falls back to mirroring the player's current state when no
   * matching track is found.
   *
   * Never writes to storage — only the user's own selections do that.
   */
  private applyPersistedAudioTrack(): void {
    const raw = StorageUtils.getItem(AudioTrackSwitchHandler.STORAGE_KEY);

    if (raw === null) {
      this.selectCurrentAudioTrack();
      return;
    }

    let persisted: PersistedAudioTrack | null = null;
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if (parsed && typeof parsed.id === 'string') {
        persisted = { id: parsed.id, lang: (parsed.lang as string) ?? '', label: (parsed.label as string) ?? '' };
      }
    } catch {
      // Malformed storage value — ignore and fall back to current state.
    }

    if (!persisted) {
      this.selectCurrentAudioTrack();
      return;
    }

    const match = this.player
      .getAvailableAudio()
      .find(t => AudioTrackSwitchHandler.trackMatchesPersisted(t, persisted!));
    if (match) {
      // AudioChanged fires synchronously → selectCurrentAudioTrack (guarded) updates the UI.
      this.player.setAudio(match.id);
    } else {
      // No match in this source — do NOT overwrite storage. The preference is preserved
      // for future sources that may include the requested track.
      this.selectCurrentAudioTrack();
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
      this.player.setAudio(value);
      this.persistAudioTrackChoice(value);
    });
  }

  private bindPlayerEvents(): void {
    // Update selection when selected track has changed
    this.player.on(this.player.exports.PlayerEvent.AudioChanged, this.selectCurrentAudioTrack);
    // Update tracks when source goes away
    this.player.on(this.player.exports.PlayerEvent.SourceUnloaded, this.refreshAudioTracks);
    // Update tracks when the period within a source changes
    this.player.on(this.player.exports.PlayerEvent.PeriodSwitched, this.refreshAudioTracks);
    // Update tracks when a track is added or removed
    this.player.on(this.player.exports.PlayerEvent.AudioAdded, this.addAudioTrack);
    this.player.on(this.player.exports.PlayerEvent.AudioRemoved, this.removeAudioTrack);
    this.uimanager.getConfig().events.onUpdated.subscribe(this.refreshAudioTracks);
  }

  private addAudioTrack = (event: AudioTrackEvent) => {
    const audioTrack = event.track;
    if (!this.listElement.hasItem(audioTrack.id)) {
      this.listElement.addItem(audioTrack.id, i18n.getLocalizer(audioTrack.label), true);
    }
  };

  private removeAudioTrack = (event: AudioTrackEvent) => {
    const audioTrack = event.track;
    if (this.listElement.hasItem(audioTrack.id)) {
      this.listElement.removeItem(audioTrack.id);
    }
  };

  /**
   * Updates the list selection to reflect the player's current audio track.
   * Always runs with the restore guard active so it never triggers a storage write —
   * this method is only for keeping the UI in sync, not recording user intent.
   */
  private selectCurrentAudioTrack = () => {
    const currentAudioTrack = this.player.getAudio();

    // HLS streams don't always provide this, so we have to check
    if (currentAudioTrack) {
      this.isRestoringPreference = true;
      this.listElement.selectItem(currentAudioTrack.id);
      this.isRestoringPreference = false;
    }
  };

  private refreshAudioTracks = () => {
    const audioTracks = this.player.getAvailableAudio();
    const audioTrackToListItem = (audioTrack: AudioTrack): ListItem => {
      return { key: audioTrack.id, label: audioTrack.label };
    };

    this.listElement.synchronizeItems(audioTracks.map(audioTrackToListItem));
    this.applyPersistedAudioTrack();
  };
}
