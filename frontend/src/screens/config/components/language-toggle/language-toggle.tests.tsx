import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { LanguageToggle } from './language-toggle.component';

describe('LanguageToggle', () => {
  it('renders both language labels', () => {
    const { getByText } = render(<LanguageToggle language="pt-BR" onChange={jest.fn()} />);
    expect(getByText('🇧🇷 PT')).toBeTruthy();
    expect(getByText('🇺🇸 EN')).toBeTruthy();
  });

  it('the track toggles pt-BR → en', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(<LanguageToggle language="pt-BR" onChange={onChange} />);
    fireEvent.press(getByTestId('language-toggle-track'));
    expect(onChange).toHaveBeenCalledWith('en');
  });

  it('the track toggles en → pt-BR', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(<LanguageToggle language="en" onChange={onChange} />);
    fireEvent.press(getByTestId('language-toggle-track'));
    expect(onChange).toHaveBeenCalledWith('pt-BR');
  });

  it('tapping the EN label while on pt-BR switches to en', () => {
    const onChange = jest.fn();
    const { getByText } = render(<LanguageToggle language="pt-BR" onChange={onChange} />);
    fireEvent.press(getByText('🇺🇸 EN'));
    expect(onChange).toHaveBeenCalledWith('en');
  });

  it('tapping the PT label while already on pt-BR does nothing', () => {
    const onChange = jest.fn();
    const { getByText } = render(<LanguageToggle language="pt-BR" onChange={onChange} />);
    fireEvent.press(getByText('🇧🇷 PT'));
    expect(onChange).not.toHaveBeenCalled();
  });
});
