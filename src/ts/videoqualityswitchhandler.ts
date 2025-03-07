import { PlayerAPI } from 'bitmovin-player';
import { ListSelector, ListSelectorConfig } from './components/listselector';
import { i18n } from './localization/i18n';
import { UIInstanceManager } from './uimanager';

/**
 * Helper class to handle all video tracks related events
 *
 * This class listens to player events as well as the `ListSelector` event if selection changed
 *
 * @category Utils
 */
export class VideoQualitySwitchHandler {
  private player: PlayerAPI;
  private listElement: ListSelector<ListSelectorConfig>;
  private uimanager: UIInstanceManager;

  private hasAuto: boolean;

  constructor(player: PlayerAPI, element: ListSelector<ListSelectorConfig>, uimanager: UIInstanceManager) {
    this.player = player;
    this.listElement = element;
    this.uimanager = uimanager;
    this.hasAuto = false;

    this.bindSelectionEvent();
    this.bindPlayerEvents();
  }

  /**
   * Returns true if the select box contains an 'auto' item for automatic quality selection mode.
   * @return {boolean}
   */
  hasAutoItem(): boolean {
    return this.hasAuto;
  }

  private bindSelectionEvent(): void {
    this.listElement.onItemSelected.subscribe((_, value: string) => {
      this.player.setVideoQuality(value);
    });
  }

  private bindPlayerEvents(): void {
    // Update qualities when source goes away
    this.player.on(this.player.exports.PlayerEvent.SourceUnloaded, this.updateVideoQualities);
    // Update qualities when the period within a source changes
    this.player.on(this.player.exports.PlayerEvent.PeriodSwitched, this.updateVideoQualities);
    // Update quality selection when quality is changed (from outside)
    this.player.on(this.player.exports.PlayerEvent.VideoQualityChanged, this.selectCurrentVideoQuality);

    if (this.player.exports.PlayerEvent.VideoQualityAdded) {
      // Update qualities when their availability changed
      this.player.on(this.player.exports.PlayerEvent.VideoQualityAdded, this.updateVideoQualities);
      this.player.on(this.player.exports.PlayerEvent.VideoQualityRemoved, this.updateVideoQualities);
    }

    this.uimanager.getConfig().events.onUpdated.subscribe(this.updateVideoQualities);
  }

  private selectCurrentVideoQuality = () => {
    this.listElement.selectItem(this.player.getVideoQuality().id);
  };

  private updateVideoQualities = () => {
    let videoQualities = this.player.getAvailableVideoQualities();

    this.listElement.clearItems();

    // Progressive streams do not support automatic quality selection
    this.hasAuto = this.player.getStreamType() !== 'progressive';

    if (this.hasAuto) {
      // Add entry for automatic quality switching (default setting)
      this.listElement.addItem('auto', i18n.getLocalizer('auto'));
    }

    // Add video qualities
    for (let videoQuality of videoQualities) {
      this.listElement.addItem(videoQuality.id, videoQuality.label ?? videoQuality.id);
    }

    // Select initial quality
    this.selectCurrentVideoQuality();
  };
}
