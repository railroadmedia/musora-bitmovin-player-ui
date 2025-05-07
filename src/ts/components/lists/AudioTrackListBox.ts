import { ListBox, ListBoxConfig } from './ListBox';
import {UIInstanceManager} from '../../UIManager';
import {AudioTrackSwitchHandler} from '../../utils/AudioTrackUtils';
import { PlayerAPI } from 'bitmovin-player';
import { AudioTrackSelectBox } from '../settings/AudioTrackSelectBox';

/**
 * A element that is similar to a select box where the user can select a subtitle
 *
 * @category Components
 */
export class AudioTrackListBox extends ListBox {

  constructor(config: ListBoxConfig = {
    listSelector: new AudioTrackSelectBox()
  }) {
    super(config);
  }


  configure(player: PlayerAPI, uimanager: UIInstanceManager): void {
    super.configure(player, uimanager);
    new AudioTrackSwitchHandler(player, this.config.listSelector, uimanager);
  }
}
