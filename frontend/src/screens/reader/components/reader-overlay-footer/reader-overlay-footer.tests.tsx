import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ReaderOverlayFooter } from './reader-overlay-footer.component';
import { getStrings } from '../../../../shared/i18n/strings';

const t = getStrings('pt-BR');

function setup(over: Partial<React.ComponentProps<typeof ReaderOverlayFooter>> = {}) {
  const onSelectChapter = jest.fn();
  const onOpenSettings = jest.fn();
  const utils = render(
    <ReaderOverlayFooter visible t={t} onSelectChapter={onSelectChapter} onOpenSettings={onOpenSettings} {...over} />,
  );
  return { ...utils, onSelectChapter, onOpenSettings };
}

describe('ReaderOverlayFooter', () => {
  it('renders nothing when not visible', () => {
    const { toJSON } = setup({ visible: false });
    expect(toJSON()).toBeNull();
  });

  it('fires onSelectChapter when the chapter-picker button is pressed', () => {
    const { getByText, onSelectChapter } = setup();
    fireEvent.press(getByText(t.readerChapterPickerButtonLabel));
    expect(onSelectChapter).toHaveBeenCalledTimes(1);
  });

  it('fires onOpenSettings when the settings button is pressed', () => {
    const { getByText, onOpenSettings } = setup();
    fireEvent.press(getByText(t.readerSettingsButtonLabel));
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });
});
