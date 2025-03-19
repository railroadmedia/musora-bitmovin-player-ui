import { MockHelper, TestingPlayerAPI } from '../helper/MockHelper';
import { UIInstanceManager } from '../../src/ts/uimanager';
import { SubtitleOverlay, SubtitleRegionContainerManager } from '../../src/ts/components/subtitleoverlay';
import { DOM } from '../../src/ts/dom';

let playerMock: jest.Mocked<TestingPlayerAPI>;
let uiInstanceManagerMock: UIInstanceManager;
let subtitleOverlay: SubtitleOverlay;

jest.mock('../../src/ts/components/container');

let subtitleRegionContainerManagerMock: SubtitleRegionContainerManager;

describe('SubtitleOverlay', () => {
  describe('Subtitle Region Container', () => {
    let mockDomElement: DOM;
    beforeEach(() => {
      playerMock = MockHelper.getPlayerMock() as jest.Mocked<TestingPlayerAPI>;
      uiInstanceManagerMock = MockHelper.getUiInstanceManagerMock();

      subtitleOverlay = new SubtitleOverlay();
      subtitleOverlay.configure(playerMock, uiInstanceManagerMock);
      subtitleRegionContainerManagerMock = (subtitleOverlay as any).subtitleContainerManager;

      mockDomElement = MockHelper.generateDOMMock();
      jest.spyOn(subtitleOverlay, 'getDomElement').mockReturnValue(mockDomElement);
    });

    it('adds a subtitle label on cueEnter', () => {
      const addLabelSpy = jest.spyOn(subtitleRegionContainerManagerMock, 'addLabel');
      playerMock.eventEmitter.fireSubtitleCueEnterEvent();
      expect(addLabelSpy).toHaveBeenCalled();
    });

    it('removes a subtitle label on cueExit', () => {
      playerMock.eventEmitter.fireSubtitleCueEnterEvent();
      const removeLabelSpy = jest.spyOn(subtitleRegionContainerManagerMock, 'removeLabel');
      jest.spyOn(subtitleOverlay, 'getDomElement').mockReturnValue(mockDomElement);
      playerMock.eventEmitter.fireSubtitleCueExitEvent();
      expect(removeLabelSpy).toHaveBeenCalled();
    });

    it('updates a subtitle label on cueUpdate', () => {
      const updateLabelSpy = jest.spyOn(subtitleRegionContainerManagerMock, 'replaceLabel');
      jest.spyOn(subtitleOverlay, 'getDomElement').mockReturnValue(mockDomElement);

      playerMock.eventEmitter.fireSubtitleCueEnterEvent();
      expect(updateLabelSpy).not.toHaveBeenCalled();

      playerMock.eventEmitter.fireSubtitleCueUpdateEvent();
      expect(updateLabelSpy).toHaveBeenCalled();
    });

    it('ignores cueUpdate event if it does not match a previous cue', () => {
      const updateLabelSpy = jest.spyOn(subtitleRegionContainerManagerMock, 'replaceLabel');
      jest.spyOn(subtitleOverlay, 'getDomElement').mockReturnValue(mockDomElement);

      playerMock.eventEmitter.fireSubtitleCueEnterEvent();
      expect(updateLabelSpy).not.toHaveBeenCalled();

      playerMock.eventEmitter.fireSubtitleCueUpdateEvent('some different text');
      expect(updateLabelSpy).not.toHaveBeenCalled();
    });

    it('remove only inactive cues when the player finishes seeking', () => {
      const removeLabelSpy = jest.spyOn(subtitleRegionContainerManagerMock, 'removeLabel');
      // create one active cue
      playerMock.getCurrentTime.mockReturnValue(1);
      playerMock.eventEmitter.fireSubtitleCueEnterEvent();

      // seek inside the cue and ensure it has not been removed
      playerMock.eventEmitter.fireSeekedEvent();
      expect(removeLabelSpy).not.toHaveBeenCalled();

      // seek outside of the cue and ensure it is removed
      playerMock.getCurrentTime.mockReturnValue(15);
      playerMock.eventEmitter.fireSeekedEvent();
      expect(removeLabelSpy).toHaveBeenCalled();
    });
  });

  describe('CEA 608 Font Size Factor', () => {
    beforeEach(() => {
      playerMock = MockHelper.getPlayerMock() as jest.Mocked<TestingPlayerAPI>;
      uiInstanceManagerMock = MockHelper.getUiInstanceManagerMock();
      subtitleOverlay = new SubtitleOverlay();
      subtitleOverlay.configure(playerMock, uiInstanceManagerMock);
    });

    it('correctly applies font size factor within allowed range (0.5 to 2.0)', () => {
      // Set to minimum allowed factor
      subtitleOverlay.setFontSizeFactor(0.2);
      expect(subtitleOverlay['FONT_SIZE_FACTOR']).toBe(0.5); // Should be clamped to 0.5

      // Set to maximum allowed factor
      subtitleOverlay.setFontSizeFactor(3.0);
      expect(subtitleOverlay['FONT_SIZE_FACTOR']).toBe(2.0); // Should be clamped to 2.0

      // Set a valid value within range
      subtitleOverlay.setFontSizeFactor(1.5);
      expect(subtitleOverlay['FONT_SIZE_FACTOR']).toBe(1.5);
    });

    it('recalculates CEA 608 grid values correctly based on font size factor', () => {
      subtitleOverlay.setFontSizeFactor(1.0);
      subtitleOverlay.recalculateCEAGrid();

      expect(subtitleOverlay['CEA608_NUM_ROWS']).toBe(15 / 1.0);
      expect(subtitleOverlay['CEA608_NUM_COLUMNS']).toBe(32 / 1.0);

      // Test with a different font size factor
      subtitleOverlay.setFontSizeFactor(2.0);
      subtitleOverlay.recalculateCEAGrid();

      expect(subtitleOverlay['CEA608_NUM_ROWS']).toBe(15 / 2.0);
      expect(subtitleOverlay['CEA608_NUM_COLUMNS']).toBe(32 / 2.0);
    });
  });

});
