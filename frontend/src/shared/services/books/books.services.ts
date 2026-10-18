import { ServerBridge } from '../../bridge';
import type { PluginBookInfo, PluginBookTocItem } from '../../bridge';
import { Methods } from '../../tools/methods';

// Layer 4 — thin wrapper over ServerBridge's book reading (Server, Layer 2): a chapter read as an
// EPUB instead of as image pages. No cache, no transformation. `page` is an HTML FRAGMENT whose
// styles the provider already scoped; wrapping it in a document and theming it is the screen's
// job. A provider without the capability makes every call reject. Every method takes a single
// named object, which is what lets bound() merge in the fixed chapterId.
export const BookService = {
  info({ chapterId }: { chapterId: string }): Promise<PluginBookInfo> {
    return ServerBridge.getBookInfo(chapterId);
  },
  page({ chapterId, page }: { chapterId: string; page: number }): Promise<string> {
    return ServerBridge.getBookPage(chapterId, page);
  },
  toc({ chapterId }: { chapterId: string }): Promise<PluginBookTocItem[]> {
    return ServerBridge.getBookToc(chapterId);
  },
  // bound({chapterId}) fixes only the id, never a fetched page — every call still hits the bridge.
  bound(fixed: { chapterId: string }) {
    return Methods.bound(BookService, [], fixed);
  },
};
