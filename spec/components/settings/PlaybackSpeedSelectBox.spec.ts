import { PlaybackSpeedSelectBox } from '../../../src/ts/components/settings/PlaybackSpeedSelectBox';
import { SelectBox } from '../../../src/ts/components/settings/SelectBox';
import { prefixCss } from '../../../src/ts/components/DummyComponent';
import type { UIInstanceManager } from '../../../src/ts/UIManager';
import { StorageUtils } from '../../../src/ts/utils/StorageUtils';
import { MockHelper, TestingPlayerAPI } from '../../helper/MockHelper';
import getUiInstanceManagerMock = MockHelper.getUiInstanceManagerMock;
import getPlayerMock = MockHelper.getPlayerMock;
import generateDOMMock = MockHelper.generateDOMMock;

jest.mock('../../../src/ts/DOM', generateDOMMock);

const STORAGE_KEY = prefixCss('playback-speed-preference');

describe('PlaybackSpeedSelectBox speed guard', () => {
  let selectBox: PlaybackSpeedSelectBox;
  let playerMock: TestingPlayerAPI;
  let uiManagerMock: UIInstanceManager;
  let inbound: Record<string, (data?: string) => void>;
  let sendAsynchronous: jest.Mock;
  let setPlaybackSpeed: jest.Mock;
  let restoreSpeed: () => void;
  let playerSpeed: number;

  const send = (message: string, payload: object): void => inbound[message](JSON.stringify(payload));
  const requests = (): unknown[] =>
    sendAsynchronous.mock.calls
      .filter(([message]) => message === 'onPlaybackSpeedRequest')
      .map(([, payload]) => JSON.parse(payload));

  beforeEach(() => {
    // The DOM mock can't build <option> elements; the list rendering isn't under test.
    jest
      .spyOn(SelectBox.prototype as unknown as { updateDomItems: () => void }, 'updateDomItems')
      .mockImplementation(() => undefined);
    localStorage.clear();
    inbound = {};
    sendAsynchronous = jest.fn();
    (window as unknown as { bitmovin: unknown }).bitmovin = {
      customMessageHandler: {
        sendAsynchronous,
        on: (event: string, callback: (data?: string) => void) => {
          inbound[event] = callback;
        },
      },
    };

    playerSpeed = 1;
    playerMock = getPlayerMock();
    playerMock.getPlaybackSpeed = jest.fn(() => playerSpeed);
    setPlaybackSpeed = jest.fn((speed: number) => {
      playerSpeed = speed;
    });
    playerMock.setPlaybackSpeed = setPlaybackSpeed;
    playerMock.isLive = jest.fn(() => false);
    uiManagerMock = getUiInstanceManagerMock();
    jest.spyOn(uiManagerMock.getConfig().events.onUpdated, 'subscribe').mockImplementation(listener => {
      restoreSpeed = () => listener(undefined, undefined);
      return true;
    });

    selectBox = new PlaybackSpeedSelectBox();
    selectBox.configure(playerMock, uiManagerMock);
    selectBox.setSpeed(1);
    setPlaybackSpeed.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete (window as unknown as { bitmovin?: unknown }).bitmovin;
  });

  it('applies any speed while the guard is off', () => {
    selectBox.selectItem('0.75');

    expect(setPlaybackSpeed).toHaveBeenCalledWith(0.75);
    expect(StorageUtils.getItem(STORAGE_KEY)).toBe('0.75');
    expect(requests()).toEqual([]);
  });

  it('holds a move off 1x for the app while the guard is on', () => {
    send('setPlaybackSpeedGuard', { enabled: true });

    selectBox.selectItem('0.75');

    expect(setPlaybackSpeed).not.toHaveBeenCalledWith(0.75);
    expect(selectBox.getSelectedItem()).toBe('1');
    expect(requests()).toEqual([{ speed: 0.75, label: '0.75x' }]);
  });

  it('applies the speed the app confirms', () => {
    send('setPlaybackSpeedGuard', { enabled: true });
    selectBox.selectItem('1.25');

    send('applyPlaybackSpeed', { speed: 1.25 });

    expect(setPlaybackSpeed).toHaveBeenCalledWith(1.25);
    expect(selectBox.getSelectedItem()).toBe('1.25');
    expect(StorageUtils.getItem(STORAGE_KEY)).toBe('1.25');
    expect(requests()).toEqual([{ speed: 1.25, label: '1.25x' }]);
  });

  it('only guards moves away from 1x', () => {
    send('setPlaybackSpeedGuard', { enabled: true });
    send('applyPlaybackSpeed', { speed: 0.75 });

    selectBox.selectItem('1.5');

    expect(setPlaybackSpeed).toHaveBeenLastCalledWith(1.5);
    expect(requests()).toEqual([]);
  });

  it('starts a guarded source at 1x and asks for the saved speed', () => {
    StorageUtils.setItem(STORAGE_KEY, '0.75');
    send('setPlaybackSpeedGuard', { enabled: true });

    restoreSpeed();

    expect(setPlaybackSpeed).not.toHaveBeenCalledWith(0.75);
    expect(selectBox.getSelectedItem()).toBe('1');
    expect(requests()).toEqual([{ speed: 0.75, label: '0.75x' }]);
  });

  it('restores the saved speed once the guard is off', () => {
    StorageUtils.setItem(STORAGE_KEY, '0.75');
    send('setPlaybackSpeedGuard', { enabled: true });
    send('setPlaybackSpeedGuard', { enabled: false });

    restoreSpeed();

    expect(setPlaybackSpeed).toHaveBeenCalledWith(0.75);
    expect(requests()).toEqual([]);
  });
});
