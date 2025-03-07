import { PlayerAPI } from 'bitmovin-player';
import { UIInstanceManager } from '../uimanager';
import { VideoQualitySwitchHandler } from '../videoqualityswitchhandler';
import { ListBox } from './listbox';

export class VideoQualityListBox extends ListBox {
  private handler?: VideoQualitySwitchHandler;

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
