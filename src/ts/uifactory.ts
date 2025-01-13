import { SubtitleOverlay } from './components/subtitleoverlay';
import { SettingsPanelPage } from './components/settingspanelpage';
import { SettingsPanelItem } from './components/settingspanelitem';
import { VideoQualitySelectBox } from './components/videoqualityselectbox';
import { PlaybackSpeedSelectBox } from './components/playbackspeedselectbox';
import { AudioTrackSelectBox } from './components/audiotrackselectbox';
import { AudioQualitySelectBox } from './components/audioqualityselectbox';
import { SettingsPanel } from './components/settingspanel';
import { SubtitleSettingsPanelPage } from './components/subtitlesettings/subtitlesettingspanelpage';
import { SettingsPanelPageOpenButton } from './components/settingspanelpageopenbutton';
import { SubtitleSettingsLabel } from './components/subtitlesettings/subtitlesettingslabel';
import { SubtitleSelectBox } from './components/subtitleselectbox';
import { ControlBar } from './components/controlbar';
import { Container, ContainerConfig } from './components/container';
import { PlaybackTimeLabel, PlaybackTimeLabelMode } from './components/playbacktimelabel';
import { SeekBar } from './components/seekbar';
import { SeekBarLabel } from './components/seekbarlabel';
import { PlaybackToggleButton } from './components/playbacktogglebutton';
import { VolumeToggleButton } from './components/volumetogglebutton';
import { VolumeSlider } from './components/volumeslider';
import { Spacer } from './components/spacer';
import { PictureInPictureToggleButton } from './components/pictureinpicturetogglebutton';
import { AirPlayToggleButton } from './components/airplaytogglebutton';
import { CastToggleButton } from './components/casttogglebutton';
import { VRToggleButton } from './components/vrtogglebutton';
import { SettingsToggleButton } from './components/settingstogglebutton';
import { FullscreenToggleButton } from './components/fullscreentogglebutton';
import { UIContainer } from './components/uicontainer';
import { BufferingOverlay } from './components/bufferingoverlay';
import { PlaybackToggleOverlay } from './components/playbacktoggleoverlay';
import { CastStatusOverlay } from './components/caststatusoverlay';
import { TitleBar } from './components/titlebar';
import { RecommendationOverlay } from './components/recommendationoverlay';
import { Watermark } from './components/watermark';
import { ErrorMessageOverlay } from './components/errormessageoverlay';
import { AdClickOverlay } from './components/adclickoverlay';
import { MetadataLabel, MetadataLabelContent } from './components/metadatalabel';
import { PlayerUtils } from './playerutils';
import { CastUIContainer } from './components/castuicontainer';
import { UIConditionContext, UIManager } from './uimanager';
import { UIConfig } from './uiconfig';
import { PlayerAPI } from 'bitmovin-player';
import { i18n } from './localization/i18n';
import { SubtitleListBox } from './components/subtitlelistbox';
import { AudioTrackListBox } from './components/audiotracklistbox';
import { SpatialNavigation } from './spatialnavigation/spatialnavigation';
import { RootNavigationGroup } from './spatialnavigation/rootnavigationgroup';
import { ListNavigationGroup, ListOrientation } from './spatialnavigation/ListNavigationGroup';
import { EcoModeContainer } from './components/ecomodecontainer';
import { DynamicSettingsPanelItem } from './components/dynamicsettingspanelitem';
import { TouchControlOverlay } from './components/touchcontroloverlay';
import { AdStatusOverlay } from './components/adstatusoverlay';

/**
 * Provides factory methods to create Bitmovin provided UIs.
 */
export namespace UIFactory {
  /**
   * Builds a fully featured UI with all Bitmovin provided variants.
   * The UI will automatically switch between the different variants based on the current context.
   *
   * This UI includes variants for:
   * - Default UI (without additional context checks)
   * - Ads
   * - Small Screens (e.g. mobile devices)
   * - Small Screen Ads
   * - TVs
   * - Cast Receivers
   *
   * @param player The player instance used to build the UI
   * @param config The UIConfig object
   */
  export function buildUI(player: PlayerAPI, config: UIConfig = {}): UIManager {
    // show smallScreen UI only on mobile/handheld devices
    let smallScreenSwitchWidth = 600;

    return new UIManager(
      player,
      [
        {
          ui: smallScreenAdsUILayout(),
          condition: (context: UIConditionContext) => {
            return (
              context.isMobile && context.documentWidth < smallScreenSwitchWidth && context.isAd && context.adRequiresUi
            );
          },
        },
        {
          ui: adsUILayout(),
          condition: (context: UIConditionContext) => {
            return context.isAd && context.adRequiresUi;
          },
        },
        {
          ui: smallScreenUILayout(),
          condition: (context: UIConditionContext) => {
            return (
              !context.isAd &&
              !context.adRequiresUi &&
              context.isMobile &&
              context.documentWidth < smallScreenSwitchWidth
            );
          },
        },
        {
          ui: uiLayout(config),
          condition: (context: UIConditionContext) => {
            return !context.isAd && !context.adRequiresUi;
          },
        },
      ],
      config,
    );
  }

