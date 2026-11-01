import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsInt, IsPositive } from 'class-validator';

export class BulkDeleteDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ArrayUnique()
  @IsInt({ each: true })
  @IsPositive({ each: true })
  @ApiProperty({ type: [Number], minItems: 1, maxItems: 100, example: [1, 2, 3] })
  ids!: number[];
}

export class BulkDeleteResponseDto {
  @ApiProperty({ type: [Number], description: 'IDs of the items that were actually deleted', example: [1, 2] })
  deletedIds!: number[];
}