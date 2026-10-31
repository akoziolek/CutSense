import { Transform, plainToInstance, ClassConstructor } from 'class-transformer';

export function TransformJson() {
  return Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  });
}

export function TransformJsonToInstance<T>(cls: ClassConstructor<T>) {
  return Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed)
        ? plainToInstance(cls, parsed)
        : plainToInstance(cls, parsed);
    } catch {
      return value;
    }
  });
}