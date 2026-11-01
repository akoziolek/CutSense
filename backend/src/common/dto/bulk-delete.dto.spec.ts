import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { BulkDeleteFabricsDto } from './bulk-delete-fabrics.dto.js';

const errorsFor = (body: unknown) => validate(plainToInstance(BulkDeleteFabricsDto, body));

describe('BulkDeleteFabricsDto', () => {
  it('accepts a list of ids', async () => {
    expect(await errorsFor({ ids: [1, 2, 3] })).toHaveLength(0);
  });

  it.each([
    {}, { ids: [] }, { ids: 'x' }, { ids: [0] }, { ids: [1.5] }, { ids: ['a'] },
    { ids: [1, 1] }, { ids: Array.from({ length: 101 }, (_, i) => i + 1) },
  ])('rejects %j', async (body) => {
    expect((await errorsFor(body)).length).toBeGreaterThan(0);
  });
});