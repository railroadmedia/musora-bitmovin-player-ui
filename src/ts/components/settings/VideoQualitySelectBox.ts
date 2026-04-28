import { SelectBox } from './SelectBox';
import { ListSelectorConfig } from '../lists/ListSelector';
import { UIInstanceManager } from '../../UIManager';
import { PlayerAPI } from 'bitmovin-player';
import { i18n } from '../../localization/i18n';
import { StorageUtils } from '../../utils/StorageUtils';
import { prefixCss } from '../DummyComponent';

/**
 * A select box providing a selection between 'auto' and the available video qualities (resolutions / bitrates).
 * Included in the standard settings panel (e.g. {@link UIFactory.buildMusoraUI}, {@link UIFactory.buildSmallScreenUI}). Wired to
 * {@link PlayerAPI.getAvailableVideoQualities}, {@link PlayerAPI.setVideoQuality}, and
 * {@link PlayerAPI.exports.PlayerEvent.VideoQualityChanged}.
 *
 * The chosen quality is stored in {@link StorageUtils} by **rendition height** (e.g. `"720"`) rather
 * than the source-specific rendition ID, so the same preference applies across different videos.
 * "auto" is stored as the literal string `"auto"`. If the stored height is unavailable in a new
 * source the player falls back to its default without overwriting storage, preserving the user's
 * intent for future sources.
 * Disabled when {@link UIConfig.disableStorageApi} is true.
 *
 * @category Components
 */
export class VideoQualitySelectBox extends SelectBox {
  private hasAuto: boolean;

  /** localStorage key for last user-chosen video quality (persisted as height or "auto"). */
  private static readonly STORAGE_KEY = prefixCss('video-quality-preference');

  /**
   * Guards against programmatic selectItem calls (during restore / UI sync) being
   * mistaken for user-initiated selections and triggering a storage write.
   */
  private isRestoringPreference = false;

  constructor(config: ListSelectorConfig = {}) {
    super(config);

    this.config = this.mergeConfig(
      config,
      {
        cssClasses: ['ui-videoqualityselectbox'],
      },
      this.config,
    );
  }

