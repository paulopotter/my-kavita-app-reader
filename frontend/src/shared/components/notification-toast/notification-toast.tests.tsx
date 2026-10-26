import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { NotificationToast, isUpwardSwipe, shouldCloseOnSwipe, type NotificationToastProps } from './notification-toast.component';

const groups = [
  { seriesId: 's1', seriesName: 'One Piece', bodyText: 'Capítulo 1050 disponível', chapterId: 'c1' },
  { seriesId: 's2', seriesName: 'Naruto', bodyText: '3 novos capítulos disponíveis' },
];

function props(over: Partial<NotificationToastProps> = {}): NotificationToastProps {
  return {
    visible: true,
    expanded: false,
    top: 24,
    headline: { title: '2 novas notificações' },
    groups,
    onPress: jest.fn(),
    onGroupPress: jest.fn(),
    onClose: jest.fn(),
    openLabel: 'Ver o que chegou',
    closeLabel: 'Fechar',
    ...over,
  };
}

// The pill animates in and out; fake timers keep that loop from outliving the test.
beforeEach(() => jest.useFakeTimers());
afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

describe('NotificationToast', () => {
  it('shows only the headline while collapsed, and tapping it asks to expand', () => {
    const p = props();
    const { getByText, queryByText, getByLabelText } = render(<NotificationToast {...p} />);

    expect(getByText('2 novas notificações')).toBeTruthy();
    expect(queryByText('One Piece')).toBeNull();

    fireEvent.press(getByLabelText('Ver o que chegou'));
    expect(p.onPress).toHaveBeenCalledTimes(1);
  });

  it('shows the single series’ message as the subtitle', () => {
    const { getByText } = render(
      <NotificationToast {...props({ headline: { title: 'One Piece', subtitle: 'Capítulo 1050 disponível' } })} />,
    );
    expect(getByText('Capítulo 1050 disponível')).toBeTruthy();
  });

  it('lists every group when expanded, and each one is tappable', () => {
    const p = props({ expanded: true });
    const { getByText } = render(<NotificationToast {...p} />);

    fireEvent.press(getByText('Naruto'));

    expect(getByText('One Piece')).toBeTruthy();
    expect(p.onGroupPress).toHaveBeenCalledWith(groups[1]);
  });

  it('draws each series’ cover in the open list, blurred when the series is', () => {
    const { getByTestId } = render(
      <NotificationToast
        {...props({
          expanded: true,
          groups: [
            { ...groups[0], coverUrl: 'https://cover/s1' },
            { ...groups[1], coverUrl: 'https://cover/s2', blurred: true },
          ],
        })}
      />,
    );

    expect(getByTestId('notification-toast-cover-s1').props.source).toEqual({ uri: 'https://cover/s1' });
    expect(getByTestId('notification-toast-cover-s1').props.blurRadius).toBe(0);
    expect(getByTestId('notification-toast-cover-s2').props.blurRadius).toBeGreaterThan(0);
  });

  it('keeps a placeholder until the cover is known', () => {
    const { getByTestId } = render(<NotificationToast {...props({ expanded: true })} />);
    expect(getByTestId('notification-toast-cover-s1').props.source).toBeUndefined();
  });

  it('only lets the list scroll once its rows no longer fit', () => {
    const { getByTestId } = render(<NotificationToast {...props({ expanded: true })} />);
    const list = getByTestId('notification-toast-list');
    expect(list.props.scrollEnabled).toBe(false);

    fireEvent(list, 'contentSizeChange', 300, 500);
    expect(getByTestId('notification-toast-list').props.scrollEnabled).toBe(true);

    fireEvent(list, 'contentSizeChange', 300, 120);
    expect(getByTestId('notification-toast-list').props.scrollEnabled).toBe(false);
  });

  it('has no close button while collapsed — a swipe up (or the clock) closes it', () => {
    const { queryByLabelText } = render(<NotificationToast {...props()} />);
    expect(queryByLabelText('Fechar')).toBeNull();
  });

  it('closes from the close button, and the headline no longer reacts once expanded', () => {
    const p = props({ expanded: true });
    const { getByLabelText } = render(<NotificationToast {...p} />);

    fireEvent.press(getByLabelText('Fechar'));

    expect(p.onClose).toHaveBeenCalledTimes(1);
    expect(p.onPress).not.toHaveBeenCalled();
  });

  it('draws nothing when hidden and there is nothing to keep for the exit animation', () => {
    const { queryByTestId } = render(<NotificationToast {...props({ visible: false, groups: [] })} />);
    expect(queryByTestId('notification-toast')).toBeNull();
  });

  it('stays mounted but untouchable while it animates out', () => {
    const { getByTestId } = render(<NotificationToast {...props({ visible: false })} />);
    expect(getByTestId('notification-toast')).toBeTruthy();
  });

  it('blurs the texts of a blurred group', () => {
    const { getByText } = render(
      <NotificationToast
        {...props({ expanded: true, groups: [{ ...groups[0], blurred: true }], headline: { title: 'x', blurred: true } })}
      />,
    );
    expect(getByText('One Piece').props.style).toEqual(expect.arrayContaining([expect.objectContaining({ color: 'transparent' })]));
  });
});

