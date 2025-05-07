import { ListBox, ListBoxConfig } from './ListBox';
import {UIInstanceManager} from '../../UIManager';
import {SubtitleSwitchHandler} from '../../utils/SubtitleUtils';
import { PlayerAPI } from 'bitmovin-player';
import { SubtitleSelectBox } from '../settings/SubtitleSelectBox';

/**
 * A element that is similar to a select box where the user can select a subtitle
 *
 * @category Components
 */
export class SubtitleListBox extends ListBox {

  constructor(config: ListBoxConfig = {
    listSelector: new SubtitleSelectBox()
  }) {
    super(config);
  }

  configure(player: PlayerAPI, uimanager: UIInstanceManager): void {
    super.configure(player, uimanager);

    new SubtitleSwitchHandler(player, this.config.listSelector, uimanager);
  }
}
