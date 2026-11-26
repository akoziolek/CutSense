import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';

export class SetRatingDto {
  @ApiProperty({ description: 'Star rating', minimum: 1, maximum: 5, example: 4 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;
}

export class PatternRatingDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ description: 'Rating given by the current user', example: 4 })
  userRating!: number;

  @ApiProperty({ description: 'Number of ratings of the pattern', example: 12 })
  starCount!: number;

  @ApiProperty({ description: 'Average rating', example: '4.43' })
  starAverage!: string;
}