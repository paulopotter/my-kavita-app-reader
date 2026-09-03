import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import type { SmokeTestStep } from '../../debug.steps';
import { Section, type SectionProps } from './section.component';

const props = (over: Partial<SectionProps> = {}): SectionProps => ({
  title: 'Server',
  onRun: jest.fn().mockResolvedValue([]),
  ...over,
});

describe('Section', () => {
  it('renders the title and a "Run <title>" button', () => {
    const { getByText } = render(<Section {...props()} />);
    expect(getByText('Server')).toBeTruthy();
    expect(getByText('Run Server')).toBeTruthy();
  });

  it('shows the id field only when idLabel is given and forwards edits', () => {
    const onIdChange = jest.fn();
    const { getByText, getByPlaceholderText, queryByText, rerender } = render(<Section {...props()} />);
    expect(queryByText('Group id')).toBeNull();

    rerender(<Section {...props({ idLabel: 'Group id', idValue: 'g1', onIdChange })} />);
    expect(getByText('Group id')).toBeTruthy();
    fireEvent.changeText(getByPlaceholderText('(not discovered — enter manually)'), 'g2');
    expect(onIdChange).toHaveBeenCalledWith('g2');
  });

  it('runs onRun and renders the returned steps with ok / fail styling', async () => {
    const steps: SmokeTestStep[] = [
      { label: 'step one', ok: true, detail: 'fine' },
      { label: 'step two', ok: false, detail: 'broke' },
    ];
    const onRun = jest.fn().mockResolvedValue(steps);
    const { getByText } = render(<Section {...props({ onRun })} />);

    await act(async () => {
      fireEvent.press(getByText('Run Server'));
    });

    await waitFor(() => expect(getByText('step one')).toBeTruthy());
    expect(getByText('fine')).toBeTruthy();
    expect(getByText('step two')).toBeTruthy();
    expect(getByText('broke')).toBeTruthy();
    expect(onRun).toHaveBeenCalledTimes(1);
  });

  it('does not run while disabled', () => {
    const onRun = jest.fn();
    const { getByText } = render(<Section {...props({ disabled: true, onRun })} />);
    fireEvent.press(getByText('Run Server'));
    expect(onRun).not.toHaveBeenCalled();
  });
});
