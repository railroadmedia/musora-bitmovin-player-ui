import { Component, ComponentConfig } from './Component';
import { DOM } from '../DOM';

/**
 * Base background for errors
 *
 * @category Components
 */
export class ErrorBackground extends Component<ComponentConfig> {
  private canvas: DOM;

  private canvasElement: HTMLCanvasElement;
  private canvasWidth = 160;
  private canvasHeight = 90;

  constructor(config: ComponentConfig = {}) {
    super(config);

    this.config = this.mergeConfig(
      config,
      {
        cssClass: 'ui-errorbackground',
      },
      this.config,
    );
  }

  protected toDomElement(): DOM {
    return (this.canvas = new DOM('canvas', { class: this.getCssClasses() }, this));
  }

  start(): void {
    this.canvasElement = <HTMLCanvasElement>this.canvas.get(0);

    this.canvasElement.width = this.canvasWidth;
    this.canvasElement.height = this.canvasHeight;
  }
}
