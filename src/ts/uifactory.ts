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
import { Container } from './components/container';
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
import { CloseButton } from './components/closebutton';
import { UIContainer } from './components/uicontainer';
import { BufferingOverlay } from './components/bufferingoverlay';
import { PlaybackToggleOverlay } from './components/playbacktoggleoverlay';
import { CastStatusOverlay } from './components/caststatusoverlay';
import { MusoraEndscreen } from './components/musoraendscreen';
import { ErrorMessageOverlay } from './components/errormessageoverlay';
import { UIConditionContext, UIManager } from './uimanager';
import { UIConfig } from './uiconfig';
import { PlayerAPI } from 'bitmovin-player';
import { i18n } from './localization/i18n';
import { PlayerUtils } from './playerutils';

export namespace UIFactory {


  export function buildMusoraEndscreenUI(player: PlayerAPI, config: UIConfig = {}): UIManager {
    // Use the same structure for all contexts - just Musora UI
    let smallScreenSwitchWidth = 600;

    return new UIManager(player, [{
      ui: modernUIWithMusora(),
      condition: (context: UIConditionContext) => {
        return !context.isAd && !context.adRequiresUi && context.isMobile
          && context.documentWidth < smallScreenSwitchWidth;
      },
    }, {
      ui: modernUIWithMusora(),
      condition: (context: UIConditionContext) => {
        return !context.isAd && !context.adRequiresUi;
      },
    }], config);
  }

