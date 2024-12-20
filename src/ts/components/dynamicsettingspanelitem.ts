import { Label, LabelConfig } from './label';
import { UIInstanceManager } from '../uimanager';
import { PlayerAPI } from 'bitmovin-player';
import { LocalizableText } from '../localization/i18n';
import { ListSelector, ListSelectorConfig } from './listselector';
import { SubtitleSelectBox } from './subtitleselectbox';
import { SettingsPanelItem, SettingsPanelItemConfig } from './settingspanelitem';
import { SettingsPanelSelectOption } from './settingspanelselectoption';
import { SettingsPanelPage } from './settingspanelpage';
import { SubtitleSettingsLabel } from './subtitlesettings/subtitlesettingslabel';
import { SettingsPanel } from './settingspanel';
import { SettingsPanelPageBackButton } from './settingspanelpagebackbutton';
import { SubtitleSettingSelectBox } from './subtitlesettings/subtitlesettingselectbox';

/**
 * Configuration interface for a {@link DynamicSettingsPanelItem}.
 *
 * @category Configs
 */
export interface DynamicSettingsPanelItemConfig extends SettingsPanelItemConfig {
  /**
   * The label component or the text for the label.
   */
  label: LocalizableText | SubtitleSettingsLabel;
  /**
   * The list selector component which will be used to build the sub page.
   */
  settingComponent: ListSelector<ListSelectorConfig>;
  /**
   * The enclosing {@link SettingsPanel} where the sub page will be added.
   */
  container: SettingsPanel;
}

/**
 * A dynamic settings panel item which can build a sub page with the items of a {@link ListSelector}.
 * The page will be dynamically added and removed from the {@link SettingsPanel}.
*
 * @category Components
 */
export class DynamicSettingsPanelItem extends SettingsPanelItem<DynamicSettingsPanelItemConfig> {
  private selectedOptionLabel: Label<LabelConfig>;
  protected settingComponent: ListSelector<ListSelectorConfig>;

  private player: PlayerAPI;
  private uimanager: UIInstanceManager;

  constructor(config: DynamicSettingsPanelItemConfig) {
    super(config);

    this.settingComponent = config.settingComponent;

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

    if (this.settingComponent != null) {
      this.settingComponent.configure(this.player, this.uimanager);
    }

    const handleSelectedItemChanged = () => {
      let selectedItem = this.settingComponent.getItemForKey(this.settingComponent.getSelectedItem());
      if (selectedItem == null) {
        this.selectedOptionLabel.hide();
        return;
      }

      this.selectedOptionLabel.show();
      let selectedOptionLabelText = selectedItem.label;
      if (this.settingComponent instanceof SubtitleSelectBox) {
        let availableSettings = this.settingComponent.getItems().length;
        selectedOptionLabelText = selectedOptionLabelText + ' (' + (availableSettings - 1) + ')';
      }
      this.selectedOptionLabel.setText(selectedOptionLabelText);
    };
    this.settingComponent.onItemSelected.subscribe(handleSelectedItemChanged);

    handleSelectedItemChanged();

    const handleItemClick = () => {
      this.displayItemsSubPage();
    };
    this.getDomElement().on('click', (e) => {
      e.stopPropagation();
      handleItemClick();
    });
  }

  private buildSubPanelPage(): SettingsPanelPage {
    const menuOptions = this.settingComponent.getItems();
    const page = new SettingsPanelPage({ removeOnPop: true });

    const text = this.config.label instanceof SubtitleSettingsLabel ? this.config.label.text : this.config.label;

    const backButton = new SettingsPanelPageBackButton({
      text: text,
      container: this.config.container,
    });
    backButton.configure(this.player, this.uimanager);
    const backSettingsPanelItem = new SettingsPanelItem({
      label: backButton,
      cssClasses: ['title-item'],
    });
    page.addComponent(backSettingsPanelItem);

    menuOptions
      .map((option) => {
        return new SettingsPanelSelectOption({
          label: option.label,
          settingComponent: this.settingComponent,
          settingsValue: option.key,
          addSettingAsComponent: false,
        });
      })
      .forEach((selectOption) => {
        selectOption.configure(this.player, this.uimanager);
        page.addComponent(selectOption);
      });

    page.configure(this.player, this.uimanager);

    const setting = this.settingComponent;
    if (setting instanceof SubtitleSettingSelectBox) {
      // Keep the preview subtitle overlay visible when the sub-page is for a subtitle setting
      page.onActive.subscribe(() => setting.overlay.enablePreviewSubtitleLabel());
      page.onInactive.subscribe(() => setting.overlay.removePreviewSubtitleLabel());
    }

    return page;
  }

  public displayItemsSubPage(): void {
    let page = this.buildSubPanelPage();
    this.config.container.addPage(page);
    this.config.container.setActivePage(page);
  }
}
