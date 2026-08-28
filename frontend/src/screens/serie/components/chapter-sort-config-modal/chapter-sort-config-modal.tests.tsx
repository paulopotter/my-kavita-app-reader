import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { getStrings } from '../../../../shared/i18n/strings';
import { ChapterSortConfigModal } from './chapter-sort-config-modal.component';

const t = getStrings('pt-BR');

describe('ChapterSortConfigModal', () => {
  it('renders no content when visible=false', () => {
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

  it('renders the title and the 4 modes when visible=true', () => {
    const { getByText } = render(
      <ChapterSortConfigModal
        visible
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

  it('calls onCancel when tapping cancel', () => {
    const onCancel = jest.fn();
    const { getByText } = render(
      <ChapterSortConfigModal
        visible
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

  it('calls onSave with the initial mode when saving without changing anything', () => {
    const onSave = jest.fn();
    const { getByText } = render(
      <ChapterSortConfigModal
        visible
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
    expect(onSave).toHaveBeenCalledWith({ mode: 'ASCENDING', fixedThreshold: undefined, progressPercent: 50 });
  });

  it('changes the selected mode when tapping another option and saves with the new mode', () => {
    const onSave = jest.fn();
    const { getByText } = render(
      <ChapterSortConfigModal
        visible
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
    expect(onSave).toHaveBeenCalledWith({ mode: 'DESCENDING', fixedThreshold: undefined, progressPercent: 50 });
  });

  it('shows the threshold field when selecting AUTO_FIXED', () => {
    const { getByText } = render(
      <ChapterSortConfigModal
        visible
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

  it('does not show the reset button or the note when hasSeriesOverride=false', () => {
    const { queryByText } = render(
      <ChapterSortConfigModal
        visible
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

  it('shows the reset button and the note when hasSeriesOverride=true', () => {
    const { getByText } = render(
      <ChapterSortConfigModal
        visible
        mode="DESCENDING"
        progressPercent={50}
        hasSeriesOverride
        t={t}
        onSave={jest.fn()}
        onReset={jest.fn()}
        onCancel={jest.fn()}
      />,
    );
    expect(getByText(t.seriesDetailSortConfigReset)).toBeTruthy();
    expect(getByText(t.seriesDetailSortConfigOverrideNote)).toBeTruthy();
  });

  it('calls onReset when tapping the reset button', () => {
    const onReset = jest.fn();
    const { getByText } = render(
      <ChapterSortConfigModal
        visible
        mode="DESCENDING"
        progressPercent={50}
        hasSeriesOverride
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
