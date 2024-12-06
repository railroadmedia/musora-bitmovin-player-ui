import { ModernSettingsPanelPage } from './modernsettingspanelpage';
import { SettingsPanel } from './settingspanel';

export class ModernSettingsPanel extends SettingsPanel {
  public addDynamicPage(page: ModernSettingsPanelPage): void {
    this.addComponent(page);
    this.updateComponents();
  }

  popSettingsPanelPage() {
    const currentActivePage = this.getActivePage();

    super.popSettingsPanelPage();

    if (currentActivePage instanceof ModernSettingsPanelPage && currentActivePage.isDynamic) {
      this.removeComponent(currentActivePage);
      this.updateComponents();
    }
  }
}
