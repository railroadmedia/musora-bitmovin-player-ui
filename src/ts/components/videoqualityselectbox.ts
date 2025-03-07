import { PlayerAPI } from 'bitmovin-player';
import { UIInstanceManager } from '../uimanager';
import { VideoQualitySwitchHandler } from '../videoqualityswitchhandler';
import { ListSelectorConfig } from './listselector';
import { SelectBox } from './selectbox';

/**
 * A select box providing a selection between 'auto' and the available video qualities.
 *
 * @category Components
 */
export class VideoQualitySelectBox extends SelectBox {
  private handler?: VideoQualitySwitchHandler;

  constructor(config: ListSelectorConfig = {}) {
    super(config);

    this.config = this.mergeConfig(config, { cssClasses: ['ui-videoqualityselectbox'] }, this.config);
  }

  configure(player: PlayerAPI, uimanager: UIInstanceManager): void {
    super.configure(player, uimanager);

    this.handler = new VideoQualitySwitchHandler(player, this, uimanager);
  }

  hasAutoItem(): boolean {
    if (!this.handler) {
      return false;
    }

    return this.handler.hasAutoItem();
  }
}
