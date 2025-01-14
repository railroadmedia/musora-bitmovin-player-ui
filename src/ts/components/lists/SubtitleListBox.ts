import {ListBox} from './ListBox';
import {UIInstanceManager} from '../../UIManager';
import {SubtitleSwitchHandler} from '../../utils/SubtitleUtils';
import { PlayerAPI } from 'bitmovin-player';

/**
 * A element that is similar to a select box where the user can select a subtitle
 *
 * @category Components
 */
export class SubtitleListBox extends ListBox {

  configure(player: PlayerAPI, uimanager: UIInstanceManager): void {
    super.configure(player, uimanager);

    new SubtitleSwitchHandler(player, this, uimanager);
  }
}
