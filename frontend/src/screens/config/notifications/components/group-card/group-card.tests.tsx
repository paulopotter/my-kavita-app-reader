import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { GroupCard, type GroupCardProps } from './group-card.component';

const strings = { urls: 'URLs', addUrl: '+ Add URL' };

const props = (over: Partial<GroupCardProps> = {}): GroupCardProps => ({
  name: 'Home',
  onGroupMenu: jest.fn(),
  urls: [],
  canAddUrl: true,
  onUrlMenu: jest.fn(),
  onAddUrl: jest.fn(),
  strings,
  ...over,
});

describe('GroupCard', () => {
  it('renders the group name and its URLs', () => {
    const { getByText } = render(
      <GroupCard {...props({ urls: [{ id: 'u1', url: 'https://ntfy.sh', priority: 0 }] })} />,
    );
    expect(getByText('Home')).toBeTruthy();
    expect(getByText('https://ntfy.sh')).toBeTruthy();
    expect(getByText('P0')).toBeTruthy();
  });

  it('shows the add-URL button when canAddUrl is true', () => {
    const { getByText } = render(<GroupCard {...props({ canAddUrl: true })} />);
    expect(getByText('+ Add URL')).toBeTruthy();
  });

  it('hides the add-URL button when canAddUrl is false', () => {
    const { queryByText } = render(<GroupCard {...props({ canAddUrl: false })} />);
    expect(queryByText('+ Add URL')).toBeNull();
  });

  it('calls onGroupMenu when the group ⋯ is pressed', () => {
    const onGroupMenu = jest.fn();
    const { getByText } = render(<GroupCard {...props({ onGroupMenu })} />);
    fireEvent.press(getByText('⋯'));
    expect(onGroupMenu).toHaveBeenCalledTimes(1);
  });

  it('calls onAddUrl when the add-URL button is pressed', () => {
    const onAddUrl = jest.fn();
    const { getByText } = render(<GroupCard {...props({ onAddUrl })} />);
    fireEvent.press(getByText('+ Add URL'));
    expect(onAddUrl).toHaveBeenCalledTimes(1);
  });

  it('calls onUrlMenu with the url id when a URL row menu is pressed', () => {
    const onUrlMenu = jest.fn();
    const { getAllByText } = render(
      <GroupCard {...props({ urls: [{ id: 'u1', url: 'https://ntfy.sh', priority: 0 }], onUrlMenu })} />,
    );
    // getAllByText('⋯') because both the group header and the URL row render one.
    fireEvent.press(getAllByText('⋯')[1]);
    expect(onUrlMenu).toHaveBeenCalledWith('u1');
  });
});
