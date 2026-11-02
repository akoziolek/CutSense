import { IsArray, IsEnum, IsInt, IsNumber, IsOptional, IsPositive, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ElementConfigDto {
  @IsInt() @IsPositive() patternPieceId!: number;
  @IsInt() @Min(0) normalCount!: number;
  @IsInt() @Min(0) mirroredCount!: number;
  @IsInt() rotationAngle!: number;
}

export class CreateOptimizationDto {
  @IsString() name!: string;

  @IsInt() @IsPositive() patternId!: number;

  @IsEnum(['custom', 'library']) fabricSourceType!: 'custom' | 'library';

  @IsOptional() @IsInt() fabricId?: number;

  @IsOptional()
  @Type(() => Object)
  customFabric?: {
    width: number;
    height: number;
  };

  @IsNumber() @Min(0) seamAllowance!: number;    
  @IsNumber() @Min(0) cuttingAllowance!: number;

  @IsArray() @ValidateNested({ each: true }) @Type(() => ElementConfigDto)
  elements!: ElementConfigDto[];

  @IsInt() algorithmId!: number;
}