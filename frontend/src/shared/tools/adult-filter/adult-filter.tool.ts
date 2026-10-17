// AdultFilterTool — the pure render-time rule of the adult-content filter. Knows nothing about
// where the adult set came from (the provider's categories) or how it is stored: it receives the
// classification and the user's mode and decides, per item, whether it shows and whether it is
// blurred. Nothing is cached or mutated, so changing the mode never refetches anything.

export type AdultFilterMode = 'hidden' | 'blur' | 'normal' | 'adultOnly';

export const DEFAULT_ADULT_FILTER_MODE: AdultFilterMode = 'hidden';

export function isAdultFilterMode(value: unknown): value is AdultFilterMode {
  return value === 'hidden' || value === 'blur' || value === 'normal' || value === 'adultOnly';
}

export interface AdultClassification {
  // Series the provider says carry one of the selected categories.
  adultIds: Set<string>;
  // Every series the classification was computed against. A series outside it is "pending": new
  // since the last run, so nobody knows yet — it is treated as adult until it is classified.
  knownIds: Set<string>;
}

export const EMPTY_CLASSIFICATION: AdultClassification = { adultIds: new Set(), knownIds: new Set() };

// `blurred` is absent while the filter is off (nothing was decided about the item).
export type AdultFiltered<T> = T & { blurred?: boolean };

export const AdultFilterTool = {
  // `active` is false when no category is selected: the feature is gated by missing
  // configuration, so every item passes untouched.
  apply<T>({
    items,
    idOf,
    mode,
    unblur,
    active,
    classification,
  }: {
    items: T[];
    idOf: (item: T) => string;
    mode: AdultFilterMode;
    unblur: boolean;
    active: boolean;
    classification: AdultClassification;
  }): { items: AdultFiltered<T>[]; pending: number } {
    if (!active) {
      return { items: items as AdultFiltered<T>[], pending: 0 };
    }

    const result: AdultFiltered<T>[] = [];
    let pending = 0;
    for (const item of items) {
      const id = idOf(item);
      const adult = classification.adultIds.has(id);
      const isPending = !adult && !classification.knownIds.has(id);
      if (isPending) {pending += 1;}
      const suspect = adult || isPending;

      switch (mode) {
        case 'normal':
          result.push({ ...item, blurred: false });
          break;
        case 'hidden':
          if (!suspect) {result.push({ ...item, blurred: false });}
          break;
        case 'blur':
          result.push({ ...item, blurred: suspect && !unblur });
          break;
        case 'adultOnly':
          if (adult) {result.push({ ...item, blurred: !unblur });}
          break;
      }
    }
    return { items: result, pending };
  },
};
