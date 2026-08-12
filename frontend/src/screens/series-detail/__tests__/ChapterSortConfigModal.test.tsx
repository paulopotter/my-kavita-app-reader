import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { getStrings } from '../../../shared/i18n/strings';
import { ChapterSortConfigModal } from '../components/ChapterSortConfigModal';

const t = getStrings('pt-BR');

describe('ChapterSortConfigModal', () => {
  it('nao renderiza conteudo quando visible=false', () => {
    const { queryByText } = render(
      <ChapterSortConfigModal
        visible={false}
        mode="ASCENDING"
        progressPercent={50}
        t={t}
        onSave={jest.fn()}
        onCancel={jest.fn()}
      />,
    );
    expect(queryByText(t.seriesDetailSortConfigTitle)).toBeNull();
  });

  it('renderiza o titulo e os 4 modos quando visible=true', () => {
    const { getByText } = render(
      <ChapterSortConfigModal
        visible={true}
        mode="ASCENDING"
        progressPercent={50}
        t={t}
        onSave={jest.fn()}
        onCancel={jest.fn()}
      />,
    );
    expect(getByText(t.seriesDetailSortConfigTitle)).toBeTruthy();
    expect(getByText(t.seriesDetailSortAscending)).toBeTruthy();
    expect(getByText(t.seriesDetailSortDescending)).toBeTruthy();
  });

  it('chama onCancel ao tocar em cancelar', () => {
    const onCancel = jest.fn();
    const { getByText } = render(
      <ChapterSortConfigModal
        visible={true}
        mode="ASCENDING"
        progressPercent={50}
        t={t}
        onSave={jest.fn()}
        onCancel={onCancel}
      />,
    );
    fireEvent.press(getByText(t.seriesDetailSortConfigCancel));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('chama onSave com o modo inicial ao salvar sem alterar nada', () => {
    const onSave = jest.fn();
    const { getByText } = render(
      <ChapterSortConfigModal
        visible={true}
        mode="ASCENDING"
        progressPercent={50}
        t={t}
        onSave={onSave}
        onCancel={jest.fn()}
      />,
    );
    fireEvent.press(getByText(t.seriesDetailSortConfigSave));
    expect(onSave).toHaveBeenCalledWith('ASCENDING', undefined, 50);
  });

  it('muda o modo selecionado ao tocar em outra opcao e salva com o novo modo', () => {
    const onSave = jest.fn();
    const { getByText } = render(
      <ChapterSortConfigModal
        visible={true}
        mode="ASCENDING"
        progressPercent={50}
        t={t}
        onSave={onSave}
        onCancel={jest.fn()}
      />,
    );
    fireEvent.press(getByText(t.seriesDetailSortDescending));
    fireEvent.press(getByText(t.seriesDetailSortConfigSave));
    expect(onSave).toHaveBeenCalledWith('DESCENDING', undefined, 50);
  });

  it('exibe o campo de limiar ao selecionar AUTO_FIXED', () => {
    const { getByText } = render(
      <ChapterSortConfigModal
        visible={true}
        mode="ASCENDING"
        progressPercent={50}
        t={t}
        onSave={jest.fn()}
        onCancel={jest.fn()}
      />,
    );
    fireEvent.press(getByText(t.seriesDetailSortAutoFixed.replace('{0}', '0')));
    expect(getByText(t.seriesDetailSortConfigFixedThresholdLabel)).toBeTruthy();
  });
});
