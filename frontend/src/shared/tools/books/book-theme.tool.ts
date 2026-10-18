import type { Strings } from '../../i18n';
import { ColorTool, readingPalettes } from '../../theme';
import type { ReadingThemeName, ThemeColors } from '../../theme';
import type { BookDocumentColors } from './book-document.tool';

// Turns a reading theme NAME into what draws it. A fixed theme is a palette of its own; 'app' means
// "the page wears the active app theme", which only the caller's colours can answer.
export const BookThemeTool = {
  colors({ theme, appColors }: { theme: ReadingThemeName; appColors: ThemeColors }): BookDocumentColors {
    if (theme === 'app') {
      return {
        background: ColorTool.to.hex(appColors.surface.primary),
        text: ColorTool.to.hex(appColors.text.primary),
        link: ColorTool.to.hex(appColors.text.link.primary),
      };
    }
    return readingPalettes[theme];
  },

  labelOf(theme: ReadingThemeName, t: Strings): string {
    switch (theme) {
      case 'app': return t.bookReaderThemeApp;
      case 'paper': return t.bookReaderThemePaper;
      case 'sepia': return t.bookReaderThemeSepia;
      case 'gray': return t.bookReaderThemeGray;
      case 'green': return t.bookReaderThemeGreen;
      case 'dark': return t.bookReaderThemeDark;
      case 'night': return t.bookReaderThemeNight;
      case 'black': return t.bookReaderThemeBlack;
      case 'contrast': return t.bookReaderThemeContrast;
    }
  },
};
