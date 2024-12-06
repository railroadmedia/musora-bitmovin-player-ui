import { Label, LabelConfig } from './label';
import {UIInstanceManager} from '../uimanager';
import {SelectBox} from './selectbox';
import { PlayerAPI } from 'bitmovin-player';
import { LocalizableText } from '../localization/i18n';
import { ModernSettingsPanelPage } from './modernsettingspanelpage';
import { ListSelector, ListSelectorConfig } from './listselector';
import { SubtitleSelectBox } from './subtitleselectbox';
import { SettingsPanelItem, SettingsPanelItemConfig } from './settingspanelitem';
import {
  Component,
  ComponentConfig,
  Container,
  ContainerConfig,
  SettingsPanelPageBackButton,
  SubtitleSettingSelectBox, SubtitleSettingsLabel,
} from '../main';
import { ModernSettingsPanel } from './modernsettingspanel';
import { ModernSettingsPanelSelectOption } from './modernsettingspanelselectoption';

/**
 * An item for a {@link ModernSettingsPanelPage},
 * Containing an optional {@link Label} and a component that configures a setting.
 * If the components is a {@link SelectBox} it will handle the logic of displaying it or not
 */
export interface ModernSettingsPanelItemConfig extends SettingsPanelItemConfig {
  label: LocalizableText | SubtitleSettingsLabel;
  setting: ListSelector<ListSelectorConfig>;
  container: ModernSettingsPanel;
}

export class ModernSettingsPanelItem extends SettingsPanelItem<ModernSettingsPanelItemConfig> {

  /**
   * If setting is null, that means that the item is not an option and does not
   * have a submenu. So if setting is null we can assume that the item should be
   * used as a back button
   */
  private selectedOptionLabel: Label<LabelConfig>;
  protected setting: ListSelector<ListSelectorConfig>;

  private player: PlayerAPI;
  private uimanager: UIInstanceManager;

  constructor(config: ModernSettingsPanelItemConfig) {
    // TODO: is that the way? -> Should this happen in configure? -> I think so
    config.addSettingAsComponent = false;

    super(config);

    this.setting = config.setting;

    // TODO: this now does no longer work with the custom label with the opening button
    this.selectedOptionLabel = new Label({
      text: '-',
      for: this.getConfig().id,
      cssClasses: ['ui-label-setting-selected-option'],
    });

    this.config = this.mergeConfig(config, {
      components: [
        this.selectedOptionLabel,
      ],
      cssClass: 'ui-settings-panel-item',
      role: 'menuitem',
      addSettingAsComponent: false,
    }, this.config);
  }

  configure(player: PlayerAPI, uimanager: UIInstanceManager): void {
    super.configure(player, uimanager);

    this.player = player;
    this.uimanager = uimanager;

    if (this.config.label instanceof SubtitleSettingsLabel) {
      this.config.label.opener.configure(player, uimanager);
    }

    if (this.setting != null) {
      this.setting.configure(this.player, this.uimanager);
    }

    const handleSelectedItemChanged = () => {
      let selectedItem = this.setting.getItemForKey(this.setting.getSelectedItem());
      if (selectedItem == null) {
        this.selectedOptionLabel.hide();
        return;
      }

      this.selectedOptionLabel.show();
      let selectedOptionLabelText = selectedItem.label;
      if (this.setting instanceof SubtitleSelectBox) {
        let availableSettings = this.setting.getItems().length;
        selectedOptionLabelText = selectedOptionLabelText + ' (' + (availableSettings - 1) + ')';
      }
      this.selectedOptionLabel.setText(selectedOptionLabelText);
    };
    this.setting.onItemSelected.subscribe(handleSelectedItemChanged);

    handleSelectedItemChanged();

    const handleItemClick = () => {
      this.displayItemsSubPage();
    };
    this.getDomElement().on('click', (e) => { e.stopPropagation(); handleItemClick(); });
  }

  private buildSubPanelPage(): ModernSettingsPanelPage {
    const menuOptions = this.setting.getItems();
    const page = new ModernSettingsPanelPage({});

    const text = this.config.label instanceof SubtitleSettingsLabel ? this.config.label.text : this.config.label;

    const backButton = new SettingsPanelPageBackButton({
      text: text,
      container: this.config.container,
      cssClasses: ['ui-settings-panel-item-back'],
    });
    backButton.configure(this.player, this.uimanager);
    page.addComponent(backButton);

    menuOptions
      .map((option) => {
        return new ModernSettingsPanelSelectOption({
          label: option.label,
          setting: this.setting,
          settingsValue: option.key,
          addSettingAsComponent: false,
        });
      })
      .forEach((selectOption) => {
        selectOption.configure(this.player, this.uimanager);
        page.addComponent(selectOption);
      });

    page.configure(this.player, this.uimanager);

    if (this.setting instanceof SubtitleSettingSelectBox) {
      // Keep the preview subtitle overlay visible when the sub-page is for a subtitle setting
      page.onActive.subscribe(() => {
        (<SubtitleSettingSelectBox>this.setting).overlay.enablePreviewSubtitleLabel();
      });

      page.onInactive.subscribe(() => {
        (<SubtitleSettingSelectBox>this.setting).overlay.removePreviewSubtitleLabel();
      });
    }

    return page;
  }

  public displayItemsSubPage(): void {
    let page = this.buildSubPanelPage();
    this.config.container.addDynamicPage(page);
    this.config.container.setActivePage(page);
  }
}
