import { PreferencesManager } from '../../managers/preferences';

// Which server answers a field the app can get from both of its servers. Deliberately named by
// ROLE, never by provider: "enrichment" is whichever metadata provider is configured (a plugin
// id like m3 is a plugin's business, not a preference's), "content" is the server that actually
// serves the pages.
export type MetadataSource = 'enrichment' | 'content';

// A field's own setting. 'inherit' is the absence of a choice — the global preference decides.
export type MetadataSourceChoice = MetadataSource | 'inherit';

// The fields BOTH servers answer, so a user preference is meaningful. A field only one of them
// knows (how many chapters the upstream source listed; read progress) is never in here: there is
// nothing to choose between, so it simply renders wherever it belongs.
//
// This list is the single source of truth for two things at once — which fields the resolver
// disputes, and which rows the settings sub-page renders. Adding a field here is all it takes for
// both to follow, which is exactly why they must not keep separate lists.
export const DISPUTED_METADATA_FIELDS = ['summary', 'genres', 'author', 'status', 'alternativeTitles'] as const;

export type DisputedMetadataField = (typeof DISPUTED_METADATA_FIELDS)[number];

export interface MetadataSourcePreferences {
  // Which server wins for every field that has no say of its own.
  global: MetadataSource;
  // Only fields the user deliberately pinned. A field missing from here inherits — the absence
  // IS the 'inherit' state, so a field added to DISPUTED_METADATA_FIELDS later starts out
  // inheriting with no migration.
  fields: Partial<Record<DisputedMetadataField, MetadataSource>>;
}

// The enrichment server is curated on purpose, while the content server's metadata is whatever
// its scanner happened to find — so enrichment leads by default.
export const DEFAULT_METADATA_SOURCE_PREFERENCES: MetadataSourcePreferences = { global: 'enrichment', fields: {} };

const METADATA_SOURCE_PREFS_DOMAIN = 'metadataSourcePrefs';

// Keys are prefixed because PreferencesManager identifies an entry by key + variant ALONE —
// `domain` only exists for bulk deletion, it is not part of the identity. A bare 'global' here
// collided with ChaptersTool.sort's own 'global' key, so saving a metadata source silently
// overwrote the user's chapter-sort preferences and the list fell back to ascending.
const GLOBAL_KEY = 'metadataSource:global';
const FIELDS_KEY = 'metadataSource:fields';

function read<T>(key: string): Promise<T | null> {
  return PreferencesManager.get({ key }).then(entry => (entry ? (JSON.parse(entry.value) as T) : null));
}

function write(key: string, value: unknown): Promise<void> {
  return PreferencesManager.put({ key, value: JSON.stringify(value), domain: METADATA_SOURCE_PREFS_DOMAIN }).then(() => undefined);
}

export const MetadataSourcesTool = {
  // Stored as two keys rather than one object because the reset is the operation that matters:
  // changing the global wipes every per-field choice, and deleting one key is atomic where
  // rewriting a merged object could leave a half-reset state behind.
  preferences: {
    get(): Promise<MetadataSourcePreferences> {
      return Promise.all([read<MetadataSource>(GLOBAL_KEY), read<MetadataSourcePreferences['fields']>(FIELDS_KEY)]).then(
        ([global, fields]) => ({
          global: global ?? DEFAULT_METADATA_SOURCE_PREFERENCES.global,
          fields: fields ?? {},
        }),
      );
    },

    // Setting the global resets every per-field choice back to inherit — the user picked one
    // answer for everything, so previous exceptions no longer describe what they asked for.
    putGlobal({ source }: { source: MetadataSource }): Promise<MetadataSourcePreferences> {
      return write(GLOBAL_KEY, source)
        .then(() => PreferencesManager.delete({ key: FIELDS_KEY }))
        .then(() => ({ global: source, fields: {} }));
    },

    // 'inherit' removes the field's entry rather than storing it: inheriting is the absence of a
    // choice, and storing it would make a later default change silently not apply.
    putField({ field, choice }: { field: DisputedMetadataField; choice: MetadataSourceChoice }): Promise<MetadataSourcePreferences> {
      return MetadataSourcesTool.preferences.get().then(current => {
        const fields = { ...current.fields };
        if (choice === 'inherit') {
          delete fields[field];
        } else {
          fields[field] = choice;
        }
        return write(FIELDS_KEY, fields).then(() => ({ ...current, fields }));
      });
    },
  },

  // Which server this field should be read from first. Pure — the caller supplies the
  // preferences it already loaded, so the resolver never touches storage.
  sourceFor({ field, preferences }: { field: DisputedMetadataField; preferences: MetadataSourcePreferences }): MetadataSource {
    return preferences.fields[field] ?? preferences.global;
  },

  // Picks between the two servers' answers for one field. The preference decides who goes FIRST,
  // never who is allowed to answer: when the preferred side has nothing, the other one fills in.
  // Preferring a server must never mean showing a blank where the other had the data.
  resolve<T>({
    field,
    preferences,
    fromEnrichment,
    fromContent,
  }: {
    field: DisputedMetadataField;
    preferences: MetadataSourcePreferences;
    fromEnrichment: T | undefined;
    fromContent: T | undefined;
  }): T | undefined {
    const [first, second] =
      MetadataSourcesTool.sourceFor({ field, preferences }) === 'enrichment'
        ? [fromEnrichment, fromContent]
        : [fromContent, fromEnrichment];
    return isEmpty(first) ? second : first;
  },
};

// An empty string or empty list is "the server has no answer", not an answer — otherwise a
// provider that returns [] for genres would blank out a field the other side could fill.
function isEmpty(value: unknown): boolean {
  if (value == null) {return true;}
  if (typeof value === 'string') {return value.trim() === '';}
  if (Array.isArray(value)) {return value.length === 0;}
  return false;
}
