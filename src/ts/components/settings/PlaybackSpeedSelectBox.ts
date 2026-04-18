import { SelectBox } from './SelectBox';
import { ListSelectorConfig } from '../lists/ListSelector';
import { UIInstanceManager } from '../../UIManager';
import { PlayerAPI } from 'bitmovin-player';
import { i18n } from '../../localization/i18n';
import { StorageUtils } from '../../utils/StorageUtils';
import { prefixCss } from '../DummyComponent';

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

  /** localStorage key for last user-chosen playback speed (persists across sources). */
  private static readonly STORAGE_KEY = prefixCss('playback-speed-preference');

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
      StorageUtils.setItem(PlaybackSpeedSelectBox.STORAGE_KEY, value);
      this.selectItem(value);
    });

    // Sync the select-box UI with the player's current speed (e.g. changed externally).
    const syncUiWithPlayerSpeed = (): void => {
      this.setSpeed(player.getPlaybackSpeed());
    };

    // On a new source / UI reconfigure, restore the persisted speed (or fall back to
    // whatever the player reports). We also call setSpeed() directly here because
    // PlaybackSpeedChanged is not guaranteed to fire synchronously, which would leave
    // the select box showing "-" even though the player speed is correctly applied.
    const applyPersistedOrCurrentSpeed = (): void => {
      const persisted = StorageUtils.getItem(PlaybackSpeedSelectBox.STORAGE_KEY);
      if (persisted !== null) {
        player.setPlaybackSpeed(parseFloat(persisted));
        this.setSpeed(parseFloat(persisted));
      } else {
        syncUiWithPlayerSpeed();
      }
    };

    player.on(player.exports.PlayerEvent.PlaybackSpeedChanged, syncUiWithPlayerSpeed);
    uimanager.getConfig().events.onUpdated.subscribe(applyPersistedOrCurrentSpeed);
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
