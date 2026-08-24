// Generic, domain-agnostic — knows nothing about Page/Chapter/Serial/Server. Recursively walks
// an object (any nesting depth, e.g. ChapterService.progress.set) and returns an equivalent
// object where every method found accepts a *partial* version of its own single object
// argument — the fields already known (fixed) are merged in automatically, so a caller only
// supplies whatever remains. No state is created beyond the fixed object itself: this never
// calls anything, never fetches anything, it only produces merge-and-forward wrapper functions.

// Every Service method here takes exactly one object argument (e.g. { seriesId, chapterId }).
type ObjectArgFn = (arg: object) => unknown;

// A bound method only needs the caller to supply whatever TFixed didn't already cover — every
// field TFixed has becomes optional on the wrapper, everything else stays required.
type BoundArg<TArg, TFixed> = Omit<TArg, keyof TFixed> & Partial<Pick<TArg, keyof TFixed & keyof TArg>>;

// Mirrors T, but every single-object-argument method becomes one that accepts BoundArg<TArg,
// TFixed> — optionally omitted entirely when nothing remains to supply (see bound() below,
// which always tolerates a missing/undefined call). `bound` itself is never carried over — a
// Service's own `bound(...)` method wrapping itself would produce a meaningless bound-of-bound.
// Any top-level key named in TSkip (e.g. a creation method like `group.add`, which has no id of
// TFixed's shape to receive at all) is dropped the same way.
type BoundOf<T, TFixed extends object, TSkip extends string> = {
  [K in keyof T as K extends 'bound' | TSkip ? never : K]: T[K] extends (arg: infer TArg) => infer TReturn
    ? TArg extends object
      ? (arg?: BoundArg<TArg, TFixed>) => TReturn
      : T[K]
    : T[K] extends object
      ? BoundOf<T[K], TFixed, TSkip>
      : T[K];
};

function bound<T extends object, TFixed extends object, TSkip extends string>(
  target: T,
  skipKeys: readonly TSkip[],
  fixed: TFixed,
): BoundOf<T, TFixed, TSkip> {
  const result = {} as Record<string, unknown>;
  for (const [key, value] of Object.entries(target)) {
    if (key === 'bound' || (skipKeys as readonly string[]).includes(key)) { continue; }
    if (typeof value === 'function') {
      const fn = value as ObjectArgFn;
      result[key] = (arg?: object) => fn({ ...fixed, ...(arg ?? {}) });
    } else if (typeof value === 'object' && value !== null) {
      result[key] = bound(value as object, skipKeys, fixed);
    } else {
      result[key] = value;
    }
  }
  return result as BoundOf<T, TFixed, TSkip>;
}

export const Methods = { bound };
