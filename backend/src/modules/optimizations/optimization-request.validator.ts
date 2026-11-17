import { RequestValidationException } from '../../common/exceptions/request-validation.exception.js';
import type { CreateOptimizationDto } from './dto/create-optimization.dto.js';
import { MAX_TOTAL_COPIES } from './optimizations.constants.js';

const isSet = (value: unknown) => value !== undefined && value !== null;

export function assertValidOptimizationRequest(
  dto: CreateOptimizationDto,
  currentUserId?: number,
): void {
  const hasLibraryFabric = isSet(dto.fabricId);
  const hasWidth = isSet(dto.fabricWidthMm);
  const hasLength = isSet(dto.fabricLengthMm);

  if (!currentUserId && hasLibraryFabric) {
    throw new RequestValidationException(
      'Guests can only optimize using custom fabric dimensions.',
    );
  }
  if (hasLibraryFabric && (hasWidth || hasLength)) {
    throw new RequestValidationException(
      'Choose either a fabric from the library or custom dimensions, not both.',
    );
  }
  if (!hasLibraryFabric && !(hasWidth && hasLength)) {
    throw new RequestValidationException(
      'Provide a fabric from the library or both the custom width and length.',
    );
  }
  if (dto.pieces.some((piece) => piece.normalCount + piece.mirroredCount < 1)) {
    throw new RequestValidationException(
      'Every piece needs at least one normal or mirrored copy.',
    );
  }
  const totalCopies = dto.pieces.reduce(
    (sum, p) => sum + p.normalCount + p.mirroredCount,
    0,
  );
  if (totalCopies > MAX_TOTAL_COPIES) {
    throw new RequestValidationException(
      `At most ${MAX_TOTAL_COPIES} piece copies can be optimized at once.`,
    );
  }
}
