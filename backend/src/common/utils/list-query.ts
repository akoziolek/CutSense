import { RequestValidationException } from '../exceptions/request-validation.exception.js';

const escapeLike = (text: string) => text.replace(/[\\%_]/g, '\\$&');

export const likePattern = (term?: string): string | undefined => {
  const trimmed = term?.trim();
  return trimmed ? `%${escapeLike(trimmed)}%` : undefined;
};

export const assertDateRange = (from?: string, to?: string) => {
  if (from && to && new Date(from) > new Date(to)) {
    throw new RequestValidationException('createdFrom must not be later than createdTo.');
  }
};