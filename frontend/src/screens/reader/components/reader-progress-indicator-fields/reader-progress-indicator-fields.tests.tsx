import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { getStrings } from '../../../../shared/i18n/strings';

const t = getStrings('pt-BR');

const mockSetProgressColorOverride = jest.fn();
let mockProgressColorOverride: string | undefined;

jest.mock('../../../../shared/context', () => {
  const actual = jest.requireActual('../../../../shared/context');
  return {
    ...actual,
    useTheme: () => ({
      ...actual.useTheme(),
      available: Object.keys(jest.requireActual('../../../../shared/theme').themes),
      progressColorOverride: mockProgressColorOverride,
      setProgressColorOverride: mockSetProgressColorOverride,
    }),
  };
});

import { ReaderProgressIndicatorFields } from './reader-progress-indicator-fields.component';

beforeEach(() => {
  jest.clearAllMocks();
  mockProgressColorOverride = undefined;
});

describe('ReaderProgressIndicatorFields', () => {
  it('renders the default row plus one per non-OLED theme, each as a name (dot alongside it)', () => {
    const { getByText } = render(
      <ReaderProgressIndicatorFields t={t} position={undefined} onChangePosition={jest.fn()} />,
    );
    expect(getByText(t.readerProgressColorDefault)).toBeTruthy();
    expect(getByText(t.themeNameCrimson)).toBeTruthy();
  });

  it('selecting a theme row calls setProgressColorOverride with that theme', () => {
    const { getByText } = render(
      <ReaderProgressIndicatorFields t={t} position={undefined} onChangePosition={jest.fn()} />,
    );
    fireEvent.press(getByText(t.themeNameCrimson));
    expect(mockSetProgressColorOverride).toHaveBeenCalledWith('crimson');
  });

  it('selecting the default row clears the override', () => {
    mockProgressColorOverride = 'crimson';
    const { getByText } = render(
      <ReaderProgressIndicatorFields t={t} position={undefined} onChangePosition={jest.fn()} />,
    );
    fireEvent.press(getByText(t.readerProgressColorDefault));
    expect(mockSetProgressColorOverride).toHaveBeenCalledWith(undefined);
  });

  it('renders all four position options', () => {
    const { getByText } = render(
      <ReaderProgressIndicatorFields t={t} position={undefined} onChangePosition={jest.fn()} />,
    );
    expect(getByText(t.readerProgressPositionLeft)).toBeTruthy();
    expect(getByText(t.readerProgressPositionRight)).toBeTruthy();
    expect(getByText(t.readerProgressPositionTop)).toBeTruthy();
    expect(getByText(t.readerProgressPositionBottom)).toBeTruthy();
  });

  it('selecting a position calls onChangePosition with that edge', () => {
    const onChangePosition = jest.fn();
    const { getByText } = render(
      <ReaderProgressIndicatorFields t={t} position={undefined} onChangePosition={onChangePosition} />,
    );
    fireEvent.press(getByText(t.readerProgressPositionTop));
    expect(onChangePosition).toHaveBeenCalledWith('top');
  });

  it('marks the currently selected position', () => {
    const { getByText } = render(
      <ReaderProgressIndicatorFields t={t} position="bottom" onChangePosition={jest.fn()} />,
    );
    // Style array's later entries win — selected style must be present, not just the base one.
    const node = getByText(t.readerProgressPositionBottom);
    expect(node.props.style).toEqual(expect.arrayContaining([expect.objectContaining({ fontWeight: expect.anything() })]));
  });
});
