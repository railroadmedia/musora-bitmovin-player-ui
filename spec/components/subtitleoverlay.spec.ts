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

    // Font size factor clamping
    test.each([
      [0.2, 0.5],  // Clamped to minimum
      [3.0, 2.0],  // Clamped to maximum
      [1.5, 1.5],  // Within range, no clamping
      [0.5, 0.5],  // Exact minimum
      [2.0, 2.0],  // Exact maximum
      [1.0, 1.0],  // Default value
    ])('setFontSizeFactor(%f) results in FONT_SIZE_FACTOR = %f', (inputFactor, expectedFactor) => {
      subtitleOverlay.setFontSizeFactor(inputFactor);
      expect(subtitleOverlay['FONT_SIZE_FACTOR']).toBe(expectedFactor);
    });

    // Grid recalculations
    test.each([
      [1.0, 15 / 1.0, 32 / 1.0],  // Standard grid
      [2.0, 15 / 2.0, 32 / 2.0],  // Larger factor, smaller grid
      [0.5, 15 / 1.0, 32 / 0.5],  // Factor <1 → rows stay 15, columns grow
    ])('setFontSizeFactor(%f) recalculates grid: ROWS = %f, COLUMNS = %f', (factor, expectedRows, expectedColumns) => {
      subtitleOverlay.setFontSizeFactor(factor);
      subtitleOverlay.recalculateCEAGrid();

      expect(subtitleOverlay['CEA608_NUM_ROWS']).toBe(expectedRows);
      expect(subtitleOverlay['CEA608_NUM_COLUMNS']).toBe(expectedColumns);
    });
  });
});
