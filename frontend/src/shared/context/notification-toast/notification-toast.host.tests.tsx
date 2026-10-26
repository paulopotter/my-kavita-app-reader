import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

const mockToast = {
  visible: true,
  expanded: true,
  headline: { title: '2 novas notificações' },
  groups: [
    { seriesId: 's1', seriesName: 'One Piece', bodyText: 'Capítulo 1050 disponível', chapterId: 'c1' },
    { seriesId: 's2', seriesName: 'Naruto', bodyText: '3 novos capítulos disponíveis' },
  ],
  expand: jest.fn(),
  dismiss: jest.fn(),
};
jest.mock('./notification-toast.hooks', () => ({ useNotificationToast: () => mockToast }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 30, bottom: 0, left: 0, right: 0 }) }));
jest.mock('../../i18n/i18n.hooks', () => ({
  useStrings: () => require('../../i18n/strings').getStrings('pt-BR'),
}));

const mockRealizedRun = jest.fn();
const mockRealize = jest.fn((_action: unknown) => mockRealizedRun);
jest.mock('../../tools/actions', () => ({
  ...jest.requireActual('../../tools/actions/action.tool'),
  useAction: () => ({ realize: mockRealize }),
}));

import { NotificationToastHost } from './notification-toast.host';
import { Routes } from '../../../navigation/routes';

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});
afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

describe('NotificationToastHost', () => {
  it('a series with exactly one new chapter opens that chapter and dismisses the toast', () => {
    const { getByText } = render(<NotificationToastHost />);

    fireEvent.press(getByText('One Piece'));

    expect(mockToast.dismiss).toHaveBeenCalled();
    expect(mockRealize).toHaveBeenCalledWith({
      navigate: { to: { route: Routes.READER, params: { seriesId: 's1', chapterId: 'c1' }, canReplace: undefined } },
    });
    expect(mockRealizedRun).toHaveBeenCalled();
  });

  it('a series with several chapters opens the series', () => {
    const { getByText } = render(<NotificationToastHost />);

    fireEvent.press(getByText('Naruto'));

    expect(mockRealize).toHaveBeenCalledWith({
      navigate: { to: { route: Routes.SERIES_DETAIL, params: { seriesId: 's2' }, canReplace: undefined } },
    });
  });

  it('closing the list dismisses the toast', () => {
    const { getByLabelText } = render(<NotificationToastHost />);
    fireEvent.press(getByLabelText('Fechar notificações'));
    expect(mockToast.dismiss).toHaveBeenCalled();
  });
});
