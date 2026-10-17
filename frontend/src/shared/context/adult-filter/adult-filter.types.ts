import type { AdultClassification, AdultFilterMode } from '../../tools/adult-filter';

export interface AdultFilterState {
  // Category names the user marked as adult. Empty = the feature is off.
  categories: string[];
  mode: AdultFilterMode;
  // Show blurred items without the blur (only meaningful in the modes that show adult items).
  unblur: boolean;
  // The inverted view (only the filtered items). Session state: never stored, off on every launch.
  only: boolean;
  classification: AdultClassification;
  setCategories: (names: string[]) => void;
  setMode: (mode: AdultFilterMode) => void;
  setUnblur: (value: boolean) => void;
  setOnly: (value: boolean) => void;
  // Re-ask the provider which series are adult. Throttled — safe to call from a render effect.
  requestClassification: () => void;
}
