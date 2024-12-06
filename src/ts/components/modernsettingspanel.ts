import { ModernSettingsPanelPage } from './modernsettingspanelpage';
import { SettingsPanel } from './settingspanel';

export class ModernSettingsPanel extends SettingsPanel {
  public addDynamicPage(page: ModernSettingsPanelPage): void {
    this.addComponent(page);
    this.updateComponents();
  }
}
