import { SettingsPanelPage, SettingsPanelPageConfig } from '../settingspanelpage';
import {SettingsPanel} from '../settingspanel';
import {SubtitleOverlay} from '../subtitleoverlay';
import {ContainerConfig} from '../container';
import {Component, ComponentConfig} from '../component';
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
import {UIInstanceManager} from '../../uimanager';
import {SettingsPanelPageBackButton} from '../settingspanelpagebackbutton';
import {SettingsPanelItem} from '../settingspanelitem';
import { PlayerAPI } from 'bitmovin-player';
import { i18n } from '../../localization/i18n';
import { ModernSettingsPanelItem } from '../modernsettingspanelitem';

/**
 * @category Configs
 */
export interface SubtitleSettingsPanelPageConfig extends SettingsPanelPageConfig {
  settingsPanel: SettingsPanel;
  overlay: SubtitleOverlay;
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

    this.config = this.mergeConfig(config, {
      components: <Component<ComponentConfig>[]>[
        new SettingsPanelItem({
          label: new SettingsPanelPageBackButton({
            container: this.settingsPanel,
          }),
          setting: new SubtitleSettingsResetButton({}),
          cssClasses: ['title-item'],
        }),
        new ModernSettingsPanelItem({
          label: i18n.getLocalizer('settings.subtitles.font.size'),
          setting: new FontSizeSelectBox({
            overlay: this.overlay,
          }),
          container: this.settingsPanel,
        }),
        new ModernSettingsPanelItem({
          label: i18n.getLocalizer('settings.subtitles.font.family'),
          setting: new FontFamilySelectBox({
            overlay: this.overlay,
          }),
          container: this.settingsPanel,
        }),
        new ModernSettingsPanelItem({
          label: i18n.getLocalizer('settings.subtitles.font.color'),
          setting: new FontColorSelectBox({
            overlay: this.overlay,
          }),
          container: this.settingsPanel,
        }),
        new ModernSettingsPanelItem({
          label: i18n.getLocalizer('settings.subtitles.font.opacity'),
          setting: new FontOpacitySelectBox({
            overlay: this.overlay,
          }),
          container: this.settingsPanel,
        }),
        new ModernSettingsPanelItem({
          label: i18n.getLocalizer('settings.subtitles.characterEdge'),
          setting: new CharacterEdgeSelectBox({
            overlay: this.overlay,
          }),
          container: this.settingsPanel,
        }),
        new ModernSettingsPanelItem({
          label: i18n.getLocalizer('settings.subtitles.background.color'),
          setting: new BackgroundColorSelectBox({
            overlay: this.overlay,
          }),
          container: this.settingsPanel,
        }),
        new ModernSettingsPanelItem({
          label: i18n.getLocalizer('settings.subtitles.background.opacity'),
          setting: new BackgroundOpacitySelectBox({
            overlay: this.overlay,
          }),
          container: this.settingsPanel,
        }),
        new ModernSettingsPanelItem({
          label: i18n.getLocalizer('settings.subtitles.window.color'),
          setting: new WindowColorSelectBox({
            overlay: this.overlay,
          }),
          container: this.settingsPanel,
        }),
        new ModernSettingsPanelItem({
          label: i18n.getLocalizer('settings.subtitles.window.opacity'),
          setting: new WindowOpacitySelectBox({
            overlay: this.overlay,
          }),
          container: this.settingsPanel,
        }),
      ],
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
}