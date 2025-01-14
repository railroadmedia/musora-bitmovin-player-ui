import { SettingsPanelItem, SettingsPanelItemConfig } from './settingspanelitem';
import { PlayerAPI } from 'bitmovin-player';
import { UIInstanceManager } from '../../uimanager';
import { ListSelector, ListSelectorConfig } from '../lists/listselector';

/**
 * Configuration interface for a {@link SettingsPanelSelectOption}.
 *
 * @category Configs
 */
export interface SettingsPanelSelectOptionConfig extends SettingsPanelItemConfig {
  /**
   * The setting that will be changed when this option is clicked.
   */
  settingComponent: ListSelector<ListSelectorConfig>;
  /**
   * The value of the setting that will be selected when this option is clicked.
   */
  settingsValue: string | undefined;
}

/**
 * A custom select option for a {@link ListSelector} option.
 * Is used for building dynamic sub pages from a {@link DynamicSettingsPanelItem}.
 *
 * @category Components
 */
export class SettingsPanelSelectOption extends SettingsPanelItem<SettingsPanelSelectOptionConfig> {
  private settingsValue: string | undefined;
  protected settingComponent: ListSelector<ListSelectorConfig>;

  constructor(config: SettingsPanelSelectOptionConfig) {
    super(config);

    this.settingsValue = config.settingsValue;

    this.config = this.mergeConfig(config, {
      cssClasses: ['ui-settings-panel-item-select-option'],
      role: 'menuitem',
    } as SettingsPanelSelectOptionConfig, this.config);
  }

  configure(player: PlayerAPI, uimanager: UIInstanceManager) {
    super.configure(player, uimanager);

    const handleSelectedOptionChanged = () => {
      let selectedItem = this.settingComponent.getSelectedItem();

      if (this.settingsValue === selectedItem) {
        this.getDomElement().addClass(this.prefixCss('selected'));
      } else {
        this.getDomElement().removeClass(this.prefixCss('selected'));
      }
    };
    this.settingComponent.onItemSelected.subscribe(handleSelectedOptionChanged);

    const handleItemClick = () => {
      this.settingComponent.selectItem(this.settingsValue);
    };
    this.getDomElement().on('click', () => handleItemClick());

    // Initial state
    handleSelectedOptionChanged();
  }
}
