import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import {
  FabricSortOption,
  ListFabricsQueryDto,
} from './list-fabrics-query.dto.js';

const errorsFor = (query: Record<string, unknown>) =>
  validate(plainToInstance(ListFabricsQueryDto, query));

describe('ListFabricsQueryDto', () => {
  it('uses defaults when nothing is provided', async () => {
    const dto = plainToInstance(ListFabricsQueryDto, {});

    expect(await validate(dto)).toHaveLength(0);
    expect(dto).toMatchObject({
      page: 1,
      limit: 12,
      sort: FabricSortOption.DATE_DESC,
    });
  });

  it('converts query strings to numbers', async () => {
    const dto = plainToInstance(ListFabricsQueryDto, {
      page: '2',
      limit: '24',
      sort: 'name_asc',
    });

    expect(await validate(dto)).toHaveLength(0);
    expect(dto.page).toBe(2);
    expect(dto.limit).toBe(24);
    expect(dto.sort).toBe(FabricSortOption.NAME_ASC);
  });

  it.each(Object.values(FabricSortOption))('accepts sort "%s"', async (sort) => {
    expect(await errorsFor({ sort })).toHaveLength(0);
  });

  it.each([
    { page: '0' },
    { page: '-1' },
    { page: '1.5' },
    { page: 'abc' },
    { limit: '0' },
    { limit: '51' },
    { limit: 'abc' },
    { sort: 'nonsense' },
    { sort: 'name_asc; DROP TABLE fabrics' },
  ])('rejects %j', async (query) => {
    expect((await errorsFor(query)).length).toBeGreaterThan(0);
  });

  it('accepts the boundary values of limit', async () => {
    expect(await errorsFor({ limit: '1' })).toHaveLength(0);
    expect(await errorsFor({ limit: '50' })).toHaveLength(0);
  });
});