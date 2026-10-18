import React, { useCallback, useMemo } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { WebView } from 'react-native-webview';
import type { NavOrigin } from '../../navigation/routes';
import { useStrings } from '../../shared/i18n';
import { useStyles, useTheme } from '../../shared/context';
import { ColorTool } from '../../shared/theme';
import { useAction } from '../../shared/tools/actions';
import { BookDocumentTool } from '../../shared/tools/books';
import { BookReaderFooter, BookReaderTopBar } from './components';
import { useBookReader } from './hooks';
import { makeNonce } from './book-reader.model';
import { bookReaderStyles } from './book-reader.styles';

type RouteParams = {
  Reader: { seriesId: string; chapterId: string; origin?: NavOrigin; seriesName?: string };
};

// Reads a chapter that the server serves as a book (an EPUB): zero domain logic. It reads the route
// params, renders what useBookReader exposes, and forwards what the WebView reports back to it.
export function BookReaderScreen() {
  const { colors } = useTheme();
  const styles = useStyles(bookReaderStyles);
  const t = useStrings();
  const route = useRoute<RouteProp<RouteParams, 'Reader'>>();
  const { seriesId, chapterId, seriesName } = route.params ?? {};
  const book = useBookReader({ seriesId, chapterId, seriesName });
  const { realize } = useAction();

  const handleBack = useCallback(() => realize(book.backAction)(), [realize, book.backAction]);

  // The document is rebuilt only when what it shows changes; a fresh nonce goes with each one.
  const document = useMemo(
    () =>
      book.status === 'ready'
        ? BookDocumentTool.build({
            html: book.html,
            background: ColorTool.to.hex(colors.surface.primary),
            text: ColorTool.to.hex(colors.text.primary),
            link: ColorTool.to.hex(colors.text.link.primary),
            fontScale: book.fontScale,
            restoreFraction: book.restoreFraction,
            nonce: makeNonce(),
          })
        : null,
    [book.status, book.html, book.fontScale, book.restoreFraction, colors],
  );

  return (
    <View style={styles.root} testID="book-reader">
      {document != null && (
        <WebView
          testID="book-reader-webview"
          style={styles.webview}
          source={{ html: document }}
          originWhitelist={['about:*']}
          javaScriptEnabled
          domStorageEnabled={false}
          allowFileAccess={false}
          setSupportMultipleWindows={false}
          onMessage={event => book.handleMessage(event.nativeEvent.data)}
        />
      )}

      {book.status === 'loading' && (
        <View style={styles.centered} pointerEvents="none">
          <ActivityIndicator size="large" color={colors.icon.primary} />
          <Text style={styles.message}>{t.bookReaderLoading}</Text>
        </View>
      )}

      {book.status === 'error' && (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{t.bookReaderError}</Text>
          <Pressable style={styles.button} onPress={book.retry} accessibilityRole="button">
            <Text style={styles.buttonText}>{t.bookReaderRetry}</Text>
          </Pressable>
        </View>
      )}

      <BookReaderTopBar
        seriesName={book.seriesName}
        chapterTitle={book.chapterTitle}
        pageIndicatorText={book.pageIndicator}
        onBack={handleBack}
        backLabel={t.commonBackLabel}
        visible={book.overlayVisible}
      />
      <BookReaderFooter
        visible={book.overlayVisible}
        labels={{
          prevChapter: t.readerPrevChapterButtonLabel,
          nextChapter: t.readerNextChapterButtonLabel,
          prevPage: t.bookReaderPrevPage,
          nextPage: t.bookReaderNextPage,
          smallerText: t.bookReaderFontSmaller,
          largerText: t.bookReaderFontLarger,
        }}
        hasPrevChapter={book.hasPrevChapter}
        hasNextChapter={book.hasNextChapter}
        showPages={book.pageCount > 1}
        hasPrevPage={book.hasPrevPage}
        hasNextPage={book.hasNextPage}
        onPrevChapter={book.goToPrevChapter}
        onNextChapter={book.goToNextChapter}
        onPrevPage={book.prevPage}
        onNextPage={book.nextPage}
        onSmallerText={() => book.changeFontScale('smaller')}
        onLargerText={() => book.changeFontScale('larger')}
      />
    </View>
  );
}
