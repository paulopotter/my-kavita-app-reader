import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { WebView } from 'react-native-webview';
import { Routes, type NavOrigin } from '../../navigation/routes';
import { useStrings } from '../../shared/i18n';
import { useStyles, useTheme } from '../../shared/context';
import { createNavigateAction, useAction } from '../../shared/tools/actions';
import { ReaderPrefs, type ProgressBarPosition } from '../../shared/tools/reader';
import { ThinProgressBar } from '../../shared/components/thin-progress-bar';
import { BookDocumentTool, BookThemeTool } from '../../shared/tools/books';
import { BookReaderFooter, BookReaderSettingsSheet, BookReaderTopBar } from './components';
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
  // The page runs snippets from the hook (the infinite mode appends the next chapter that way).
  const webViewRef = useRef<WebView>(null);
  const inject = useCallback((script: string) => webViewRef.current?.injectJavaScript(script), []);
  const book = useBookReader({ seriesId, chapterId, seriesName, inject });
  const { realize } = useAction();

  // The same edge the image reader's thin progress bar uses — one preference for both readers.
  const [progressPosition, setProgressPosition] = useState<ProgressBarPosition | undefined>(undefined);
  useEffect(() => {
    ReaderPrefs.getProgressBarPosition()
      .then(setProgressPosition)
      .catch(() => {});
  }, []);

  const handleBack = useCallback(() => realize(book.backAction)(), [realize, book.backAction]);
  // The series name goes to the series, from wherever the reader was opened. It replaces the reader
  // so that back from the series lands where the reader was entered, not on the reader again.
  const openSeries = useCallback(
    () => realize(createNavigateAction({ route: Routes.SERIES_DETAIL, params: { seriesId }, canReplace: true }))(),
    [realize, seriesId],
  );

  const [settingsVisible, setSettingsVisible] = useState(false);

  // The page's own colours: a reading theme's palette, or the app's when the reader chose that.
  const pageColors = useMemo(
    () => BookThemeTool.colors({ theme: book.appearance.theme, appColors: colors }),
    [book.appearance.theme, colors],
  );

  // The document is rebuilt only when what it shows changes; a fresh nonce goes with each one.
  const document = useMemo(
    () =>
      book.status === 'ready'
        ? BookDocumentTool.build({
            html: book.html,
            colors: pageColors,
            fontScale: book.appearance.fontScale,
            fontFamily: book.appearance.fontFamily,
            lineSpacing: book.appearance.lineSpacing,
            margin: book.appearance.margin,
            justify: book.appearance.justify,
            infinite: book.infinite ? book.firstSection : undefined,
            restoreFraction: book.restoreFraction,
            nonce: makeNonce(),
          })
        : null,
    [book.status, book.html, book.appearance, book.restoreFraction, book.infinite, book.firstSection, pageColors],
  );

  return (
    <View style={[styles.root, { backgroundColor: pageColors.background }]} testID="book-reader">
      {document != null && (
        <WebView
          ref={webViewRef}
          testID="book-reader-webview"
          style={[styles.webview, { backgroundColor: pageColors.background }]}
          accessibilityLabel={book.chapterTitle}
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

      {book.status === 'ready' && !book.overlayVisible && (
        <ThinProgressBar fraction={book.chapterFraction} position={progressPosition} />
      )}

      <BookReaderTopBar
        seriesName={book.seriesName}
        pageIndicatorText={book.pageIndicator}
        onBack={handleBack}
        backLabel={t.commonBackLabel}
        onSeriesPress={openSeries}
        seriesLabel={t.readerOpenSeriesLabel}
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
          appearance: t.bookReaderAppearance,
        }}
        hasPrevChapter={book.hasPrevChapter}
        hasNextChapter={book.hasNextChapter}
        showPages={!book.infinite && book.pageCount > 1}
        hasPrevPage={book.hasPrevPage}
        hasNextPage={book.hasNextPage}
        onPrevChapter={book.goToPrevChapter}
        onNextChapter={book.goToNextChapter}
        onPrevPage={book.prevPage}
        onNextPage={book.nextPage}
        onSmallerText={() => book.changeFontScale('smaller')}
        onLargerText={() => book.changeFontScale('larger')}
        onOpenAppearance={() => setSettingsVisible(true)}
      />
      <BookReaderSettingsSheet
        visible={settingsVisible}
        appearance={book.appearance}
        mode={book.mode}
        t={t}
        onChangeMode={book.changeMode}
        onChange={book.updateAppearance}
        onClose={() => setSettingsVisible(false)}
      />
    </View>
  );
}
