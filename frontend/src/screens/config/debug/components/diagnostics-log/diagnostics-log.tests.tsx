import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { DiagnosticsLog, type DiagnosticsLogProps } from './diagnostics-log.component';

const strings = { title: 'Log', hint: 'a local file', size: 'Size', adb: 'Read from a computer', exportLabel: 'Export', clearLabel: 'Clear', refreshLabel: 'Refresh' };
const props = (over: Partial<DiagnosticsLogProps> = {}): DiagnosticsLogProps => ({
  strings,
  info: { sizeLabel: '12 KB', adbCommand: 'adb pull /sdcard/x.log' },
  busy: false,
  onExport: jest.fn(),
  onClear: jest.fn(),
  onRefresh: jest.fn(),
  ...over,
});

describe('DiagnosticsLog', () => {
  it('shows the size and the adb command', () => {
    const { getByText } = render(<DiagnosticsLog {...props()} />);
    expect(getByText('12 KB')).toBeTruthy();
    expect(getByText('adb pull /sdcard/x.log')).toBeTruthy();
  });

  it('hides size and command while there is no info, but keeps the actions', () => {
    const { queryByText, getByText } = render(<DiagnosticsLog {...props({ info: null })} />);
    expect(queryByText('Size')).toBeNull();
    expect(getByText('Export')).toBeTruthy();
  });

  it('each button reports its own action', () => {
    const p = props();
    const { getByText } = render(<DiagnosticsLog {...p} />);
    fireEvent.press(getByText('Export'));
    fireEvent.press(getByText('Refresh'));
    fireEvent.press(getByText('Clear'));
    expect(p.onExport).toHaveBeenCalledTimes(1);
    expect(p.onRefresh).toHaveBeenCalledTimes(1);
    expect(p.onClear).toHaveBeenCalledTimes(1);
  });

  it('does not fire while busy', () => {
    const p = props({ busy: true });
    const { getByText } = render(<DiagnosticsLog {...p} />);
    fireEvent.press(getByText('Export'));
    expect(p.onExport).not.toHaveBeenCalled();
  });
});
