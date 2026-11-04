import { isChunkLoadError } from './chunk-load-recovery.service';

describe('isChunkLoadError', () => {
  it('recognises the chunk load errors of Chrome/Edge, Safari and Firefox', () => {
    expect(isChunkLoadError(new TypeError('Failed to fetch dynamically imported module: https://x/chunk-AB12CD34.js'))).toBeTrue();
    expect(isChunkLoadError(new TypeError('Importing a module script failed.'))).toBeTrue();
    expect(isChunkLoadError(new TypeError('error loading dynamically imported module: https://x/chunk-AB12CD34.js'))).toBeTrue();
  });

  it('ignores other navigation errors', () => {
    expect(isChunkLoadError(new Error('Cannot match any routes. URL Segment: x'))).toBeFalse();
    expect(isChunkLoadError(undefined)).toBeFalse();
    expect(isChunkLoadError('NG0203')).toBeFalse();
  });
});
