import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { getStrings } from '../../../../shared/i18n/strings';
import { SelectionBottomBar } from '../../components/SelectionBottomBar';

const t = getStrings('pt-BR');

describe('SelectionBottomBar', () => {
  it('renderiza os 4 botoes de acao', () => {
    const { getByText } = render(
      <SelectionBottomBar
        t={t}
        onMarkRead={jest.fn()}
        onMarkUnread={jest.fn()}
        onSelectAll={jest.fn()}
        onInvertSelection={jest.fn()}
      />,
    );
    expect(getByText(t.seriesDetailSelectionMarkRead)).toBeTruthy();
    expect(getByText(t.seriesDetailSelectionMarkUnread)).toBeTruthy();
    expect(getByText(t.seriesDetailSelectionSelectAll)).toBeTruthy();
    expect(getByText(t.seriesDetailSelectionInvert)).toBeTruthy();
  });

  it('chama onMarkRead ao tocar em marcar como lido', () => {
    const onMarkRead = jest.fn();
    const { getByText } = render(
      <SelectionBottomBar
        t={t}
        onMarkRead={onMarkRead}
        onMarkUnread={jest.fn()}
        onSelectAll={jest.fn()}
        onInvertSelection={jest.fn()}
      />,
    );
    fireEvent.press(getByText(t.seriesDetailSelectionMarkRead));
    expect(onMarkRead).toHaveBeenCalledTimes(1);
  });

  it('chama onSelectAll ao tocar em selecionar tudo', () => {
    const onSelectAll = jest.fn();
    const { getByText } = render(
      <SelectionBottomBar
        t={t}
        onMarkRead={jest.fn()}
        onMarkUnread={jest.fn()}
        onSelectAll={onSelectAll}
        onInvertSelection={jest.fn()}
      />,
    );
    fireEvent.press(getByText(t.seriesDetailSelectionSelectAll));
    expect(onSelectAll).toHaveBeenCalledTimes(1);
  });

  it('chama onInvertSelection ao tocar em inverter selecao', () => {
    const onInvertSelection = jest.fn();
    const { getByText } = render(
      <SelectionBottomBar
        t={t}
        onMarkRead={jest.fn()}
        onMarkUnread={jest.fn()}
        onSelectAll={jest.fn()}
        onInvertSelection={onInvertSelection}
      />,
    );
    fireEvent.press(getByText(t.seriesDetailSelectionInvert));
    expect(onInvertSelection).toHaveBeenCalledTimes(1);
  });
});
