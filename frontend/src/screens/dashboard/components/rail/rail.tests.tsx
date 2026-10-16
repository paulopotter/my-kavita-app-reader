import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

jest.mock('../../../../shared/i18n', () => ({
  useStrings: () => require('../../../../shared/i18n/strings').getStrings('en'),
}));

import { Rail } from './rail.component';

const item = { seriesId: 's1', name: 'One Piece', coverUrl: 'c', caption: 'Ch. 3' };

describe('Rail', () => {
  it('shows the title and a message instead of vanishing when empty', () => {
    const { getByText } = render(<Rail title="Continue" items={[]} onPressItem={jest.fn()} />);
    expect(getByText('Continue')).toBeTruthy();
    expect(getByText('Nothing here yet')).toBeTruthy();
  });

  it('renders the tiles and hands the pressed item back', () => {
    const onPressItem = jest.fn();
    const { getByText, queryByText } = render(<Rail title="Continue" items={[item]} onPressItem={onPressItem} />);
    expect(queryByText('Nothing here yet')).toBeNull();
    fireEvent.press(getByText('One Piece'));
    expect(onPressItem).toHaveBeenCalledWith(item);
  });
});
