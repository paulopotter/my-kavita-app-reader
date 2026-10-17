import { PreferencesManager } from '../../managers/preferences';
import {
  type AdultClassification,
  type AdultFilterMode,
  DEFAULT_ADULT_FILTER_MODE,
  isAdultFilterMode,
} from './adult-filter.tool';

// AdultFilterPrefs — what the user chose for the adult-content filter, plus the last
// classification, persisted via PreferencesManager (:preferences, Room). Lives in shared/tools
// because several consumers share it: Config writes the choices, the AdultFilterProvider reads
// everything at boot and writes the classification, no screen owns it.
//
// The last classification is stored so the very first paint is already filtered — without it the
// adult series would show for the moment it takes the provider to answer, then vanish.
//
// One entity key; `variant` names which value it is. Lists are JSON arrays of strings, booleans
// are 'true'/'false' (the LibraryPrefs / ReaderPrefs convention).

const DOMAIN = 'adultFilterPrefs';
const KEY = 'adultFilter';

function read(variant: string): Promise<string | undefined> {
  return PreferencesManager.get({ key: KEY, variant })
    .then(entry => entry?.value || undefined)
    .catch(() => undefined);
}

function write(variant: string, value: string): Promise<void> {
  return PreferencesManager.put({ key: KEY, value, domain: DOMAIN, variant })
    .then(() => undefined)
    .catch(() => undefined);
}

function parseList(raw: string | undefined): string[] {
  if (!raw) {return [];}
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

export const AdultFilterPrefs = {
  // Category NAMES the user marked as adult (provider ids never reach this side).
  async getCategories(): Promise<string[]> {
    return parseList(await read('categories'));
  },
  setCategories(names: string[]): Promise<void> {
    return write('categories', JSON.stringify(names));
  },
  async getMode(): Promise<AdultFilterMode> {
    const raw = await read('mode');
    return isAdultFilterMode(raw) ? raw : DEFAULT_ADULT_FILTER_MODE;
  },
  setMode(mode: AdultFilterMode): Promise<void> {
    return write('mode', mode);
  },
  async getUnblur(): Promise<boolean> {
    return (await read('unblur')) === 'true';
  },
  setUnblur(value: boolean): Promise<void> {
    return write('unblur', String(value));
  },
  async getClassification(): Promise<AdultClassification> {
    const [adult, known] = await Promise.all([read('adultIds'), read('knownIds')]);
    return { adultIds: new Set(parseList(adult)), knownIds: new Set(parseList(known)) };
  },
  async setClassification(classification: AdultClassification): Promise<void> {
    await Promise.all([
      write('adultIds', JSON.stringify([...classification.adultIds])),
      write('knownIds', JSON.stringify([...classification.knownIds])),
    ]);
  },
};
