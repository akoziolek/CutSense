import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsInt, IsPositive } from 'class-validator';

export class BulkDeleteFabricsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ArrayUnique()
  @IsInt({ each: true })
  @IsPositive({ each: true })
  ids!: number[];
}

export class BulkDeleteFabricsResponseDto {
  deletedIds!: number[];
}