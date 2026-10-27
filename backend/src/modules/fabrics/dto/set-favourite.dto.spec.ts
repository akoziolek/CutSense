import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { SetFavouriteDto } from './set-favourite.dto.js';

const errorsFor = (body: unknown) => validate(plainToInstance(SetFavouriteDto, body));

describe('SetFavouriteDto', () => {
  it.each([true, false])('accepts %s', async (isFavourite) => {
    expect(await errorsFor({ isFavourite })).toHaveLength(0);
  });

  it.each([{}, { isFavourite: 'true' }, { isFavourite: 1 }, { isFavourite: null }])(
    'rejects %j',
    async (body) => {
      expect((await errorsFor(body)).length).toBeGreaterThan(0);
    },
  );
});