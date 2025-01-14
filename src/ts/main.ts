export const version: string = '{{VERSION}}';
// Management
export * from './uimanager';
export * from './uiconfig';
// Factories
export { UIFactory } from './uifactory';
// Utils
export { ArrayUtils } from './utils/arrayutils';
export { StringUtils } from './utils/stringutils';
export { PlayerUtils } from './utils/playerutils';
export { UIUtils } from './utils/uiutils';
export { BrowserUtils } from './utils/browserutils';
export { StorageUtils } from './utils/storageutils';
export { ErrorUtils } from './utils/errorutils';
// Localization
export { i18n, I18n, Vocabulary, Vocabularies, CustomVocabulary, LocalizableText, Localizer } from './localization/i18n';
// Spatial Navigation
export { SpatialNavigation } from './spatialnavigation/spatialnavigation';
export { NavigationGroup } from './spatialnavigation/navigationgroup';
export { RootNavigationGroup } from './spatialnavigation/rootnavigationgroup';
export { ListNavigationGroup, ListOrientation } from './spatialnavigation/ListNavigationGroup';
// Components
export { Button, ButtonConfig } from './components/buttons/button';
export { ControlBar, ControlBarConfig } from './components/controlbar';
export { FullscreenToggleButton } from './components/buttons/fullscreentogglebutton';
export { HugePlaybackToggleButton } from './components/buttons/hugeplaybacktogglebutton';
export { PlaybackTimeLabel, PlaybackTimeLabelConfig, PlaybackTimeLabelMode } from './components/labels/playbacktimelabel';
export { PlaybackToggleButton, PlaybackToggleButtonConfig } from './components/buttons/playbacktogglebutton';
export { SeekBar, SeekBarConfig, SeekPreviewEventArgs, SeekBarMarker } from './components/seekbar/seekbar';
export { SelectBox } from './components/settings/selectbox';
export { ItemSelectionList } from './components/lists/itemselectionlist';
export { SettingsPanel, SettingsPanelConfig } from './components/settings/settingspanel';
export { SettingsToggleButton, SettingsToggleButtonConfig } from './components/settings/settingstogglebutton';
export { ToggleButton, ToggleButtonConfig } from './components/buttons/togglebutton';
export { VideoQualitySelectBox } from './components/settings/videoqualityselectbox';
export { VolumeToggleButton } from './components/buttons/volumetogglebutton';
export { VRToggleButton } from './components/buttons/vrtogglebutton';
export { Watermark, WatermarkConfig } from './components/watermark';
export { UIContainer, UIContainerConfig } from './components/uicontainer';
export { Container, ContainerConfig } from './components/container';
export { Label, LabelConfig } from './components/labels/label';
export { AudioQualitySelectBox } from './components/settings/audioqualityselectbox';
export { AudioTrackSelectBox } from './components/settings/audiotrackselectbox';
export { CastStatusOverlay } from './components/overlays/caststatusoverlay';
export { CastToggleButton } from './components/buttons/casttogglebutton';
export { Component, ComponentConfig, ComponentHoverChangedEventArgs } from './components/component';
export { ErrorMessageOverlay, ErrorMessageOverlayConfig, ErrorMessageTranslator, ErrorMessageMap } from './components/overlays/errormessageoverlay';
export { RecommendationOverlay } from './components/overlays/recommendationoverlay';
export { SeekBarLabel, SeekBarLabelConfig } from './components/seekbar/seekbarlabel';
export { SubtitleOverlay } from './components/overlays/subtitleoverlay';
export { SubtitleSelectBox } from './components/settings/subtitleselectbox';
export { TitleBar, TitleBarConfig } from './components/titlebar';
export { VolumeControlButton, VolumeControlButtonConfig } from './components/buttons/volumecontrolbutton';
export { ClickOverlay, ClickOverlayConfig } from './components/overlays/clickoverlay';
export { AdSkipButton, AdSkipButtonConfig } from './components/ads/adskipbutton';
export { AdMessageLabel } from './components/ads/admessagelabel';
export { AdClickOverlay } from './components/ads/adclickoverlay';
export { PlaybackSpeedSelectBox } from './components/settings/playbackspeedselectbox';
export { HugeReplayButton } from './components/buttons/hugereplaybutton';
export { BufferingOverlay, BufferingOverlayConfig } from './components/overlays/bufferingoverlay';
export { CastUIContainer } from './components/castuicontainer';
export { PlaybackToggleOverlay, PlaybackToggleOverlayConfig } from './components/overlays/playbacktoggleoverlay';
export { CloseButton, CloseButtonConfig } from './components/buttons/closebutton';
export { MetadataLabel, MetadataLabelContent, MetadataLabelConfig } from './components/labels/metadatalabel';
export { AirPlayToggleButton } from './components/buttons/airplaytogglebutton';
export { VolumeSlider, VolumeSliderConfig } from './components/seekbar/volumeslider';
export { PictureInPictureToggleButton } from './components/buttons/pictureinpicturetogglebutton';
export { Spacer } from './components/spacer';
export { BackgroundColorSelectBox } from './components/settings/subtitlesettings/backgroundcolorselectbox';
export { BackgroundOpacitySelectBox } from './components/settings/subtitlesettings/backgroundopacityselectbox';
export { CharacterEdgeSelectBox } from './components/settings/subtitlesettings/characteredgeselectbox';
export { FontColorSelectBox } from './components/settings/subtitlesettings/fontcolorselectbox';
export { FontFamilySelectBox } from './components/settings/subtitlesettings/fontfamilyselectbox';
export { FontOpacitySelectBox } from './components/settings/subtitlesettings/fontopacityselectbox';
export { FontSizeSelectBox } from './components/settings/subtitlesettings/fontsizeselectbox';
export { SubtitleSettingSelectBox } from './components/settings/subtitlesettings/subtitlesettingselectbox';
export { SubtitleSettingsLabel } from './components/settings/subtitlesettings/subtitlesettingslabel';
export { WindowColorSelectBox } from './components/settings/subtitlesettings/windowcolorselectbox';
export { WindowOpacitySelectBox } from './components/settings/subtitlesettings/windowopacityselectbox';
export { SubtitleSettingsResetButton } from './components/settings/subtitlesettings/subtitlesettingsresetbutton';
export { ListBox } from './components/lists/listbox';
export { SubtitleListBox } from './components/lists/subtitlelistbox';
export { AudioTrackListBox } from './components/lists/audiotracklistbox';
export { SettingsPanelPage } from './components/settings/settingspanelpage';
export { SettingsPanelPageBackButton } from './components/settings/settingspanelpagebackbutton';
export { SettingsPanelPageOpenButton } from './components/settings/settingspanelpageopenbutton';
export { SubtitleSettingsPanelPage, SubtitleSettingsPanelPageConfig } from './components/settings/subtitlesettings/subtitlesettingspanelpage';
export { SettingsPanelItem } from './components/settings/settingspanelitem';
export { ReplayButton } from './components/buttons/replaybutton';
export { QuickSeekButton, QuickSeekButtonConfig } from './components/buttons/quickseekbutton';
export { ListSelector, ListSelectorConfig, ListItem, ListItemFilter, ListItemLabelTranslator } from './components/lists/listselector';
export { AdStatusOverlay } from './components/ads/adstatusoverlay';

// Object.assign polyfill for ES5/IE9
// https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/Object/assign
if (typeof Object.assign !== 'function') {
  Object.assign = function(target: any) {
    'use strict';
    if (target == null) {
      throw new TypeError('Cannot convert undefined or null to object');
    }

    target = Object(target);
    for (let index = 1; index < arguments.length; index++) {
      let source = arguments[index];
      if (source != null) {
        for (let key in source) {
          if (Object.prototype.hasOwnProperty.call(source, key)) {
            target[key] = source[key];
          }
        }
      }
    }
    return target;
  };
}
