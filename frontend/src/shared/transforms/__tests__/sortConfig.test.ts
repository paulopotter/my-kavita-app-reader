import { getStrings } from '../../i18n/strings';
import { parseSortConfigInput, sortModeLabel } from '../sortConfig';

const t = getStrings('pt-BR');

describe('sortModeLabel', () => {
  it('retorna label para ASCENDING', () => {
    expect(sortModeLabel('ASCENDING', undefined, 50, t)).toBe('Crescente');
  });

  it('retorna label para DESCENDING', () => {
    expect(sortModeLabel('DESCENDING', undefined, 50, t)).toBe('Decrescente');
  });

  it('retorna label com limiar para AUTO_FIXED', () => {
    expect(sortModeLabel('AUTO_FIXED', 12, 50, t)).toBe('Auto (cap. 12)');
  });

  it('retorna label com 0 quando AUTO_FIXED sem limiar definido', () => {
    expect(sortModeLabel('AUTO_FIXED', undefined, 50, t)).toBe('Auto (cap. 0)');
  });

  it('retorna label com percentual para AUTO_PROGRESS', () => {
    expect(sortModeLabel('AUTO_PROGRESS', undefined, 80, t)).toBe('Auto (80%)');
  });
});

describe('parseSortConfigInput', () => {
  it('parseia limiar e percentual validos', () => {
    const result = parseSortConfigInput('12', '80', 50);
    expect(result.fixedThreshold).toBe(12);
    expect(result.progressPercent).toBe(80);
  });

  it('retorna fixedThreshold undefined quando texto vazio', () => {
    const result = parseSortConfigInput('', '80', 50);
    expect(result.fixedThreshold).toBeUndefined();
  });

  it('retorna fixedThreshold undefined quando texto invalido', () => {
    const result = parseSortConfigInput('abc', '80', 50);
    expect(result.fixedThreshold).toBeUndefined();
  });

  it('usa fallback de progressPercent quando texto invalido', () => {
    const result = parseSortConfigInput('12', 'xyz', 50);
    expect(result.progressPercent).toBe(50);
  });

  it('usa fallback de progressPercent quando texto vazio', () => {
    const result = parseSortConfigInput('12', '', 50);
    expect(result.progressPercent).toBe(50);
  });

  it('aceita limiar decimal', () => {
    const result = parseSortConfigInput('12.5', '80', 50);
    expect(result.fixedThreshold).toBe(12.5);
  });
});
