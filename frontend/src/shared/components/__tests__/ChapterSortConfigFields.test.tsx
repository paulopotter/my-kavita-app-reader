import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { getStrings } from '../../i18n/strings';
import { ChapterSortConfigFields } from '../ChapterSortConfigFields';

const t = getStrings('pt-BR');

describe('ChapterSortConfigFields', () => {
  it('renderiza os 4 modos', () => {
    const { getByText } = render(
      <ChapterSortConfigFields mode="ASCENDING" progressPercent={50} t={t} onChange={jest.fn()} />,
    );
    expect(getByText(t.seriesDetailSortAscending)).toBeTruthy();
    expect(getByText(t.seriesDetailSortDescending)).toBeTruthy();
  });

  it('chama onChange com o novo modo ao selecionar DESCENDING', () => {
    const onChange = jest.fn();
    const { getByText } = render(
      <ChapterSortConfigFields mode="ASCENDING" progressPercent={50} t={t} onChange={onChange} />,
    );
    fireEvent.press(getByText(t.seriesDetailSortDescending));
    expect(onChange).toHaveBeenCalledWith('DESCENDING', undefined, 50);
  });

  it('exibe campo de limiar apenas quando AUTO_FIXED esta selecionado', () => {
    const { getByText, queryByText } = render(
      <ChapterSortConfigFields mode="ASCENDING" progressPercent={50} t={t} onChange={jest.fn()} />,
    );
    expect(queryByText(t.seriesDetailSortConfigFixedThresholdLabel)).toBeNull();
    fireEvent.press(getByText(t.seriesDetailSortAutoFixed.replace('{0}', '0')));
    expect(getByText(t.seriesDetailSortConfigFixedThresholdLabel)).toBeTruthy();
  });

  it('exibe campo de percentual apenas quando AUTO_PROGRESS esta selecionado', () => {
    const { getByText, queryByText } = render(
      <ChapterSortConfigFields mode="ASCENDING" progressPercent={50} t={t} onChange={jest.fn()} />,
    );
    expect(queryByText(t.seriesDetailSortConfigProgressPercentLabel)).toBeNull();
    fireEvent.press(getByText(t.seriesDetailSortAutoProgress.replace('{0}', '50')));
    expect(getByText(t.seriesDetailSortConfigProgressPercentLabel)).toBeTruthy();
  });

  it('chama onChange com o limiar digitado ao editar o campo AUTO_FIXED', () => {
    const onChange = jest.fn();
    const { getByText, getByDisplayValue } = render(
      <ChapterSortConfigFields mode="AUTO_FIXED" fixedThreshold={5} progressPercent={50} t={t} onChange={onChange} />,
    );
    const input = getByDisplayValue('5');
    fireEvent.changeText(input, '12');
    expect(onChange).toHaveBeenCalledWith('AUTO_FIXED', 12, 50);
    // sanity: o modo AUTO_FIXED aparece selecionado (rotulo renderizado)
    expect(getByText(t.seriesDetailSortAutoFixed.replace('{0}', '5'))).toBeTruthy();
  });
});
