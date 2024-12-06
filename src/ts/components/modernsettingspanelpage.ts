import {ContainerConfig} from './container';
import {UIInstanceManager} from '../uimanager';
import {Event, EventDispatcher, NoArgs} from '../eventdispatcher';
import { PlayerAPI } from 'bitmovin-player';
import { ModernSettingsPanelItem } from './modernsettingspanelitem';
import { SettingsPanelPage } from './settingspanelpage';

// TODO: needed?
/**
 * A panel containing a list of {@link ModernSettingsPanelItem items} that represent labelled settings.
 */
export class ModernSettingsPanelPage extends SettingsPanelPage {

  private modernSettingsPanelPageEvents = {
    onRequestsDisplaySubPage: new EventDispatcher<ModernSettingsPanelPage, ModernSettingsPanelPage>(),
    onRequestsNavigateBack: new EventDispatcher<ModernSettingsPanelPage, ModernSettingsPanelPage>(),
  };

  constructor(config: ContainerConfig) {
    super(config);

    this.config = this.mergeConfig<ContainerConfig>(config, {
      cssClass: 'ui-settings-panel-page',
      role: 'menu',
    }, this.config);
  }

  configure(player: PlayerAPI, uimanager: UIInstanceManager): void {
    super.configure(player, uimanager);

    // for (let component of this.getItems()) {
    //   if (component instanceof ModernSettingsPanelItem) {
    //     component.getOnDisplaySubPage.subscribe((_, args: ModernSettingsPanelPage) => this.requestsDisplaySubMenu(this, args));
    //     component.getOnRequestNavigateBack.subscribe(() => this.modernSettingsPanelPageEvents.onRequestsNavigateBack.dispatch(this));
    //   }
    // }
  }

  requestsDisplaySubMenu<Sender, Args>(_: Sender, args: ModernSettingsPanelPage) {
    this.modernSettingsPanelPageEvents.onRequestsDisplaySubPage.dispatch(this, args);
  }

  /**
   * Is fired, when an item inside this page wants to show its sub-page
   * This event is subscribed by the {@link ModernSettingsPanel}, which
   * takes the page as an argument in order to display it.
   */
  get onRequestsDisplaySubMenu(): Event<ModernSettingsPanelPage, NoArgs> {
    return this.modernSettingsPanelPageEvents.onRequestsDisplaySubPage.getEvent();
  }

  get onRequestsNavigateBack(): Event<ModernSettingsPanelPage, NoArgs> {
    return this.modernSettingsPanelPageEvents.onRequestsNavigateBack.getEvent();
  }

}
