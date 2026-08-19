import { Chapter } from '../../shared/bridge/series';
import { Strings } from '../../shared/i18n/strings';
import { chapterDisplayTitle } from '../../shared/transforms/chapter';

// BABY STEP 2: fração de progresso contínua, calculada no Kotlin por computeChapterFraction
// (peso de cada página proporcional à sua própria altura real, linha de leitura na borda de
// baixo do viewport) e repassada aqui via scrollFraction. Baby step 1 usava só pageIndex/
// totalPages (saltos por página inteira, sem granularidade); esse passo reintroduz o scroll
// dentro da página, mas usando o cálculo novo — não o antigo (landmarks por página isolada) que
// tinha os bugs de "10% atrasado"/"mesma % em posições diferentes".
export function progressBarFraction(scrollFraction: number): number {
  return Math.min(1, Math.max(0, scrollFraction));
}

export function chapterHeaderTitle(chapter: Chapter, t: Strings): string {
  return chapterDisplayTitle(chapter, t);
}

export function offlineBannerVisible(isOffline: boolean): boolean {
  return isOffline;
}
