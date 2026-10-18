import React from 'react';
import { View } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { BookReaderScreen } from '../screens/book-reader';
import { ReaderScreen } from '../screens/reader';
import { useReaderKind } from './reader-entry.hooks';

type RouteParams = {
  Reader: { seriesId: string; chapterId: string; format?: string };
};

// The one route every "open this chapter" goes through (series screen, dashboard, notifications,
// deep links) decides which reader shows it: a chapter served as a book opens the book reader,
// anything else the image reader. Callers never choose, so none of them has to know about books.
export function ReaderEntry() {
  const route = useRoute<RouteProp<RouteParams, 'Reader'>>();
  const { seriesId, chapterId, format } = route.params ?? ({} as Partial<RouteParams['Reader']>);
  const kind = useReaderKind({ seriesId: seriesId ?? '', chapterId: chapterId ?? '', hint: format });

  // Until the format is known neither reader is mounted: the image reader would start loading
  // pages a book does not have.
  if (kind === 'loading') {return <View testID="reader-entry-loading" style={{ flex: 1 }} />;}
  return kind === 'book' ? <BookReaderScreen /> : <ReaderScreen />;
}