  function modernUIWithMusora() {
    let subtitleOverlay = new SubtitleOverlay();

    let mainSettingsPanelPage = new SettingsPanelPage({
      components: [
        new SettingsPanelItem(i18n.getLocalizer('settings.video.quality'), new VideoQualitySelectBox()),
        new SettingsPanelItem(i18n.getLocalizer('speed'), new PlaybackSpeedSelectBox()),
        new SettingsPanelItem(i18n.getLocalizer('settings.audio.track'), new AudioTrackSelectBox()),
        new SettingsPanelItem(i18n.getLocalizer('settings.audio.quality'), new AudioQualitySelectBox()),
      ],
    });

    let settingsPanel = new SettingsPanel({
      components: [
        mainSettingsPanelPage,
      ],
      hidden: true,
    });

    let subtitleSettingsPanelPage = new SubtitleSettingsPanelPage({
      settingsPanel: settingsPanel,
      overlay: subtitleOverlay,
    });

    const subtitleSelectBox = new SubtitleSelectBox();

    let subtitleSettingsOpenButton = new SettingsPanelPageOpenButton({
      targetPage: subtitleSettingsPanelPage,
      container: settingsPanel,
      ariaLabel: i18n.getLocalizer('settings.subtitles'),
      text: i18n.getLocalizer('open'),
    });

    mainSettingsPanelPage.addComponent(
      new SettingsPanelItem(
        new SubtitleSettingsLabel({
          text: i18n.getLocalizer('settings.subtitles'),
          opener: subtitleSettingsOpenButton,
        }),
        subtitleSelectBox,
        {
          role: 'menubar',
        },
      ));

    settingsPanel.addComponent(subtitleSettingsPanelPage);

    let controlBar = new ControlBar({
      components: [
        settingsPanel,
        new Container({
          components: [
            new PlaybackTimeLabel({ timeLabelMode: PlaybackTimeLabelMode.CurrentTime, hideInLivePlayback: true }),
            new SeekBar({ label: new SeekBarLabel() }),
            new PlaybackTimeLabel({ timeLabelMode: PlaybackTimeLabelMode.TotalTime, cssClasses: ['text-right'] }),
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

    // Create Musora endscreen with sample next video data
    let musoraEndscreen = new MusoraEndscreen({
      nextVideo: {
        title: 'Q&A with Kevin (Plus a Special Guest!) — In Theory',
        url: 'https://musora.com/next-video',
        thumbnail: 'https://i.vimeocdn.com/video/2031137885-9ca70a5b829937956ac3b0c0063dea24cc7c6bc31bb01851883fb873de3ee1b9-d?mw=80&q=85',
        duration: 340, // 5:40 in seconds
        category: 'Beginner • Workout',
        instructor: 'Kevin Castro'
      },
      countdownDuration: 5,
      autoPlay: true,
    });

    // Handle auto-play event
    musoraEndscreen.onAutoPlay.subscribe((sender, args) => {
      console.log('Musora auto-play triggered for:', args.nextVideo.title);
      // Hide the end screen and allow user to access regular controls
      musoraEndscreen.hide();
      // Add your navigation logic here
    });

    // Handle play now button
    musoraEndscreen.onPlayNow.subscribe((sender, args) => {
      console.log('Musora play now clicked for:', args.nextVideo.title);
      // Hide the end screen and allow user to access regular controls
      musoraEndscreen.hide();
      // Add your navigation logic here
    });

    // Handle cancel button
    musoraEndscreen.onCancelled.subscribe(() => {
      console.log('Musora endscreen cancelled');
      // Add your cancel logic here
    });

    return new UIContainer({
      components: [
        subtitleOverlay,
        new BufferingOverlay(),
        new PlaybackToggleOverlay(),
        new CastStatusOverlay(),
        controlBar,
        musoraEndscreen,  // Use MusoraEndscreen instead of RecommendationOverlay
        new ErrorMessageOverlay(),
      ],
      hideDelay: -1, // Disable auto-hide completely - controls never auto-hide
      hidePlayerStateExceptions: [
        PlayerUtils.PlayerState.Idle,      // Controls visible when idle
        PlayerUtils.PlayerState.Prepared,  // Controls visible when prepared
        PlayerUtils.PlayerState.Playing,   // Controls visible when playing
        PlayerUtils.PlayerState.Paused,    // Controls visible when paused
        PlayerUtils.PlayerState.Finished,  // Controls visible when video ends
      ],
    });
  }

  function modernSmallScreenUIWithMusora() {
    let subtitleOverlay = new SubtitleOverlay();

    let mainSettingsPanelPage = new SettingsPanelPage({
      components: [
        new SettingsPanelItem(i18n.getLocalizer('settings.video.quality'), new VideoQualitySelectBox()),
        new SettingsPanelItem(i18n.getLocalizer('speed'), new PlaybackSpeedSelectBox()),
        new SettingsPanelItem(i18n.getLocalizer('settings.audio.track'), new AudioTrackSelectBox()),
        new SettingsPanelItem(i18n.getLocalizer('settings.audio.quality'), new AudioQualitySelectBox()),
      ],
    });

    let settingsPanel = new SettingsPanel({
      components: [
        mainSettingsPanelPage,
      ],
      hidden: true,
      pageTransitionAnimation: false,
      hideDelay: -1,
    });

    let subtitleSettingsPanelPage = new SubtitleSettingsPanelPage({
      settingsPanel: settingsPanel,
      overlay: subtitleOverlay,
    });

    let subtitleSettingsOpenButton = new SettingsPanelPageOpenButton({
      targetPage: subtitleSettingsPanelPage,
      container: settingsPanel,
      ariaLabel: i18n.getLocalizer('settings.subtitles'),
      text: i18n.getLocalizer('open'),
    });

    const subtitleSelectBox = new SubtitleSelectBox();

    mainSettingsPanelPage.addComponent(
      new SettingsPanelItem(
        new SubtitleSettingsLabel({
          text: i18n.getLocalizer('settings.subtitles'),
          opener: subtitleSettingsOpenButton,
        }),
        subtitleSelectBox,
        {
          role: 'menubar',
        },
      ));

    settingsPanel.addComponent(subtitleSettingsPanelPage);

    settingsPanel.addComponent(new CloseButton({ target: settingsPanel }));
    subtitleSettingsPanelPage.addComponent(new CloseButton({ target: settingsPanel }));

    let controlBar = new ControlBar({
      components: [
        new Container({
          components: [
            new PlaybackTimeLabel({ timeLabelMode: PlaybackTimeLabelMode.CurrentTime, hideInLivePlayback: true }),
            new SeekBar({ label: new SeekBarLabel() }),
            new PlaybackTimeLabel({ timeLabelMode: PlaybackTimeLabelMode.TotalTime, cssClasses: ['text-right'] }),
          ],
          cssClasses: ['controlbar-top'],
        }),
      ],
    });

    // Create Musora endscreen for small screen
    let musoraEndscreen = new MusoraEndscreen({
      nextVideo: {
        title: 'Q&A with Kevin (Plus a Special Guest!) — In Theory',
        url: 'https://musora.com/next-video',
        thumbnail: 'https://i.vimeocdn.com/video/2031137885-9ca70a5b829937956ac3b0c0063dea24cc7c6bc31bb01851883fb873de3ee1b9-d?mw=80&q=85',
        duration: 340, // 5:40 in seconds
        category: 'Beginner • Workout',
        instructor: 'Kevin Castro'
      },
      countdownDuration: 5,
      autoPlay: true,
    });

    // Handle auto-play event
    musoraEndscreen.onAutoPlay.subscribe((sender, args) => {
      console.log('Musora auto-play triggered for:', args.nextVideo.title);
      // Hide the end screen and allow user to access regular controls
      musoraEndscreen.hide();
      // Add your navigation logic here
    });

    // Handle play now button
    musoraEndscreen.onPlayNow.subscribe((sender, args) => {
      console.log('Musora play now clicked for:', args.nextVideo.title);
      // Hide the end screen and allow user to access regular controls
      musoraEndscreen.hide();
      // Add your navigation logic here
    });

    // Handle cancel button
    musoraEndscreen.onCancelled.subscribe(() => {
      console.log('Musora endscreen cancelled');
      // Add your cancel logic here
    });

    return new UIContainer({
      components: [
        subtitleOverlay,
        new BufferingOverlay(),
        new CastStatusOverlay(),
        new PlaybackToggleOverlay(),
        musoraEndscreen,  // Use MusoraEndscreen instead of RecommendationOverlay
        controlBar,
        settingsPanel,
        new ErrorMessageOverlay(),
      ],
      cssClasses: ['ui-skin-smallscreen'],
      hideDelay: -1, // Disable auto-hide completely - controls never auto-hide
      hidePlayerStateExceptions: [
        PlayerUtils.PlayerState.Idle,      // Controls visible when idle
        PlayerUtils.PlayerState.Prepared,  // Controls visible when prepared
        PlayerUtils.PlayerState.Playing,   // Controls visible when playing
        PlayerUtils.PlayerState.Paused,    // Controls visible when paused
        PlayerUtils.PlayerState.Finished,  // Controls visible when video ends
      ],
    });
  }

  export function modernSmallScreenUI() {
    return modernSmallScreenUIWithMusora();
  }

  export function modernAdsUI() {
    // Simple ads UI - minimal controls during ad playback
    let controlBar = new ControlBar({
      components: [
        new Container({
          components: [
            new PlaybackToggleButton(),
            new Spacer(),
            new VolumeToggleButton(),
            new VolumeSlider(),
          ],
          cssClasses: ['controlbar-bottom'],
        }),
      ],
    });

    return new UIContainer({
      components: [
        new BufferingOverlay(),
        controlBar,
      ],
      cssClasses: ['ui-skin-ads'],
    });
  }

  export function modernSmallScreenAdsUI() {
    // Small screen ads UI - minimal controls for mobile ad playback
    let controlBar = new ControlBar({
      components: [
        new Container({
          components: [
            new PlaybackToggleButton(),
            new VolumeToggleButton(),
          ],
          cssClasses: ['controlbar-bottom'],
        }),
      ],
    });

    return new UIContainer({
      components: [
        new BufferingOverlay(),
        controlBar,
      ],
      cssClasses: ['ui-skin-smallscreen-ads'],
    });
  }
}
