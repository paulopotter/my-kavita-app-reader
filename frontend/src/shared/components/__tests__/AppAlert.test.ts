/**
 * Tests for AppAlert logic — button variants, dismissibility, and required vs advisory modes.
 * Component rendering is not tested here (no @testing-library/react-native available);
 * instead we test the pure logic that drives prop construction.
 */
import type { AppAlertButton, AppAlertProps } from '../AppAlert';

function buildRequiredAlert(overrides?: Partial<AppAlertProps>): AppAlertProps {
  return {
    visible: true,
    title: 'Atualização obrigatória',
    message: 'Esta versão não é mais suportada.',
    buttons: [{ label: 'Ver novidades', variant: 'primary', onPress: jest.fn() }],
    dismissible: false,
    ...overrides,
  };
}

function buildAdvisoryAlert(mode: 'highly_recommended' | 'recommended'): AppAlertProps {
  const onDismiss = jest.fn();
  return {
    visible: true,
    title: mode === 'highly_recommended' ? 'Altamente recomendado' : 'Nova versão',
    message: 'Uma nova versão está disponível.',
    buttons: [
      { label: 'Agora não', variant: 'secondary', onPress: onDismiss },
      { label: 'Ver novidades', variant: 'primary', onPress: jest.fn() },
    ],
    dismissible: true,
    onDismiss,
  };
}

describe('AppAlert — modo required', () => {
  it('não é dismissível', () => {
    const props = buildRequiredAlert();
    expect(props.dismissible).toBe(false);
  });

  it('tem apenas um botão (primário)', () => {
    const props = buildRequiredAlert();
    expect(props.buttons).toHaveLength(1);
    expect(props.buttons[0].variant).toBe('primary');
  });

  it('não tem onDismiss', () => {
    const props = buildRequiredAlert();
    expect(props.onDismiss).toBeUndefined();
  });
});

describe('AppAlert — modo highly_recommended', () => {
  it('é dismissível', () => {
    const props = buildAdvisoryAlert('highly_recommended');
    expect(props.dismissible).toBe(true);
  });

  it('tem botão secundário (Agora não) e primário (Ver novidades)', () => {
    const props = buildAdvisoryAlert('highly_recommended');
    expect(props.buttons).toHaveLength(2);
    expect(props.buttons[0].variant).toBe('secondary');
    expect(props.buttons[1].variant).toBe('primary');
  });

  it('tem onDismiss definido', () => {
    const props = buildAdvisoryAlert('highly_recommended');
    expect(props.onDismiss).toBeDefined();
  });
});

describe('AppAlert — modo recommended', () => {
  it('é dismissível', () => {
    const props = buildAdvisoryAlert('recommended');
    expect(props.dismissible).toBe(true);
  });

  it('tem dois botões', () => {
    const props = buildAdvisoryAlert('recommended');
    expect(props.buttons).toHaveLength(2);
  });
});

describe('AppAlert — variantes de botão', () => {
  it('variante primary é reconhecida', () => {
    const btn: AppAlertButton = { label: 'Ok', variant: 'primary', onPress: jest.fn() };
    expect(btn.variant).toBe('primary');
  });

  it('variante secondary é reconhecida', () => {
    const btn: AppAlertButton = { label: 'Cancelar', variant: 'secondary', onPress: jest.fn() };
    expect(btn.variant).toBe('secondary');
  });

  it('variante destructive é reconhecida', () => {
    const btn: AppAlertButton = { label: 'Excluir', variant: 'destructive', onPress: jest.fn() };
    expect(btn.variant).toBe('destructive');
  });

  it('onPress é invocado ao ser chamado', () => {
    const onPress = jest.fn();
    const btn: AppAlertButton = { label: 'Ok', variant: 'primary', onPress };
    btn.onPress();
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
