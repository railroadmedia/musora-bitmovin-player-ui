import { Container, ContainerConfig } from '../container';
import { AdSkipButton } from './adskipbutton';
import { Spacer } from '../spacer';
import { PlayerAPI } from 'bitmovin-player';
import { UIInstanceManager } from '../../uimanager';
import { Component, ComponentConfig } from '../component';
import { ControlBar } from '../controlbar';

export class AdStatusOverlay extends Container<ContainerConfig> {
  private static readonly CLASS_CONTROLBAR_VISIBLE = 'controlbar-visible';

  constructor(config: ContainerConfig = {}) {
    super(config);

    this.config = this.mergeConfig(
      config,
      {
        components: [
          new Container({
            components: [
              new Spacer(),
              new AdSkipButton(),
            ],
            cssClasses: ['bar'],
          }),
        ],
        cssClass: 'ui-ad-status-overlay',
      },
      this.config,
    );
  }

  configure(player: PlayerAPI, uimanager: UIInstanceManager) {
    super.configure(player, uimanager);

    uimanager.onComponentShow.subscribe((component: Component<ComponentConfig>) => {
      if (component instanceof ControlBar) {
        this.getDomElement().addClass(this.prefixCss(AdStatusOverlay.CLASS_CONTROLBAR_VISIBLE));
      }
    });
    uimanager.onComponentHide.subscribe((component: Component<ComponentConfig>) => {
      if (component instanceof ControlBar) {
        this.getDomElement().removeClass(this.prefixCss(AdStatusOverlay.CLASS_CONTROLBAR_VISIBLE));
      }
    });
  }
}
