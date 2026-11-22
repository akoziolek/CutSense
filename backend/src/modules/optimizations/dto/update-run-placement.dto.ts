import {
  IsInt,
  Min,
  IsNumber,
  IsArray,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdatedPiecePlacementDto {
  @IsInt()
  @Min(0)
  index!: number;

  @IsNumber()
  x!: number;

  @IsNumber()
  y!: number;
}

export class UpdateRunPlacementsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UpdatedPiecePlacementDto)
  placements!: UpdatedPiecePlacementDto[];
}