  /**
   * Builds a UI for small screens (e.g. mobile devices) only.
   * This UI is optimized for small screens and touch input.
   *
   * This UI includes variants for:
   * - Small Screens (e.g. mobile devices)
   * - Small Screen Ads
   *
   * @param player The player instance used to build the UI
   * @param config The UIConfig object
   */
  export function buildSmallScreenUI(player: PlayerAPI, config: UIConfig = {}): UIManager {
    return new UIManager(
      player,
      [
        {
          ui: smallScreenAdsUILayout(),
          condition: (context: UIConditionContext) => {
            return context.isAd && context.adRequiresUi;
          },
        },
        {
          ui: smallScreenUILayout(),
          condition: (context: UIConditionContext) => {
            return !context.isAd && !context.adRequiresUi;
          },
        },
      ],
      config,
    );
  }

  /**
   * Builds a UI which is used on cast receivers.
   *
   * This UI includes variants for:
   * - Cast Receivers
   *
   * @param player The player instance used to build the UI
   * @param config The UIConfig object
   */
  export function buildCastReceiverUI(player: PlayerAPI, config: UIConfig = {}): UIManager {
    return new UIManager(player, castReceiverUILayout(), config);
  }

  /**
   * Builds a UI which is used on TVs.
   *
   * This UI includes variants for:
   * - TVs
   *
   * @param player The player instance used to build the UI
   * @param config The UIConfig object
   */
  export function buildTvUI(player: PlayerAPI, config: UIConfig = {}): UIManager {
    return new UIManager(
      player,
      [
        {
          ...tvUILayout(),
        },
      ],
      config,
    );
  }
}

function uiLayout(config: UIConfig) {
  let subtitleOverlay = new SubtitleOverlay();

  let mainSettingsPanelPage: SettingsPanelPage;

  let settingsPanel = new SettingsPanel({
    components: [],
    hidden: true,
    pageTransitionAnimation: true,
  });

  const components: Container<ContainerConfig>[] = [
    new DynamicSettingsPanelItem({
      label: i18n.getLocalizer('settings.video.quality'),
      settingComponent: new VideoQualitySelectBox(),
      container: settingsPanel,
    }),
    new DynamicSettingsPanelItem({
      label: i18n.getLocalizer('speed'),
      settingComponent: new PlaybackSpeedSelectBox(),
      container: settingsPanel,
    }),
    new DynamicSettingsPanelItem({
      label: i18n.getLocalizer('settings.audio.track'),
      settingComponent: new AudioTrackSelectBox(),
      container: settingsPanel,
    }),
    new DynamicSettingsPanelItem({
      label: i18n.getLocalizer('settings.audio.quality'),
      settingComponent: new AudioQualitySelectBox(),
      container: settingsPanel,
    }),
  ];

  if (config.ecoMode) {
    const ecoModeContainer = new EcoModeContainer();

    ecoModeContainer.setOnToggleCallback(() => {
      // forces the browser to re-calculate the height of the settings panel when adding/removing elements
      settingsPanel.getDomElement().css({ width: '', height: '' });
    });

    components.unshift(ecoModeContainer);
  }

  mainSettingsPanelPage = new SettingsPanelPage({
    components,
  });

  settingsPanel.addComponent(mainSettingsPanelPage);

  let subtitleSettingsPanelPage = new SubtitleSettingsPanelPage({
    settingsPanel: settingsPanel,
    overlay: subtitleOverlay,
    useDynamicSettingsPanelItem: true,
  });

  let subtitleSettingsOpenButton = new SettingsPanelPageOpenButton({
    targetPage: subtitleSettingsPanelPage,
    container: settingsPanel,
    ariaLabel: i18n.getLocalizer('settings.subtitles'),
    text: i18n.getLocalizer('open'),
  });

  const subtitleSelectBox = new SubtitleSelectBox();
  let subtitleSelectItem = new DynamicSettingsPanelItem({
    label: new SubtitleSettingsLabel({
      text: i18n.getLocalizer('settings.subtitles'),
      opener: subtitleSettingsOpenButton,
    }),
    settingComponent: subtitleSelectBox,
    role: 'menubar',
    container: settingsPanel,
  });
  mainSettingsPanelPage.addComponent(subtitleSelectItem);
  settingsPanel.addComponent(subtitleSettingsPanelPage);

  let controlBar = new ControlBar({
    components: [
      new Container({
        components: [
          new PlaybackTimeLabel({
            timeLabelMode: PlaybackTimeLabelMode.CurrentTime,
            hideInLivePlayback: true,
          }),
          new SeekBar({ label: new SeekBarLabel() }),
          new PlaybackTimeLabel({
            timeLabelMode: PlaybackTimeLabelMode.TotalTime,
            cssClasses: ['text-right'],
          }),
        ],
        cssClasses: ['controlbar-top'],
      }),
      new Container({
        components: [
          new PlaybackToggleButton(),
          new VolumeToggleButton(),
          new VolumeSlider(),
          new Spacer(),
          new PictureInPictureToggleButton(),
          new AirPlayToggleButton(),
          new CastToggleButton(),
          new VRToggleButton(),
          new SettingsToggleButton({ settingsPanel: settingsPanel }),
          new FullscreenToggleButton(),
        ],
        cssClasses: ['controlbar-bottom'],
      }),
    ],
  });

  return new UIContainer({
    components: [
      subtitleOverlay,
      new BufferingOverlay(),
      new PlaybackToggleOverlay(),
      new CastStatusOverlay(),
      controlBar,
      new TitleBar(),
      new RecommendationOverlay(),
      new Watermark(),
      settingsPanel,
      new ErrorMessageOverlay(),
    ],
    hideDelay: 2000,
    hidePlayerStateExceptions: [
      PlayerUtils.PlayerState.Prepared,
      PlayerUtils.PlayerState.Paused,
      PlayerUtils.PlayerState.Finished,
    ],
    cssClasses: ['ui'],
  });
}

