import { ServerBridge } from '../../bridge';

// Layer 4 — thin wrapper over ServerBridge's categories (Server, Layer 2). No cache, no
// transformation. Categories are plain names and series are plain ids: whatever ids the provider
// keeps for its categories never leave the plugin. A provider with no categories answers with
// empty lists, so "nothing configured" is a normal result here, not an error.
export const CategoriesService = {
  list(): Promise<string[]> {
    return ServerBridge.listCategories();
  },
  serials: {
    // Ids of the series carrying ANY of the given category names.
    ids({ names }: { names: string[] }): Promise<string[]> {
      return ServerBridge.getSerialIdsByCategories(names);
    },
  },
};
