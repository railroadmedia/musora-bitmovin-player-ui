import { SelectBox } from './SelectBox';
import { ListSelectorConfig } from '../lists/ListSelector';
import { UIInstanceManager } from '../../UIManager';
import { PlayerAPI } from 'bitmovin-player';
import { i18n } from '../../localization/i18n';

const SPEED_MATCH_EPSILON = 1e-4;

/** Preset rates with stable string keys (avoids float/string mismatches vs player APIs). */
const PRESET_SPEEDS: readonly { key: string; value: number }[] = [
  { key: '0.5', value: 0.5 },
  { key: '0.75', value: 0.75 },
  { key: '0.9', value: 0.9 },
  { key: '1', value: 1 },
  { key: '1.1', value: 1.1 },
  { key: '1.25', value: 1.25 },
  { key: '1.5', value: 1.5 },
];

/**
 * A select box providing a selection of different playback speeds.
 *
 * @category Components
 */
export class PlaybackSpeedSelectBox extends SelectBox {
  protected defaultPlaybackSpeeds: number[];

  private readonly speedDisplayLabels: Record<string, string> = {
    '0.5': '0.5x',
    '0.75': '0.75x',
    '0.9': '0.90x',
    '1.1': '1.10x',
    '1.25': '1.25x',
    '1.5': '1.5x',
  };

  constructor(config: ListSelectorConfig = {}) {
    super(config);
    this.defaultPlaybackSpeeds = PRESET_SPEEDS.map(p => p.value);

    this.config = this.mergeConfig(
      config,
      {
        cssClasses: ['ui-playbackspeedselectbox'],
      },
      this.config,
    );
  }

  configure(player: PlayerAPI, uimanager: UIInstanceManager): void {
    super.configure(player, uimanager);

    this.addDefaultItems();

    this.onItemSelected.subscribe((sender: PlaybackSpeedSelectBox, value: string) => {
      player.setPlaybackSpeed(parseFloat(value));
      this.selectItem(value);
    });

    const setDefaultValue = (): void => {
      const playbackSpeed = player.getPlaybackSpeed();
      this.setSpeed(playbackSpeed);
    };

    player.on(player.exports.PlayerEvent.PlaybackSpeedChanged, setDefaultValue);
    uimanager.getConfig().events.onUpdated.subscribe(setDefaultValue);
  }

  setSpeed(speed: number): void {
    const key = this.keyForPlaybackSpeed(speed);
    if (!this.selectItem(key)) {
      this.clearItems();
      this.addDefaultItems([speed]);
      this.selectItem(this.keyForPlaybackSpeed(speed));
    }
  }

  private keyForPlaybackSpeed(speed: number): string {
    const preset = PRESET_SPEEDS.find(p => Math.abs(p.value - speed) < SPEED_MATCH_EPSILON);
    return preset ? preset.key : String(speed);
  }

  private labelForPreset(key: string, value: number): string {
    if (value === 1) {
      return i18n.getLocalizer('settings.playbackSpeed.normal')();
    }
    return this.speedDisplayLabels[key] ?? `${value}x`;
  }

  addDefaultItems(customItems: number[] = []): void {
    const rows: { key: string; value: number; label: string }[] = [];

    for (const preset of PRESET_SPEEDS) {
      rows.push({
        key: preset.key,
        value: preset.value,
        label: this.labelForPreset(preset.key, preset.value),
      });
    }

    for (const custom of customItems) {
      if (PRESET_SPEEDS.some(p => Math.abs(p.value - custom) < SPEED_MATCH_EPSILON)) {
        continue;
      }
      const key = String(custom);
      rows.push({
        key,
        value: custom,
        label: this.speedDisplayLabels[key] ?? `${custom}x`,
      });
    }

    rows.sort((a, b) => a.value - b.value);
    rows.forEach(row => this.addItem(row.key, row.label));
  }

  clearItems(): void {
    this.items = [];
    this.selectedItem = null;
  }
}
