import { validateDb } from '../db-validator';

jest.mock('../config', () => ({
  DbValidator: {
    getDbStatus: jest.fn(),
  },
}));

import { DbValidator } from '../config';

const mockGetDbStatus = DbValidator.getDbStatus as jest.Mock;

describe('validateDb', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns ok=true when version matches and db is open', async () => {
    mockGetDbStatus.mockResolvedValue({ version: 1, isOpen: true });
    const result = await validateDb();
    expect(result.ok).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('returns ok=false when version mismatch', async () => {
    mockGetDbStatus.mockResolvedValue({ version: 2, isOpen: true });
    const result = await validateDb();
    expect(result.ok).toBe(false);
    expect(result.error).toContain('version mismatch');
  });

  it('returns ok=false when db is not open', async () => {
    mockGetDbStatus.mockResolvedValue({ version: 1, isOpen: false });
    const result = await validateDb();
    expect(result.ok).toBe(false);
    expect(result.error).toContain('not open');
  });

  it('handles native module rejection', async () => {
    mockGetDbStatus.mockRejectedValue(new Error('native crash'));
    const result = await validateDb();
    expect(result.ok).toBe(false);
    expect(result.error).toContain('native crash');
    expect(result.version).toBe(-1);
  });
});
