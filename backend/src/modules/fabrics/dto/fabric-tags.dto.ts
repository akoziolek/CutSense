import { ApiProperty } from '@nestjs/swagger';
import type { LocalizedText } from '../../../db/schema/schema.js';

export class FabricTagDto {
  @ApiProperty({
    description: 'Unique tag ID',
    example: 1,
  })
  id!: number;

  @ApiProperty({
    description: 'Tag name in Polish and English.',
    example: { pl: 'bawełna', en: 'cotton' },
  })
  name!: LocalizedText;
}