  configure(player: PlayerAPI, uimanager: UIInstanceManager): void {
    super.configure(player, uimanager);

    const selectCurrentVideoQuality = (): void => {
      this.isRestoringPreference = true;
      this.selectItem(player.getVideoQuality().id);
      this.isRestoringPreference = false;
    };

    /** Finds the rendition ID whose height matches the stored preference, or null if unavailable. */
    const findQualityIdByPersistedKey = (persisted: string): string | null => {
      if (persisted === 'auto') {
        return this.hasAuto ? 'auto' : null;
      }
      const height = parseInt(persisted, 10);
      if (!isNaN(height)) {
        const match = player.getAvailableVideoQualities().find(q => q.height === height);
        return match?.id ?? null;
      }
      return null;
    };

    const defaultQualityId = (): string | null => {
      const renditions = player.getAvailableVideoQualities();
      if (this.hasAuto) {
        return 'auto';
      }
      return renditions.length > 0 ? renditions[0].id : null;
    };

    const applyPersistedPreferenceThenSyncUi = (): void => {
      const persisted = StorageUtils.getItem(VideoQualitySelectBox.STORAGE_KEY);

      if (persisted !== null) {
        const qualityId = findQualityIdByPersistedKey(persisted);
        if (qualityId !== null) {
          player.setVideoQuality(qualityId);
          selectCurrentVideoQuality();
          return;
        }
        // Stored preference not available in this source — apply the default but
        // do NOT overwrite storage: preserve the user's intent for future sources.
        const fallback = defaultQualityId();
        if (fallback !== null) {
          player.setVideoQuality(fallback);
        }
      }

      selectCurrentVideoQuality();
    };

    const updateVideoQualities = (): void => {
      const videoQualities = player.getAvailableVideoQualities();

      this.clearItems();

      // Progressive streams do not support automatic quality selection
      this.hasAuto = player.getStreamType() !== 'progressive';

      if (this.hasAuto) {
        // Add entry for automatic quality switching (default setting)
        this.addItem('auto', i18n.getLocalizer('auto'));
      }

      // Add video qualities — display as "1080p" / "720p" etc. derived from the
      // rendition height. If two renditions share the same height, append a bitrate
      // hint (e.g. "1080p · 8 Mbps") so the user can tell them apart.
      const heightCounts: Record<number, number> = {};
      for (const q of videoQualities) {
        if (q.height > 0) {
          heightCounts[q.height] = (heightCounts[q.height] ?? 0) + 1;
        }
      }

      for (const videoQuality of videoQualities) {
        const label = VideoQualitySelectBox.qualityLabel(videoQuality, heightCounts);
        this.addItem(videoQuality.id, label);
      }

      if (this.itemCount() === 0) {
        return;
      }

      applyPersistedPreferenceThenSyncUi();
    };

    this.onItemSelected.subscribe((sender: VideoQualitySelectBox, value: string) => {
      // Programmatic selectItem calls (UI sync, ABR reporting a quality change) must not
      // overwrite the user's stored preference.
      if (this.isRestoringPreference) {
        return;
      }

      player.setVideoQuality(value);

      // Persist by height (cross-source) rather than the source-specific rendition ID.
      if (value === 'auto') {
        StorageUtils.setItem(VideoQualitySelectBox.STORAGE_KEY, 'auto');
      } else {
        const quality = player.getAvailableVideoQualities().find(q => q.id === value);
        if (quality && quality.height > 0) {
          StorageUtils.setItem(VideoQualitySelectBox.STORAGE_KEY, String(quality.height));
        }
      }
    });

    // Re-apply preference when a new source loads (new video)
    player.on(player.exports.PlayerEvent.SourceLoaded, updateVideoQualities);
    // Update qualities when source goes away
    player.on(player.exports.PlayerEvent.SourceUnloaded, updateVideoQualities);
    // Update qualities when the period within a source changes
    player.on(player.exports.PlayerEvent.PeriodSwitched, updateVideoQualities);
    // Update quality selection when quality is changed (from outside)
    player.on(player.exports.PlayerEvent.VideoQualityChanged, selectCurrentVideoQuality);

    if ((player.exports.PlayerEvent as any).VideoQualityAdded) {
      // Update qualities when their availability changed
      // TODO: remove any cast after next player release
      player.on((player.exports.PlayerEvent as any).VideoQualityAdded, updateVideoQualities);
      player.on((player.exports.PlayerEvent as any).VideoQualityRemoved, updateVideoQualities);
    }

    uimanager.getConfig().events.onUpdated.subscribe(updateVideoQualities);
  }

  /**
   * Returns true if the select box contains an 'auto' item for automatic quality selection mode.
   * @return {boolean}
   */
  hasAutoItem(): boolean {
    return this.hasAuto;
  }

  /**
   * Derives a human-readable label for a video quality rendition.
   *
   * - Uses the rendition height to produce standard labels like "1080p", "720p", etc.
   * - When multiple renditions share the same height (e.g. two 1080p streams at
   *   different bitrates), a bitrate hint is appended: "1080p · 8 Mbps".
   * - Falls back to the manifest-provided label when height is unavailable.
   *
   * @param quality The video quality object from the player API.
   * @param heightCounts A map of height → number of renditions at that height.
   */
  private static qualityLabel(
    quality: { height: number; bitrate: number; label?: string },
    heightCounts: Record<number, number>,
  ): string {
    if (!quality.height || quality.height <= 0) {
      return quality.label ?? '';
    }

    const base = `${quality.height}p`;

    if (heightCounts[quality.height] > 1 && quality.bitrate > 0) {
      const mbps = (quality.bitrate / 1_000_000).toFixed(1).replace(/\.0$/, '');
      return `${base} · ${mbps} Mbps`;
    }

    return base;
  }
}
