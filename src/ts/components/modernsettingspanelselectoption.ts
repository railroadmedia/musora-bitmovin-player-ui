import { SettingsPanelItem, SettingsPanelItemConfig } from './settingspanelitem';
import { PlayerAPI } from 'bitmovin-player';
import { UIInstanceManager } from '../uimanager';
import { ListSelector, ListSelectorConfig } from './listselector';

export interface ModernSettingsPanelSelectOptionConfig extends SettingsPanelItemConfig {
  setting: ListSelector<ListSelectorConfig>;
  settingsValue: string | undefined;
  autoCloseOnSelect?: boolean;
}

export class ModernSettingsPanelSelectOption extends SettingsPanelItem<ModernSettingsPanelSelectOptionConfig> {

  private settingsValue: string | undefined;
  protected setting: ListSelector<ListSelectorConfig>;

  constructor(config: ModernSettingsPanelSelectOptionConfig) {
    super(config);

    this.settingsValue = config.settingsValue;

    this.config = this.mergeConfig(config, {
      cssClasses: ['ui-settings-panel-item-select-option'],
      role: 'menuitem',
    } as ModernSettingsPanelSelectOptionConfig, this.config);
  }

  configure(player: PlayerAPI, uimanager: UIInstanceManager) {
    super.configure(player, uimanager);

    const handleSelectedOptionChanged = () => {
      let selectedItem = this.setting.getSelectedItem();

      if (this.settingsValue === selectedItem) {
        this.getDomElement().addClass(this.prefixCss('selected'));
      } else {
        this.getDomElement().removeClass(this.prefixCss('selected'));
      }
    };
    this.setting.onItemSelected.subscribe(handleSelectedOptionChanged);

    const handleItemClick = () => {
      this.setting.selectItem(this.settingsValue);
    };
    this.getDomElement().on('click', () => handleItemClick());

    // Initial state
    handleSelectedOptionChanged();
  }
}
