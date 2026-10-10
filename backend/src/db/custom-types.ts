import { customType } from 'drizzle-orm/pg-core';

export const postgisPolygon = customType<{ data: string }>({
  dataType() {
    return 'geometry(Polygon, 0)';
  },
});
