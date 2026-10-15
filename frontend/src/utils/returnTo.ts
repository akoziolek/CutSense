const KEY = 'returnTo';

const isSafePath = (p: string | null | undefined): p is string =>
  !!p && p.startsWith('/') && !p.startsWith('//');

export function rememberReturnTo(path?: string | null) {
  if (isSafePath(path)) sessionStorage.setItem(KEY, path);
  else sessionStorage.removeItem(KEY);
}

export function consumeReturnTo(): string {
  const target = sessionStorage.getItem(KEY);
  sessionStorage.removeItem(KEY);
  return isSafePath(target) ? target : '/';
}