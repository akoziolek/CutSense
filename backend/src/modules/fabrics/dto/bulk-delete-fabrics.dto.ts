import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsInt, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BulkDeleteFabricsDto {
    @IsArray()
    @ArrayMinSize(1)
    @ArrayMaxSize(100)
    @ArrayUnique()
    @IsInt({ each: true })
    @IsPositive({ each: true })
    @ApiProperty({ type: [Number], minItems: 1, maxItems: 100, example: [1, 2, 3] })
    ids!: number[];
}

export class BulkDeleteFabricsResponseDto {
    @ApiProperty({ type: [Number], description: 'IDs of the fabrics that were actually deleted', example: [1, 2] })
    deletedIds!: number[];
}