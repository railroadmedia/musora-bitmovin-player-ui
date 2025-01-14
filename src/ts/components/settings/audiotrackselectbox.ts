import {SelectBox} from './selectbox';
import {ListSelectorConfig} from '../lists/listselector';
import {UIInstanceManager} from '../../uimanager';
import {AudioTrackSwitchHandler} from '../../utils/audiotrackutils';
import { PlayerAPI } from 'bitmovin-player';

/**
 * A select box providing a selection between available audio tracks (e.g. different languages).
 *
 * @category Components
 */
export class AudioTrackSelectBox extends SelectBox {

  constructor(config: ListSelectorConfig = {}) {
    super(config);

    this.config = this.mergeConfig(config, {
      cssClasses: ['ui-audiotrackselectbox'],
    }, this.config);
  }

  configure(player: PlayerAPI, uimanager: UIInstanceManager): void {
    super.configure(player, uimanager);

    new AudioTrackSwitchHandler(player, this, uimanager);
  }
}