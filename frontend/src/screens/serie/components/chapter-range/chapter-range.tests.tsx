import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { getStrings } from '../../../../shared/i18n/strings';
import { ChapterRangeFields } from './chapter-range.component';

const t = getStrings('pt-BR');

describe('ChapterRangeFields', () => {
  it('renders the from/to labels', () => {
    const { getByText } = render(<ChapterRangeFields t={t} onChange={jest.fn()} />);
    expect(getByText(t.seriesDetailRangeFromLabel)).toBeTruthy();
    expect(getByText(t.seriesDetailRangeToLabel)).toBeTruthy();
  });

  it('parses both inputs and emits the numeric pair through onChange', () => {
    const onChange = jest.fn();
    const { getAllByDisplayValue } = render(<ChapterRangeFields t={t} onChange={onChange} />);
    const [fromInput] = getAllByDisplayValue('');
    fireEvent.changeText(fromInput, '10');
    expect(onChange).toHaveBeenLastCalledWith(10, undefined);
  });

  it('strips non-numeric characters and accepts decimals', () => {
    const onChange = jest.fn();
    const { getAllByDisplayValue } = render(<ChapterRangeFields t={t} onChange={onChange} />);
    const [fromInput, toInput] = getAllByDisplayValue('');
    fireEvent.changeText(fromInput, '5.5abc');
    fireEvent.changeText(toInput, '10');
    expect(onChange).toHaveBeenLastCalledWith(5.5, 10);
  });

  it('reports undefined for a field left empty', () => {
    const onChange = jest.fn();
    const { getAllByDisplayValue } = render(<ChapterRangeFields t={t} onChange={onChange} />);
    const [, toInput] = getAllByDisplayValue('');
    fireEvent.changeText(toInput, '20');
    expect(onChange).toHaveBeenLastCalledWith(undefined, 20);
  });
});
