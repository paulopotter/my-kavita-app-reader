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
        hasSeriesOverride={false}
        t={t}
        onSave={jest.fn()}
        onReset={jest.fn()}
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
        hasSeriesOverride={false}
        t={t}
        onSave={jest.fn()}
        onReset={jest.fn()}
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
        hasSeriesOverride={false}
        t={t}
        onSave={jest.fn()}
        onReset={jest.fn()}
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
        hasSeriesOverride={false}
        t={t}
        onSave={onSave}
        onReset={jest.fn()}
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
        hasSeriesOverride={false}
        t={t}
        onSave={onSave}
        onReset={jest.fn()}
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
        hasSeriesOverride={false}
        t={t}
        onSave={jest.fn()}
        onReset={jest.fn()}
        onCancel={jest.fn()}
      />,
    );
    fireEvent.press(getByText(t.seriesDetailSortAutoFixed.replace('{0}', '0')));
    expect(getByText(t.seriesDetailSortConfigFixedThresholdLabel)).toBeTruthy();
  });

  it('nao exibe o botao de reset nem a nota quando hasSeriesOverride=false', () => {
    const { queryByText } = render(
      <ChapterSortConfigModal
        visible={true}
        mode="ASCENDING"
        progressPercent={50}
        hasSeriesOverride={false}
        t={t}
        onSave={jest.fn()}
        onReset={jest.fn()}
        onCancel={jest.fn()}
      />,
    );
    expect(queryByText(t.seriesDetailSortConfigReset)).toBeNull();
    expect(queryByText(t.seriesDetailSortConfigOverrideNote)).toBeNull();
  });

  it('exibe o botao de reset e a nota quando hasSeriesOverride=true', () => {
    const { getByText } = render(
      <ChapterSortConfigModal
        visible={true}
        mode="DESCENDING"
        progressPercent={50}
        hasSeriesOverride={true}
        t={t}
        onSave={jest.fn()}
        onReset={jest.fn()}
        onCancel={jest.fn()}
      />,
    );
    expect(getByText(t.seriesDetailSortConfigReset)).toBeTruthy();
    expect(getByText(t.seriesDetailSortConfigOverrideNote)).toBeTruthy();
  });

  it('chama onReset ao tocar no botao de resetar', () => {
    const onReset = jest.fn();
    const { getByText } = render(
      <ChapterSortConfigModal
        visible={true}
        mode="DESCENDING"
        progressPercent={50}
        hasSeriesOverride={true}
        t={t}
        onSave={jest.fn()}
        onReset={onReset}
        onCancel={jest.fn()}
      />,
    );
    fireEvent.press(getByText(t.seriesDetailSortConfigReset));
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
