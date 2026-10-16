// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { clearReturnTo, consumeReturnTo, rememberReturnTo } from './returnTo';

describe('returnTo', () => {
  beforeEach(() => sessionStorage.clear());

  it('remembers an internal path and returns it only once', () => {
    rememberReturnTo('/fabrics?tab=1');
    expect(consumeReturnTo()).toBe('/fabrics?tab=1');
    expect(consumeReturnTo()).toBe('/');
  });

  it.each([
    'https://evil.com',
    '//evil.com',
    '/\\evil.com',
    'javascript:alert(1)',
    'evil.com/fabrics',
    '',
  ])('rejects unsafe path %j', (target) => {
    rememberReturnTo(target);
    expect(consumeReturnTo()).toBe('/');
  });

  it('new login without a target clears the old target', () => {
    rememberReturnTo('/fabrics');
    rememberReturnTo(null);
    expect(consumeReturnTo()).toBe('/');
  });

  it('clearReturnTo clears the remembered target', () => {
    rememberReturnTo('/fabrics');
    clearReturnTo();
    expect(consumeReturnTo()).toBe('/');
  });
});