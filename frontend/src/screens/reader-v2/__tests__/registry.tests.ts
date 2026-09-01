import { READER_MODE_ADAPTERS, webtoonAdapter } from '../modes';

test('adapter registry resolves webtoon (no module-init cycle breakage)', () => {
  expect(webtoonAdapter).toBeDefined();
  expect(READER_MODE_ADAPTERS.webtoon).toBe(webtoonAdapter);
  expect(typeof READER_MODE_ADAPTERS.webtoon.interpretPositionReport).toBe('function');
  expect(typeof READER_MODE_ADAPTERS.webtoon.toRenderModel).toBe('function');
});
