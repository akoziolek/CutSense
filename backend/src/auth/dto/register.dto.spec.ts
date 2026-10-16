import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { RegisterDto } from './register.dto.js';

const errorsFor = (nickname: unknown) =>
  validate(plainToInstance(RegisterDto, { nickname }));

describe('RegisterDto', () => {
  it.each(['ab', 'a'.repeat(21), 'ala kot', 'ala@', 'zażółć', ''])(
    'rejects "%s"',
    async (nickname) => {
      expect((await errorsFor(nickname)).length).toBeGreaterThan(0);
    },
  );

  it.each([undefined, null, 123])('rejects non-string %s', async (nickname) => {
    expect((await errorsFor(nickname)).length).toBeGreaterThan(0);
  });

  it.each(['Ala', 'ala_kot-1', 'a.b.c', 'abc', 'a'.repeat(20), '  Ala  '])(
    'accepts "%s"',
    async (nickname) => {
      expect(await errorsFor(nickname)).toHaveLength(0);
    },
  );

  it('returns a readable message for a bad format', async () => {
    const [error] = await errorsFor('x');
    expect(Object.values(error.constraints ?? {}).join(' ')).toContain(
      '3–20 characters',
    );
  });
});