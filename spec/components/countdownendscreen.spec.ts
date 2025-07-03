import { MockHelper, TestingPlayerAPI } from '../helper/MockHelper';
import { UIInstanceManager } from '../../src/ts/uimanager';
import { CountdownEndscreen, CountdownEndscreenConfig } from '../../src/ts/components/countdownendscreen';
import { DOM } from '../../src/ts/dom';

let playerMock: TestingPlayerAPI;
let uiInstanceManagerMock: UIInstanceManager;
let mockDomElement: jest.Mocked<DOM>;

let countdownEndscreen: CountdownEndscreen;

describe('CountdownEndscreen', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    
    playerMock = MockHelper.getPlayerMock();
    uiInstanceManagerMock = MockHelper.getUiInstanceManagerMock();

    // Setup DOM Mock
    mockDomElement = MockHelper.generateDOMMock();
    jest.spyOn(CountdownEndscreen.prototype, 'getDomElement').mockReturnValue(mockDomElement);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default config', () => {
      countdownEndscreen = new CountdownEndscreen();
      
      expect(countdownEndscreen.getConfig().countdownDuration).toBe(10);
      expect(countdownEndscreen.getConfig().autoPlay).toBe(true);
      expect(countdownEndscreen.getConfig().countdownText).toBe('Next video in');
      expect(countdownEndscreen.isHidden()).toBe(true);
    });

    it('should initialize with custom config', () => {
      const config: CountdownEndscreenConfig = {
        countdownDuration: 5,
        autoPlay: false,
        countdownText: 'Custom countdown text',
        nextVideo: {
          title: 'Test Video',
          url: 'https://example.com/video',
          thumbnail: 'https://example.com/thumbnail.jpg',
          duration: 120,
        },
      };

      countdownEndscreen = new CountdownEndscreen(config);
      
      expect(countdownEndscreen.getConfig().countdownDuration).toBe(5);
      expect(countdownEndscreen.getConfig().autoPlay).toBe(false);
      expect(countdownEndscreen.getConfig().countdownText).toBe('Custom countdown text');
      expect(countdownEndscreen.getConfig().nextVideo).toEqual(config.nextVideo);
    });
  });

  describe('countdown functionality', () => {
    beforeEach(() => {
      const config: CountdownEndscreenConfig = {
        countdownDuration: 3,
        nextVideo: {
          title: 'Test Video',
          url: 'https://example.com/video',
        },
      };
      
      countdownEndscreen = new CountdownEndscreen(config);
      countdownEndscreen.configure(playerMock, uiInstanceManagerMock);
    });

    it('should start countdown when shown after playback finishes', () => {
      // Simulate playback finished event
      playerMock.fireEvent(playerMock.exports.PlayerEvent.PlaybackFinished);
      
      expect(countdownEndscreen.isShown()).toBe(true);
      expect(countdownEndscreen.isCountdownActive()).toBe(true);
      expect(countdownEndscreen.getCurrentCountdown()).toBe(3);
    });

    it('should update countdown every second', () => {
      playerMock.fireEvent(playerMock.exports.PlayerEvent.PlaybackFinished);
      
      expect(countdownEndscreen.getCurrentCountdown()).toBe(3);
      
      jest.advanceTimersByTime(1000);
      expect(countdownEndscreen.getCurrentCountdown()).toBe(2);
      
      jest.advanceTimersByTime(1000);
      expect(countdownEndscreen.getCurrentCountdown()).toBe(1);
    });

    it('should fire auto-play event when countdown reaches zero', () => {
      const onAutoPlaySpy = jest.fn();
      countdownEndscreen.onAutoPlay.subscribe(onAutoPlaySpy);
      
      playerMock.fireEvent(playerMock.exports.PlayerEvent.PlaybackFinished);
      
      jest.advanceTimersByTime(3000);
      
      expect(onAutoPlaySpy).toHaveBeenCalledWith(countdownEndscreen, {
        nextVideo: countdownEndscreen.getConfig().nextVideo,
      });
    });

    it('should not auto-play when autoPlay is disabled', () => {
      countdownEndscreen.getConfig().autoPlay = false;
      const onAutoPlaySpy = jest.fn();
      countdownEndscreen.onAutoPlay.subscribe(onAutoPlaySpy);
      
      playerMock.fireEvent(playerMock.exports.PlayerEvent.PlaybackFinished);
      jest.advanceTimersByTime(3000);
      
      expect(onAutoPlaySpy).not.toHaveBeenCalled();
    });

    it('should fire countdown update events', () => {
      const onCountdownUpdateSpy = jest.fn();
      countdownEndscreen.onCountdownUpdate.subscribe(onCountdownUpdateSpy);
      
      playerMock.fireEvent(playerMock.exports.PlayerEvent.PlaybackFinished);
      
      jest.advanceTimersByTime(1000);
      
      expect(onCountdownUpdateSpy).toHaveBeenCalledWith(countdownEndscreen, {
        countdown: 2,
      });
    });
  });

  describe('event handling', () => {
    beforeEach(() => {
      const config: CountdownEndscreenConfig = {
        nextVideo: {
          title: 'Test Video',
          url: 'https://example.com/video',
        },
      };
      
      countdownEndscreen = new CountdownEndscreen(config);
      countdownEndscreen.configure(playerMock, uiInstanceManagerMock);
    });

    it('should hide and stop countdown when source is unloaded', () => {
      playerMock.fireEvent(playerMock.exports.PlayerEvent.PlaybackFinished);
      expect(countdownEndscreen.isCountdownActive()).toBe(true);
      
      playerMock.fireEvent(playerMock.exports.PlayerEvent.SourceUnloaded);
      
      expect(countdownEndscreen.isHidden()).toBe(true);
      expect(countdownEndscreen.isCountdownActive()).toBe(false);
    });

    it('should hide and stop countdown when play event occurs', () => {
      playerMock.fireEvent(playerMock.exports.PlayerEvent.PlaybackFinished);
      expect(countdownEndscreen.isCountdownActive()).toBe(true);
      
      playerMock.fireEvent(playerMock.exports.PlayerEvent.Play);
      
      expect(countdownEndscreen.isHidden()).toBe(true);
      expect(countdownEndscreen.isCountdownActive()).toBe(false);
    });

    it('should fire auto-play event when clicked', () => {
      const onAutoPlaySpy = jest.fn();
      countdownEndscreen.onAutoPlay.subscribe(onAutoPlaySpy);
      
      playerMock.fireEvent(playerMock.exports.PlayerEvent.PlaybackFinished);
      
      // Simulate click event
      const clickHandler = mockDomElement.on.mock.calls.find(
        call => call[0] === 'click'
      )?.[1];
      
      if (clickHandler) {
        clickHandler();
      }
      
      expect(onAutoPlaySpy).toHaveBeenCalled();
      expect(countdownEndscreen.isCountdownActive()).toBe(false);
    });
  });

  describe('next video management', () => {
    beforeEach(() => {
      countdownEndscreen = new CountdownEndscreen();
      countdownEndscreen.configure(playerMock, uiInstanceManagerMock);
    });

    it('should set next video configuration', () => {
      const nextVideo = {
        title: 'New Test Video',
        url: 'https://example.com/new-video',
        thumbnail: 'https://example.com/new-thumbnail.jpg',
        duration: 180,
      };
      
      countdownEndscreen.setNextVideo(nextVideo);
      
      expect(countdownEndscreen.getConfig().nextVideo).toEqual(nextVideo);
    });

    it('should not show endscreen when no next video is configured', () => {
      playerMock.fireEvent(playerMock.exports.PlayerEvent.PlaybackFinished);
      
      expect(countdownEndscreen.isHidden()).toBe(true);
      expect(countdownEndscreen.isCountdownActive()).toBe(false);
    });
  });

  describe('cleanup', () => {
    it('should stop countdown on release', () => {
      const config: CountdownEndscreenConfig = {
        nextVideo: {
          title: 'Test Video',
          url: 'https://example.com/video',
        },
      };
      
      countdownEndscreen = new CountdownEndscreen(config);
      countdownEndscreen.configure(playerMock, uiInstanceManagerMock);
      
      playerMock.fireEvent(playerMock.exports.PlayerEvent.PlaybackFinished);
      expect(countdownEndscreen.isCountdownActive()).toBe(true);
      
      countdownEndscreen.release();
      
      expect(countdownEndscreen.isCountdownActive()).toBe(false);
    });
  });
});