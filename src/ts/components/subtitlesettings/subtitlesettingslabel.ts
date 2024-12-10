import { Label, LabelConfig } from '../label';
import {Container, ContainerConfig} from '../container';
import {SettingsPanelPageOpenButton} from '../settingspanelpageopenbutton';
import { LocalizableText } from '../../localization/i18n';

/**
 * @category Configs
 */
export interface SubtitleSettingsLabelConfig extends LabelConfig {
  opener: SettingsPanelPageOpenButton;
}

/**
 * @category Components
 */
export class SubtitleSettingsLabel extends Container<ContainerConfig> {

  readonly opener: SettingsPanelPageOpenButton;

  readonly text: LocalizableText;

  private for: string;

  constructor(config: SubtitleSettingsLabelConfig) {
    super(config);

    this.opener = config.opener;
    this.text = config.text;
    this.for = config.for;

    this.config = this.mergeConfig(<ContainerConfig>config, {
      components: [
        new Label({ text: this.text, for: this.for } as LabelConfig),
        this.opener,
      ],
    }, this.config);
  }
}