describe('swiping the pill up', () => {
  it('takes over from the taps only for a clear upward drag', () => {
    expect(isUpwardSwipe({ dx: 0, dy: -20 })).toBe(true);
    expect(isUpwardSwipe({ dx: 0, dy: -3 })).toBe(false);
    expect(isUpwardSwipe({ dx: 0, dy: 20 })).toBe(false);
    expect(isUpwardSwipe({ dx: 40, dy: -20 })).toBe(false);
  });

  it('closes on a long or a fast upward drag, not on a short slow one', () => {
    expect(shouldCloseOnSwipe({ dy: -40, vy: 0 })).toBe(true);
    expect(shouldCloseOnSwipe({ dy: -10, vy: -0.8 })).toBe(true);
    expect(shouldCloseOnSwipe({ dy: -10, vy: -0.1 })).toBe(false);
    expect(shouldCloseOnSwipe({ dy: 30, vy: 0.9 })).toBe(false);
  });

  // PanResponder reads everything from the event's touch history.
  function touch({ startY, previousY, y, t }: { startY: number; previousY: number; y: number; t: number }) {
    return {
      touchHistory: {
        touchBank: [
          {
            touchActive: true,
            startPageX: 0,
            startPageY: startY,
            startTimeStamp: 0,
            currentPageX: 0,
            currentPageY: y,
            currentTimeStamp: t,
            previousPageX: 0,
            previousPageY: previousY,
            previousTimeStamp: t - 16,
          },
        ],
        numberActiveTouches: 1,
        indexOfSingleActiveTouch: 0,
        mostRecentTimeStamp: t,
      },
      nativeEvent: { touches: [{}], changedTouches: [{}] },
    };
  }

  function swipeUp(pill: { props: Record<string, (...a: unknown[]) => unknown> }, endY: number) {
    act(() => {
      pill.props.onResponderGrant(touch({ startY: 100, previousY: 100, y: 100, t: 0 }));
      pill.props.onResponderMove(touch({ startY: 100, previousY: 100, y: endY, t: 100 }));
      pill.props.onResponderRelease(touch({ startY: 100, previousY: endY, y: endY, t: 120 }));
    });
  }

  it('asks to close after a long swipe up', () => {
    const p = props();
    const { getByTestId } = render(<NotificationToast {...p} />);

    swipeUp(getByTestId('notification-toast-pill') as never, 40);

    expect(p.onClose).toHaveBeenCalledTimes(1);
  });

  it('does not close on a small nudge, and a swipe down never closes', () => {
    const p = props();
    const { getByTestId } = render(<NotificationToast {...p} />);

    swipeUp(getByTestId('notification-toast-pill') as never, 99);
    swipeUp(getByTestId('notification-toast-pill') as never, 200);

    expect(p.onClose).not.toHaveBeenCalled();
  });
});
