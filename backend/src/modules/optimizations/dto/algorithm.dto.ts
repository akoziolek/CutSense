import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { LocalizedText } from '../../../db/schema/schema.js';

export class AlgorithmDto {
  @ApiProperty({ description: 'Unique identifier of the algorithm', example: 1 })
  id!: number;

  @ApiProperty({
    description: 'Algorithm name in Polish and English.',
    example: { pl: 'Szybki i prosty', en: 'Quick and Simple' },
  })
  name!: LocalizedText;

  @ApiPropertyOptional({
    description: 'Short description in Polish and English.',
    example: {
      pl: 'Umieszcza elementy, zaczynając od największych.',
      en: 'Places pieces starting from the largest.',
    },
  })
  description?: LocalizedText;
}