function adsUILayout() {
  let controlBar = new ControlBar({
    components: [
      new Container({
        components: [
          new PlaybackTimeLabel({ timeLabelMode: PlaybackTimeLabelMode.CurrentTime }),
          new SeekBar({ label: new SeekBarLabel() }),
          new PlaybackTimeLabel({
            timeLabelMode: PlaybackTimeLabelMode.TotalTime,
            cssClasses: ['text-right'],
          }),
        ],
        cssClasses: ['controlbar-top'],
      }),
      new Container({
        components: [
          new PlaybackToggleButton(),
          new VolumeToggleButton(),
          new Spacer(),
          new FullscreenToggleButton(),
        ],
        cssClasses: ['controlbar-bottom'],
      }),
    ],
  });

  return new UIContainer({
    components: [
      new BufferingOverlay(),
      new AdClickOverlay(),
      new PlaybackToggleOverlay(),
      new AdStatusOverlay(),
      controlBar,
      new ErrorMessageOverlay(),
    ],
    hideDelay: 2000,
    hidePlayerStateExceptions: [
      PlayerUtils.PlayerState.Prepared,
      PlayerUtils.PlayerState.Paused,
      PlayerUtils.PlayerState.Finished,
    ],
    cssClasses: ['ui', 'ui-ads'],
  });
}

