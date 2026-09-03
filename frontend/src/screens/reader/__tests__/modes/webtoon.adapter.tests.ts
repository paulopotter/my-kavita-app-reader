import { getStrings } from '../../../../shared/i18n/strings';
import type { OrderedChapter, ReaderWindow } from '../../reader.types';
import {
  isWebtoonPositionReport,
  webtoonAdapter,
  webtoonReportToTrigger,
  windowToWebtoonBlocks,
} from '../../modes/webtoon.adapter';

const t = getStrings('pt-BR');

function order(ids: string[]): OrderedChapter[] {
  return ids.map((id, i) => ({
    id,
    seriesId: 's1',
    number: i + 1,
    decimalNumber: i + 1,
    title: id,
    readStatus: 'UNREAD' as const,
  }));
}

function window(): ReaderWindow {
  return {
    entries: [
      {
        chapter: {
          id: 'c1',
          seriesId: 's1',
          number: 1,
          title: 'A Chegada',
          readStatus: 'UNREAD',
          pageCount: 2,
          pagesRead: 0,
          pageUrls: ['u0', 'u1'],
          pageAspectRatios: [1.5, null],
          serverResume: null,
        },
        status: 'ready',
      },
      {
        chapter: {
          id: 'c2',
          seriesId: 's1',
          number: 2,
          title: '2',
          readStatus: 'UNREAD',
          pageCount: 0,
          pagesRead: 0,
          pageUrls: [],
          pageAspectRatios: [],
          serverResume: null,
        },
        status: 'placeholder',
      },
    ],
    focusedIndex: 0,
  };
}

describe('webtoonAdapter', () => {
  describe('toRenderModel', () => {
    it('maps every window entry to a ChapterBlock, placeholder included', () => {
      const blocks = webtoonAdapter.toRenderModel(window(), order(['c1', 'c2']), t);
      expect(blocks).toHaveLength(2);
      expect(blocks[0]).toMatchObject({ chapterId: 'c1', pageUrls: ['u0', 'u1'] });
      expect(blocks[1]).toMatchObject({ chapterId: 'c2', pageUrls: [] });
    });

    it('maps null aspect ratios to 0', () => {
      const blocks = webtoonAdapter.toRenderModel(window(), order(['c1', 'c2']), t);
      expect(blocks[0].pageAspectRatios).toEqual([1.5, 0]);
    });

    it('the first block has no gap above, later blocks do', () => {
      const blocks = webtoonAdapter.toRenderModel(window(), order(['c1', 'c2']), t);
      // firstNode of block 0 is the bare header (no gap container wrapper)
      expect((blocks[0].firstNode as { type: string }).type).toBe('container');
      expect(JSON.stringify(blocks[0].firstNode)).toContain('A Chegada');
      // block 1's title is just the number -> "Capítulo 2"
      expect(JSON.stringify(blocks[1].firstNode)).toContain('Capítulo 2');
    });

    it('the footer carries the bare chapter number', () => {
      const blocks = webtoonAdapter.toRenderModel(window(), order(['c1', 'c2']), t);
      expect(JSON.stringify(blocks[0].lastNode)).toContain('"1"');
    });

    it('the footer number falls back to decimalNumber, then to an empty string', () => {
      const w = window();
      w.entries[0].chapter.number = undefined;
      w.entries[0].chapter.decimalNumber = 1.5;
      w.entries[1].chapter.number = undefined;
      w.entries[1].chapter.decimalNumber = undefined;
      const blocks = webtoonAdapter.toRenderModel(w, [], t);
      expect(JSON.stringify(blocks[0].lastNode)).toContain('"1.5"');
      // c2 has neither number nor decimalNumber — the label is just "" (no crash, no "undefined")
      expect(JSON.stringify(blocks[1].lastNode)).not.toContain('undefined');
    });
  });

  describe('interpretPositionReport', () => {
    it('turns a webtoon position report into a native-scroll trigger', () => {
      expect(
        webtoonAdapter.interpretPositionReport({
          chapterId: 'c9',
          pageIndex: 3,
          pageFraction: 0.4,
          chapterFraction: 0.7,
        }),
      ).toEqual({
        source: 'native-scroll',
        reportedChapterId: 'c9',
        page: 3,
        pageFraction: 0.4,
        chapterFraction: 0.7,
      });
    });

    it('returns null for a malformed payload', () => {
      expect(webtoonAdapter.interpretPositionReport({ nope: true })).toBeNull();
      expect(webtoonAdapter.interpretPositionReport(null)).toBeNull();
    });
  });

  // The hook/screen import these standalone functions directly (NOT through the modes/ barrel,
  // NOT via the adapter object) — the rc30 module-init guard. Cover that entry point too.
  describe('standalone exports', () => {
    it('windowToWebtoonBlocks maps every entry, placeholder included', () => {
      const blocks = windowToWebtoonBlocks(window(), order(['c1', 'c2']), t);
      expect(blocks.map(b => b.chapterId)).toEqual(['c1', 'c2']);
    });

    it('webtoonReportToTrigger parses a valid report and rejects a bad one', () => {
      expect(
        webtoonReportToTrigger({ chapterId: 'c9', pageIndex: 3, pageFraction: 0.4, chapterFraction: 0.7 }),
      ).toEqual({
        source: 'native-scroll',
        reportedChapterId: 'c9',
        page: 3,
        pageFraction: 0.4,
        chapterFraction: 0.7,
      });
      expect(webtoonReportToTrigger({ nope: true })).toBeNull();
    });

    it('isWebtoonPositionReport is a type guard on chapterId + pageIndex', () => {
      expect(isWebtoonPositionReport({ chapterId: 'c1', pageIndex: 0 })).toBe(true);
      expect(isWebtoonPositionReport({ chapterId: 'c1' })).toBe(false);
      expect(isWebtoonPositionReport(null)).toBe(false);
    });
  });
});
