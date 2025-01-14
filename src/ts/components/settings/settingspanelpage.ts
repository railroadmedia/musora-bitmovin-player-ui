import {Container, ContainerConfig} from '../container';
import { SettingsPanelItem, SettingsPanelItemConfig } from './settingspanelitem';
import {UIInstanceManager} from '../../uimanager';
import {Event, EventDispatcher, NoArgs} from '../../eventdispatcher';
import { PlayerAPI } from 'bitmovin-player';
import { BrowserUtils } from '../../utils/browserutils';

/**
 * Configuration interface for a {@link SettingsPanelPage}
 *
 * @category Configs
 */
export interface SettingsPanelPageConfig extends ContainerConfig {
  /**
   * If the page should be removed from the DOM when it is popped from the navigation stack.
   */
  removeOnPop?: Boolean;
}

/**
 * A panel containing a list of {@link SettingsPanelItem items} that represent labelled settings.
 *
 * @category Components
 */
export class SettingsPanelPage extends Container<SettingsPanelPageConfig> {

  private static readonly CLASS_LAST = 'last';

  private settingsPanelPageEvents = {
    onSettingsStateChanged: new EventDispatcher<SettingsPanelPage, NoArgs>(),
    onActive: new EventDispatcher<SettingsPanelPage, NoArgs>(),
    onInactive: new EventDispatcher<SettingsPanelPage, NoArgs>(),
  };

  constructor(config: SettingsPanelPageConfig) {
    super(config);

    this.config = this.mergeConfig(config, {
      cssClass: 'ui-settings-panel-page',
      role: 'menu',
      removeOnPop: false,
    } as SettingsPanelPageConfig, this.config);
  }

  configure(player: PlayerAPI, uimanager: UIInstanceManager): void {
    super.configure(player, uimanager);

    // Fire event when the state of a settings-item has changed
    let settingsStateChangedHandler = () => {
      this.onSettingsStateChangedEvent();

      // Attach marker class to last visible item
      let lastShownItem = null;
      for (let component of this.getItems()) {
        component.getDomElement().removeClass(this.prefixCss(SettingsPanelPage.CLASS_LAST));
        if (component.isShown()) {
          lastShownItem = component;
        }
      }
      if (lastShownItem) {
        lastShownItem.getDomElement().addClass(this.prefixCss(SettingsPanelPage.CLASS_LAST));
      }
    };
    for (let component of this.getItems()) {
      component.onActiveChanged.subscribe(settingsStateChangedHandler);
    }
  }

  hasActiveSettings(): boolean {
    for (let component of this.getItems()) {
      if (component.isActive()) {
        return true;
      }
    }

    return false;
  }

  getItems(): SettingsPanelItem<SettingsPanelItemConfig>[] {
    return <SettingsPanelItem<SettingsPanelItemConfig>[]>this.config.components.filter(component => component instanceof SettingsPanelItem);
  }

  onSettingsStateChangedEvent() {
    this.settingsPanelPageEvents.onSettingsStateChanged.dispatch(this);
  }

  get onSettingsStateChanged(): Event<SettingsPanelPage, NoArgs> {
    return this.settingsPanelPageEvents.onSettingsStateChanged.getEvent();
  }

  onActiveEvent() {
    const activeItems = this.getItems().filter((item) => item.isActive());

    this.settingsPanelPageEvents.onActive.dispatch(this);
    // Disable focus for iOS and iPadOS 13. They open select boxes automatically on focus and we want to avoid that.
    if (activeItems.length > 0 && !BrowserUtils.isIOS && !(BrowserUtils.isMacIntel && BrowserUtils.isTouchSupported)) {
      activeItems[0].getDomElement().focusToFirstInput();
    }
  }

  get onActive(): Event<SettingsPanelPage, NoArgs> {
    return this.settingsPanelPageEvents.onActive.getEvent();
  }

  onInactiveEvent() {
    this.settingsPanelPageEvents.onInactive.dispatch(this);
  }

  get onInactive(): Event<SettingsPanelPage, NoArgs> {
    return this.settingsPanelPageEvents.onInactive.getEvent();
  }
}