function smallScreenUILayout() {
  let subtitleOverlay = new SubtitleOverlay();

  let settingsPanel = new SettingsPanel({
    components: [],
    hidden: true,
    pageTransitionAnimation: true,
    hideDelay: -1,
  });

  let mainSettingsPanelPage = new SettingsPanelPage({
    components: [
      new DynamicSettingsPanelItem({
        label: i18n.getLocalizer('settings.video.quality'),
        settingComponent: new VideoQualitySelectBox(),
        container: settingsPanel,
      }),
      new DynamicSettingsPanelItem({
        label: i18n.getLocalizer('speed'),
        settingComponent: new PlaybackSpeedSelectBox(),
        container: settingsPanel,
      }),
      new DynamicSettingsPanelItem({
        label: i18n.getLocalizer('settings.audio.track'),
        settingComponent: new AudioTrackSelectBox() ,
        container: settingsPanel,
      }),
      new DynamicSettingsPanelItem({
        label: i18n.getLocalizer('settings.audio.quality'),
        settingComponent: new AudioQualitySelectBox(),
        container: settingsPanel,
      }),
    ],
  });

  settingsPanel.addComponent(mainSettingsPanelPage);

  let subtitleSettingsPanelPage = new SubtitleSettingsPanelPage({
    settingsPanel: settingsPanel,
    overlay: subtitleOverlay,
    useDynamicSettingsPanelItem: true,
  });

  let subtitleSettingsOpenButton = new SettingsPanelPageOpenButton({
    targetPage: subtitleSettingsPanelPage,
    container: settingsPanel,
    ariaLabel: i18n.getLocalizer('settings.subtitles'),
    text: i18n.getLocalizer('open'),
  });

  const subtitleSelectBox = new SubtitleSelectBox();
  let subtitleSelectItem = new DynamicSettingsPanelItem({
    label: new SubtitleSettingsLabel({
      text: i18n.getLocalizer('settings.subtitles'),
      opener: subtitleSettingsOpenButton,
    }),
    settingComponent: subtitleSelectBox,
    role: 'menubar',
    container: settingsPanel,
  });
  mainSettingsPanelPage.addComponent(subtitleSelectItem);
  settingsPanel.addComponent(subtitleSettingsPanelPage);

  let controlBar = new ControlBar({
    components: [
      new Container({
        components: [
          new PlaybackTimeLabel({
            timeLabelMode: PlaybackTimeLabelMode.CurrentTime,
            hideInLivePlayback: true,
          }),
          new SeekBar({ label: new SeekBarLabel() }),
          new PlaybackTimeLabel({
            timeLabelMode: PlaybackTimeLabelMode.TotalTime,
            cssClasses: ['text-right'],
          }),
        ],
        cssClasses: ['controlbar-top'],
      }),
      new Container({
        components: [
          new PlaybackToggleButton(),
          new VolumeToggleButton(),
          new Spacer(),
          new SettingsToggleButton({ settingsPanel: settingsPanel }),
          // new SubtitleToggleButton(subtitleSelectItem, subtitleSelectBox),
          new FullscreenToggleButton(),
        ],
        cssClasses: ['controlbar-bottom'],
      }),
    ],
  });

  return new UIContainer({
    components: [
      subtitleOverlay,
      new BufferingOverlay(),
      new CastStatusOverlay(),
      new TouchControlOverlay(),
      new RecommendationOverlay(),
      controlBar,
      new TitleBar({
        components: [
          new MetadataLabel({ content: MetadataLabelContent.Title }),
          new CastToggleButton(),
          new AirPlayToggleButton(),
          new VRToggleButton(),
        ],
      }),
      settingsPanel,
      new ErrorMessageOverlay(),
    ],
    cssClasses: ['ui-smallscreen', 'ui'],
    hideDelay: 2000,
    hidePlayerStateExceptions: [
      PlayerUtils.PlayerState.Prepared,
      PlayerUtils.PlayerState.Paused,
      PlayerUtils.PlayerState.Finished,
    ],
  });
}

function smallScreenAdsUILayout() {
  let controlBar = new ControlBar({
    components: [
      new Container({
        components: [
          new PlaybackTimeLabel({ timeLabelMode: PlaybackTimeLabelMode.CurrentTime }),
          new SeekBar({ label: new SeekBarLabel() }),
          new PlaybackTimeLabel({
            timeLabelMode: PlaybackTimeLabelMode.TotalTime,
            cssClasses: ['text-right'],
          }),
        ],
        cssClasses: ['controlbar-top'],
      }),
      new Container({
        components: [
          new PlaybackToggleButton(),
          new VolumeToggleButton(),
          new Spacer(),
          new FullscreenToggleButton(),
        ],
        cssClasses: ['controlbar-bottom'],
      }),
    ],
  });

  return new UIContainer({
    components: [
      new BufferingOverlay(),
      new AdClickOverlay(),
      new PlaybackToggleOverlay(),
      controlBar,
      new AdStatusOverlay(),
      new ErrorMessageOverlay(),
    ],
    hideDelay: 2000,
    hidePlayerStateExceptions: [
      PlayerUtils.PlayerState.Prepared,
      PlayerUtils.PlayerState.Paused,
      PlayerUtils.PlayerState.Finished,
    ],
    cssClasses: ['ui', 'ui-smallscreen', 'ui-ads'],
  });
}

