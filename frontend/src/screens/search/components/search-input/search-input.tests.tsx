import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SearchInput, type SearchInputProps } from './search-input.component';

function props(over: Partial<SearchInputProps> = {}): SearchInputProps {
  return {
    value: '',
    placeholder: 'Buscar por nome',
    clearAccessibilityLabel: 'Limpar busca',
    onChange: jest.fn(),
    ...over,
  };
}

describe('SearchInput', () => {
  it('renders the placeholder and the current value', () => {
    const { getByPlaceholderText } = render(<SearchInput {...props({ value: 'one' })} />);
    expect(getByPlaceholderText('Buscar por nome').props.value).toBe('one');
  });

  it('forwards every keystroke', () => {
    const onChange = jest.fn();
    const { getByPlaceholderText } = render(<SearchInput {...props({ onChange })} />);
    fireEvent.changeText(getByPlaceholderText('Buscar por nome'), 'pie');
    expect(onChange).toHaveBeenCalledWith('pie');
  });

  it('hides the clear button while empty', () => {
    const { queryByLabelText } = render(<SearchInput {...props({ value: '' })} />);
    expect(queryByLabelText('Limpar busca')).toBeNull();
  });

  it('shows the clear button once there is text, and clearing emits an empty string', () => {
    const onChange = jest.fn();
    const { getByLabelText } = render(<SearchInput {...props({ value: 'one', onChange })} />);
    fireEvent.press(getByLabelText('Limpar busca'));
    expect(onChange).toHaveBeenCalledWith('');
  });
});
