import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { ListPatternsQueryDto } from './list-patterns-query.dto.js';

describe('ListPatternsQueryDto', () => {
  it.each([
    ['comma-separated sizes', { sizes: 'S,M' }, ['S', 'M']],
    ['repeated sizes', { sizes: ['S', 'M'] }, ['S', 'M']],
    ['one size', { sizes: 'XL' }, ['XL']],
  ])('accepts %s', async (_description, query, expectedSizes) => {
    const dto = plainToInstance(ListPatternsQueryDto, query);

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.sizes).toEqual(expectedSizes);
  });

  it('rejects unsupported sizes', async () => {
    const dto = plainToInstance(ListPatternsQueryDto, { sizes: 'INVALID' });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toContain('sizes');
  });
});
