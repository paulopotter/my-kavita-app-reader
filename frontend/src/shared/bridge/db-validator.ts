import { DbValidator, DbStatus } from './config';

const EXPECTED_DB_VERSION = 3;

export interface DbValidationResult {
  ok: boolean;
  version: number;
  isOpen: boolean;
  error?: string;
}

export async function validateDb(): Promise<DbValidationResult> {
  try {
    const status: DbStatus = await DbValidator.getDbStatus();
    const versionOk = status.version === EXPECTED_DB_VERSION;
    return {
      ok: status.isOpen && versionOk,
      version: status.version,
      isOpen: status.isOpen,
      error: !versionOk
        ? `DB version mismatch: expected ${EXPECTED_DB_VERSION}, got ${status.version}`
        : !status.isOpen
        ? 'Database is not open'
        : undefined,
    };
  } catch (e) {
    return {
      ok: false,
      version: -1,
      isOpen: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
