import { Injectable, Inject, BadRequestException, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import * as schema from '../../db/schema/schema.js';
import { CreateOptimizationDto } from './dto/create-optimization.dto.js';

@Injectable()
export class OptimizationsService {
  constructor(
    @Inject('DRIZZLE') private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async createAndRun(dto: CreateOptimizationDto, userId: number) {
    const pattern = await this.db.query.patterns.findFirst({
      where: eq(schema.patterns.id, dto.patternId),
    });

    if (!pattern) {
      throw new NotFoundException('Selected pattern not found.');
    }

    // fabric source mapping
    let customFabricId: number | null = null;
    let fabricWidth: number | null = null;
    let fabricLength: number | null = null;

    if (dto.fabricSourceType === 'library') {
      if (!dto.fabricId) {
        throw new BadRequestException('Fabric ID is required when selecting from the library.');
      }
      const fabric = await this.db.query.fabrics.findFirst({
        where: eq(schema.fabrics.id, dto.fabricId),
      });
      if (!fabric) {
        throw new NotFoundException('Selected fabric from library not found.');
      }
      customFabricId = fabric.id;
    } else if (dto.fabricSourceType === 'custom') {
      if (!dto.customFabric) {
        throw new BadRequestException('Custom fabric dimensions are required.');
      }
      fabricWidth = dto.customFabric.width;
      fabricLength = dto.customFabric.height;
    }

    const [optimizationResult] = await this.db
      .insert(schema.optimizationResults)
      .values({
        name: dto.name,
        patternId: dto.patternId,
        algorithmId: dto.algorithmId,
        fabricWidth,
        fabricLength,
        customFabricId,
        seamAllowance: dto.seamAllowance,
        cuttingAllowance: dto.cuttingAllowance,
      })
      .returning();

    // trigger the optimization alg here
    // insert the resulting placed pieces into the `placed_pieces` table.

    return {
      message: 'Optimization created and executed successfully',
      optimizationId: optimizationResult.id,
    };
  }
}