function castReceiverUILayout() {
  let controlBar = new ControlBar({
    components: [
      new Container({
        components: [
          new PlaybackTimeLabel({
            timeLabelMode: PlaybackTimeLabelMode.CurrentTime,
            hideInLivePlayback: true,
          }),
          new SeekBar({ smoothPlaybackPositionUpdateIntervalMs: -1 }),
          new PlaybackTimeLabel({
            timeLabelMode: PlaybackTimeLabelMode.TotalTime,
            cssClasses: ['text-right'],
          }),
        ],
        cssClasses: ['controlbar-top'],
      }),
    ],
  });

  return new CastUIContainer({
    components: [
      new SubtitleOverlay(),
      new BufferingOverlay(),
      new PlaybackToggleOverlay(),
      new Watermark(),
      controlBar,
      new TitleBar({ keepHiddenWithoutMetadata: true }),
      new ErrorMessageOverlay(),
    ],
    cssClasses: ['ui', 'ui-cast-receiver'],
    hideDelay: 2000,
    hidePlayerStateExceptions: [
      PlayerUtils.PlayerState.Prepared,
      PlayerUtils.PlayerState.Paused,
      PlayerUtils.PlayerState.Finished,
    ],
  });
}

function tvUILayout() {
  const subtitleListBox = new SubtitleListBox();
  const subtitleListPanel = new SettingsPanel({
    components: [
      new SettingsPanelPage({
        components: [new SettingsPanelItem({ settingComponent: subtitleListBox })],
      }),
    ],
    hidden: true,
  });

  const audioTrackListBox = new AudioTrackListBox();
  const audioTrackListPanel = new SettingsPanel({
    components: [
      new SettingsPanelPage({
        components: [new SettingsPanelItem({ settingComponent: audioTrackListBox })],
      }),
    ],
    hidden: true,
  });

  const seekBar = new SeekBar({ label: new SeekBarLabel() });
  const playbackToggleOverlay = new PlaybackToggleOverlay();
  const subtitleToggleButton = new SettingsToggleButton({
    settingsPanel: subtitleListPanel,
    autoHideWhenNoActiveSettings: true,
    cssClass: 'ui-subtitlesettingstogglebutton',
    text: i18n.getLocalizer('settings.subtitles'),
  });
  const audioToggleButton = new SettingsToggleButton({
    settingsPanel: audioTrackListPanel,
    autoHideWhenNoActiveSettings: true,
    cssClass: 'ui-audiotracksettingstogglebutton',
    ariaLabel: i18n.getLocalizer('settings.audio.track'),
    text: i18n.getLocalizer('settings.audio.track'),
  });
  const uiContainer = new UIContainer({
    components: [
      new SubtitleOverlay(),
      new BufferingOverlay(),
      playbackToggleOverlay,
      new ControlBar({
        components: [
          new Container({
            components: [
              new PlaybackTimeLabel({
                timeLabelMode: PlaybackTimeLabelMode.CurrentTime,
                hideInLivePlayback: true,
              }),
              seekBar,
              new PlaybackTimeLabel({
                timeLabelMode: PlaybackTimeLabelMode.RemainingTime,
                cssClasses: ['text-right'],
              }),
            ],
            cssClasses: ['controlbar-top'],
          }),
        ],
      }),
      new TitleBar({
        components: [
          new Container({
            components: [
              new MetadataLabel({ content: MetadataLabelContent.Title }),
              subtitleToggleButton,
              audioToggleButton,
            ],
            cssClasses: ['ui-titlebar-top'],
          }),
          new Container({
            components: [
              new MetadataLabel({ content: MetadataLabelContent.Description }),
              subtitleListPanel,
              audioTrackListPanel,
            ],
            cssClasses: ['ui-titlebar-bottom'],
          }),
        ],
      }),
      new RecommendationOverlay(),
      new ErrorMessageOverlay(),
    ],
    cssClasses: ['ui', 'ui-tv'],
    hideDelay: 2000,
    hidePlayerStateExceptions: [
      PlayerUtils.PlayerState.Prepared,
      PlayerUtils.PlayerState.Paused,
      PlayerUtils.PlayerState.Finished,
    ],
  });

  const spatialNavigation = new SpatialNavigation(
    new RootNavigationGroup(uiContainer, playbackToggleOverlay, seekBar, audioToggleButton, subtitleToggleButton),
    new ListNavigationGroup(ListOrientation.Vertical, subtitleListPanel, subtitleListBox),
    new ListNavigationGroup(ListOrientation.Vertical, audioTrackListPanel, audioTrackListBox),
  );

  return {
    ui: uiContainer,
    spatialNavigation: spatialNavigation,
  };
}
