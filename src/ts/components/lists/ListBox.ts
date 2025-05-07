import { ListSelector, ListSelectorConfig } from './ListSelector';
import { PlayerAPI } from 'bitmovin-player';
import { UIInstanceManager } from '../../UIManager';
import { SettingsPanel, SettingsPanelConfig } from '../settings/SettingsPanel';
import { SettingsPanelPage } from '../settings/SettingsPanelPage';
import { SettingsPanelSelectOption } from '../settings/SettingsPanelSelectOption';
import { SettingsPanelItem } from '../settings/SettingsPanelItem';
import { LocalizableText } from '../../localization/i18n';
import { Label } from '../labels/Label';

export interface ListBoxConfig extends SettingsPanelConfig, ListSelectorConfig {
  /**
   * The list selector component which will be used to build the settings page.
   */
  listSelector: ListSelector<ListSelectorConfig>;
  /**
   * An optional title which will be added to the list.
   */
  title?: LocalizableText;
}

export class ListBox extends SettingsPanel<ListBoxConfig> {
  private readonly settingsPanelPage: SettingsPanelPage;
  private readonly listSelector: ListSelector<ListSelectorConfig>;

  constructor(config: ListBoxConfig) {
    super(config);

    this.settingsPanelPage = new SettingsPanelPage({});
    this.listSelector = config.listSelector;

    this.config = this.mergeConfig(config, {
      hidden: true,
      cssClasses: ['ui-listbox'],
    }, this.config);

    this.addComponent(this.settingsPanelPage);

    if (config.title) {
      const label = new Label({ text: config.title, cssClasses: ['title-label'] })
      this.settingsPanelPage.addComponent(
        new SettingsPanelItem({
          label: label,
          cssClasses: ['title-item'],
        })
      );
    }
  }

  public configure(player: PlayerAPI, uimanager: UIInstanceManager): void {
    super.configure(player, uimanager);

    const onItemAdded = (_: any, itemKey: string) => {
      const item = this.listSelector.getItemForKey(itemKey);
      const selectOption = new SettingsPanelSelectOption({
        label: item.label,
        settingComponent: this.listSelector,
        settingsValue: item.key,
        addSettingAsComponent: false,
      });

      selectOption.configure(player, uimanager);
      this.settingsPanelPage.addSettingsPanelItem(selectOption);
    };

    const onItemRemoved = (_: any, itemKey: string) => {
      const settingsPanelItem = this.settingsPanelPage.getComponents().find(item => {
        if (!(item instanceof SettingsPanelSelectOption)) {
          return false;
        }

        return item.getConfig().settingsValue === itemKey;
      });

      if (!settingsPanelItem || !(settingsPanelItem instanceof SettingsPanelItem)) {
        return;
      }

      this.settingsPanelPage.removeSettingsPanelItem(settingsPanelItem);
    };

    this.listSelector.onItemAdded.subscribe(onItemAdded);
    this.listSelector.onItemRemoved.subscribe(onItemRemoved);

    this.settingsPanelPage.configure(player, uimanager);
    this.listSelector.configure(player, uimanager);
  }
}
