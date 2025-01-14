import { SettingsPanelPage, SettingsPanelPageConfig } from '../settingspanelpage';
import {SettingsPanel} from '../settingspanel';
import {SubtitleOverlay} from '../../overlays/subtitleoverlay';
import {Component, ComponentConfig} from '../../component';
import {FontSizeSelectBox} from './fontsizeselectbox';
import {FontFamilySelectBox} from './fontfamilyselectbox';
import {FontColorSelectBox} from './fontcolorselectbox';
import {FontOpacitySelectBox} from './fontopacityselectbox';
import {CharacterEdgeSelectBox} from './characteredgeselectbox';
import {BackgroundColorSelectBox} from './backgroundcolorselectbox';
import {BackgroundOpacitySelectBox} from './backgroundopacityselectbox';
import {WindowColorSelectBox} from './windowcolorselectbox';
import {WindowOpacitySelectBox} from './windowopacityselectbox';
import {SubtitleSettingsResetButton} from './subtitlesettingsresetbutton';
import {UIInstanceManager} from '../../../uimanager';
import {SettingsPanelPageBackButton} from '../settingspanelpagebackbutton';
import { SettingsPanelItem, SettingsPanelItemConfig } from '../settingspanelitem';
import { PlayerAPI } from 'bitmovin-player';
import { i18n, LocalizableText } from '../../../localization/i18n';
import { DynamicSettingsPanelItem } from '../dynamicsettingspanelitem';
import { ListSelector, ListSelectorConfig } from '../../lists/listselector';

/**
 * @category Configs
 */
export interface SubtitleSettingsPanelPageConfig extends SettingsPanelPageConfig {
  settingsPanel: SettingsPanel;
  overlay: SubtitleOverlay;
  useDynamicSettingsPanelItem?: boolean;
}

/**
 * @category Components
 */
export class SubtitleSettingsPanelPage extends SettingsPanelPage {

  private readonly overlay: SubtitleOverlay;
  private readonly settingsPanel: SettingsPanel;

  constructor(config: SubtitleSettingsPanelPageConfig) {
    super(config);

    this.overlay = config.overlay;
    this.settingsPanel = config.settingsPanel;

    const components = [
      this.buildSettingsPanelItem(
        i18n.getLocalizer('settings.subtitles.font.size'),
        new FontSizeSelectBox({
          overlay: this.overlay,
        }),
        config.useDynamicSettingsPanelItem,
      ),
      this.buildSettingsPanelItem(
        i18n.getLocalizer('settings.subtitles.font.family'),
        new FontFamilySelectBox({
          overlay: this.overlay,
        }),
        config.useDynamicSettingsPanelItem,
      ),
      this.buildSettingsPanelItem(
        i18n.getLocalizer('settings.subtitles.font.color'),
        new FontColorSelectBox({
          overlay: this.overlay,
        }),
        config.useDynamicSettingsPanelItem,
      ),
      this.buildSettingsPanelItem(
        i18n.getLocalizer('settings.subtitles.font.opacity'),
        new FontOpacitySelectBox({
          overlay: this.overlay,
        }),
        config.useDynamicSettingsPanelItem,
      ),
      this.buildSettingsPanelItem(
        i18n.getLocalizer('settings.subtitles.characterEdge'),
        new CharacterEdgeSelectBox({
          overlay: this.overlay,
        }),
        config.useDynamicSettingsPanelItem,
      ),
      this.buildSettingsPanelItem(
        i18n.getLocalizer('settings.subtitles.background.color'),
        new BackgroundColorSelectBox({
          overlay: this.overlay,
        }),
        config.useDynamicSettingsPanelItem,
      ),
      this.buildSettingsPanelItem(
        i18n.getLocalizer('settings.subtitles.background.opacity'),
        new BackgroundOpacitySelectBox({
          overlay: this.overlay,
        }),
        config.useDynamicSettingsPanelItem,
      ),
      this.buildSettingsPanelItem(
        i18n.getLocalizer('settings.subtitles.window.color'),
        new WindowColorSelectBox({
          overlay: this.overlay,
        }),
        config.useDynamicSettingsPanelItem,
      ),
      this.buildSettingsPanelItem(
        i18n.getLocalizer('settings.subtitles.window.opacity'),
        new WindowOpacitySelectBox({
          overlay: this.overlay,
        }),
        config.useDynamicSettingsPanelItem,
      ),
    ];

    const backItem = new SettingsPanelItem({
      label: new SettingsPanelPageBackButton({
        container: this.settingsPanel,
      }),
      settingComponent: new SubtitleSettingsResetButton({}),
      cssClasses: ['title-item'],
    });

    if (config.useDynamicSettingsPanelItem) {
      components.unshift(backItem);
    } else {
      components.push(backItem);
    }

    this.config = this.mergeConfig(config, {
      components: components,
    }, this.config);
  }

  configure(player: PlayerAPI, uimanager: UIInstanceManager): void {
    super.configure(player, uimanager);

    this.onActive.subscribe(() => {
      this.overlay.enablePreviewSubtitleLabel();
    });

    this.onInactive.subscribe(() => {
      this.overlay.removePreviewSubtitleLabel();
    });
  }

  private buildSettingsPanelItem(
    label: LocalizableText,
    setting: ListSelector<ListSelectorConfig>,
    useDynamicSettingsPanelItem: boolean = false,
  ): SettingsPanelItem<SettingsPanelItemConfig> {
    if (useDynamicSettingsPanelItem) {
      return new DynamicSettingsPanelItem({
        label: label,
        settingComponent: setting,
        container: this.settingsPanel,
      });
    } else {
      return new SettingsPanelItem({
        label: label,
        settingComponent: setting,
      });
    }
  }
}
