import {
  formatLastAdded,
  formatProgress,
  publicationLabel,
  statusLabel,
} from '../LibraryTransform';
import { getStrings } from '../../../shared/i18n/strings';

const t = getStrings('pt-BR');

describe('formatProgress', () => {
  it('returns 0% for zero', () => {
    expect(formatProgress(0)).toBe('0%');
  });

  it('returns 50% for 0.5', () => {
    expect(formatProgress(0.5)).toBe('50%');
  });

  it('returns 100% for 1', () => {
    expect(formatProgress(1)).toBe('100%');
  });

  it('rounds to nearest integer', () => {
    expect(formatProgress(0.333)).toBe('33%');
    expect(formatProgress(0.667)).toBe('67%');
  });
});

describe('formatLastAdded', () => {
  it('returns em dash for null', () => {
    expect(formatLastAdded(null, 'pt-BR')).toBe('—');
  });

  it('formats a valid ISO date', () => {
    const result = formatLastAdded('2026-01-15T00:00:00Z', 'pt-BR');
    expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });

  it('returns em dash for invalid string', () => {
    expect(formatLastAdded('not-a-date', 'pt-BR')).toBe('—');
  });
});

describe('statusLabel', () => {
  it('maps UNREAD correctly', () => {
    expect(statusLabel('UNREAD', t)).toBe('Não lido');
  });

  it('maps IN_PROGRESS correctly', () => {
    expect(statusLabel('IN_PROGRESS', t)).toBe('Lendo');
  });

  it('maps READ correctly', () => {
    expect(statusLabel('READ', t)).toBe('Lido');
  });
});

describe('publicationLabel', () => {
  it('returns null for NONE', () => {
    expect(publicationLabel('NONE', t)).toBeNull();
  });

  it('maps ONGOING correctly', () => {
    expect(publicationLabel('ONGOING', t)).toBe('Em andamento');
  });

  it('maps COMPLETED correctly', () => {
    expect(publicationLabel('COMPLETED', t)).toBe('Completo');
  });

  it('maps CANCELLED correctly', () => {
    expect(publicationLabel('CANCELLED', t)).toBe('Cancelado');
  });

  it('maps ON_HIATUS correctly', () => {
    expect(publicationLabel('ON_HIATUS', t)).toBe('Hiato');
  });

  it('maps ABANDONED correctly', () => {
    expect(publicationLabel('ABANDONED', t)).toBe('Abandonado');
  });
});
