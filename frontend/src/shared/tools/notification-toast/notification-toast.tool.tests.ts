import { NotificationToastTool } from './notification-toast.tool';
import { allStrings } from '../../i18n';
import type { NotificationHistoryItem } from '../../bridge';

const t = allStrings['pt-BR'];

function item(over: Partial<NotificationHistoryItem> & { blurred?: boolean } = {}) {
  return {
    id: 'h1',
    seriesId: 's1',
    seriesName: 'Série Um',
    detectedAtMs: 1,
    read: false,
    createdAtLocalMs: 1,
    ...over,
  };
}

describe('NotificationToastTool.summarize', () => {
  it('one chapter of one series: the pill carries that series’ own message, and the tap opens the chapter', () => {
    const { groups, headline } = NotificationToastTool.summarize({ items: [item({ chapterId: 'c1', chapterNumber: '12' })], t });
    expect(groups).toEqual([
      { seriesId: 's1', seriesName: 'Série Um', bodyText: 'Capítulo 12 disponível', chapterId: 'c1', blurred: false },
    ]);
    expect(headline).toEqual({ title: 'Série Um', subtitle: 'Capítulo 12 disponível', blurred: false });
  });

  it('a chapter without a number says "new chapter"', () => {
    const { groups } = NotificationToastTool.summarize({ items: [item({ chapterId: 'c1' })], t });
    expect(groups[0].bodyText).toBe('Novo capítulo disponível');
  });

  it('several chapters of one series are one group counted together, and the tap opens the series', () => {
    const items = [item({ id: 'a', chapterId: 'c1' }), item({ id: 'b', chapterId: 'c2' }), item({ id: 'c', chapterId: 'c3' })];
    const { groups, headline } = NotificationToastTool.summarize({ items, t });
    expect(groups).toHaveLength(1);
    expect(groups[0].bodyText).toBe('3 novos capítulos disponíveis');
    expect(groups[0].chapterId).toBeUndefined();
    expect(headline.title).toBe('Série Um');
  });

  it('several series: the pill only counts them, and the list has one group per series in arrival order', () => {
    const items = [
      item({ id: 'a', seriesId: 's1', seriesName: 'Um' }),
      item({ id: 'b', seriesId: 's2', seriesName: 'Dois' }),
      item({ id: 'c', seriesId: 's1', seriesName: 'Um' }),
    ];
    const { groups, headline } = NotificationToastTool.summarize({ items, t });
    expect(groups.map(g => g.seriesId)).toEqual(['s1', 's2']);
    expect(headline).toEqual({ title: '2 novas notificações' });
  });

  it('a group is blurred as soon as one of its rows is', () => {
    const items = [item({ id: 'a' }), item({ id: 'b', blurred: true })];
    expect(NotificationToastTool.summarize({ items, t }).groups[0].blurred).toBe(true);
  });
});
