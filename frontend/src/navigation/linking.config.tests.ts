import { getStateFromPath } from '@react-navigation/native';
import { linking } from './linking.config';
import { Routes } from './routes';

function resolve(url: string) {
  const path = url.replace('deeplink://', '');
  return getStateFromPath(path, linking.config);
}

describe('linking.config', () => {
  it('resolve deeplink://series/123 para SERIES_DETAIL com seriesId=123', () => {
    const state = resolve('deeplink://series/123');

    const route = state?.routes[0];
    expect(route?.name).toBe(Routes.SERIES_DETAIL);
    expect(route?.params).toEqual({ seriesId: '123' });
  });

  it('resolve deeplink://reader/123/456 para READER com seriesId e chapterId', () => {
    const state = resolve('deeplink://reader/123/456');

    const route = state?.routes[0];
    expect(route?.name).toBe(Routes.READER);
    expect(route?.params).toEqual({ seriesId: '123', chapterId: '456' });
  });

  it('prefixes contém apenas o scheme interno deeplink://', () => {
    expect(linking.prefixes).toEqual(['deeplink://']);
  });
});
