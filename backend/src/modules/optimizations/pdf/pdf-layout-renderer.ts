import type { OptimizationViewDto } from '../dto/optimization-view.dto.js';
import {
  type Bounds,
  type TileGridPlan,
  computeBounds,
  formatPieceLabel,
  getFabricPolygon,
  getPolygonCentroid,
  getTileCode,
  offsetPolygon,
  toTuplePolygon,
} from './pdf-geometry.util.js';

export const MM_TO_PT = 72 / 25.4;

export const PDF_PALETTE = {
  inkPrimary: '#0F172A',
  inkSecondary: '#334155',
  inkMuted: '#64748B',
  borderLight: '#CBD5E1',
  gridLine: '#E2E8F0',
  fabricFill: '#FAFAFA',
  fabricStroke: '#334155',
  pieceFill: '#E2E8F0',
  pieceStroke: '#0F172A',
  seamStroke: '#94A3B8',
  cuttingStroke: '#475569',
  tileGuide: '#64748B',
  tileBadgeBg: '#F1F5F9',
  tileOverlayStroke: '#2563EB',
  tileOverlayBg: '#EFF6FF',
};

export interface ClipBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function drawSafeText(
  doc: PDFKit.PDFDocument,
  text: string,
  x: number,
  y: number,
  options: PDFKit.Mixins.TextOptions = {},
): void {
  doc.page.margins = { top: 0, bottom: 0, left: 0, right: 0 };
  doc.text(text, x, y, { ...options, lineBreak: false });
  doc.x = 0;
  doc.y = 0;
}

export function drawSummaryCoverPage(
  doc: PDFKit.PDFDocument,
  view: OptimizationViewDto,
  tiledContext?: { tileBounds: Bounds; plan: TileGridPlan },
): void {
  const fabricPts = getFabricPolygon(view);
  const fabricBounds = computeBounds([fabricPts]);
  const bounds = computeBounds([
    fabricPts,
    ...view.placements.map((p) => toTuplePolygon(p.polygon)),
  ]);

  const pageW = doc.page.width;
  const pageH = doc.page.height;
  const margin = 36;
  const contentW = pageW - margin * 2;

  const title = view.name ?? view.pattern?.name ?? 'Optimization Layout';
  doc.font('Helvetica-Bold').fontSize(15).fillColor(PDF_PALETTE.inkPrimary);
  drawSafeText(doc, title, margin, margin);

  doc.font('Helvetica').fontSize(9).fillColor(PDF_PALETTE.inkSecondary);
  // TODO use lang send from frontend
  drawSafeText(
    doc,
    `Algorithm: ${view.algorithmName.en}   |   Fabric: ${Math.round(fabricBounds.width)} x ${Math.round(fabricBounds.height)} mm   |   Allowances: ${view.seamAllowanceMm} / ${view.cuttingAllowanceMm} mm`,
    margin,
    margin + 20,
  );

  const statsY = margin + 38;

  if (view.stats) {
    doc.font('Helvetica').fontSize(9).fillColor(PDF_PALETTE.inkPrimary);
    drawSafeText(
      doc,
      `Remaining: ${view.stats.remainingFabricPercentage}%   |   Usable scraps: ${view.stats.usableScrapsPercentage}%   |   Waste: ${view.stats.wastePercentage}%`,
      margin,
      statsY,
    );
  }

  const rulerLeftSpace = 38;
  const rulerBottomSpace = 24;
  const drawTop = statsY + 24;
  const footerH = tiledContext ? 72 : 58;
  const availW = contentW - rulerLeftSpace;
  const availH = Math.max(
    120,
    pageH - drawTop - margin - footerH - rulerBottomSpace,
  );

  const scalePtPerMm = Math.min(availW / bounds.width, availH / bounds.height);
  const ratioDenominator = Math.max(1, MM_TO_PT / scalePtPerMm);

  const renderedW = bounds.width * scalePtPerMm;
  const renderedH = bounds.height * scalePtPerMm;
  const offsetX = margin + rulerLeftSpace + (availW - renderedW) / 2;
  const offsetY = drawTop + (availH - renderedH) / 2;

  drawLayoutVector(
    doc,
    view,
    bounds,
    offsetX,
    offsetY,
    scalePtPerMm,
    true,
    !tiledContext,
  );

  if (tiledContext) {
    drawTiledGridOverlay(
      doc,
      bounds,
      offsetX,
      offsetY,
      scalePtPerMm,
      tiledContext.tileBounds,
      tiledContext.plan,
    );
  }

  drawDimensionRulers(doc, bounds, offsetX, offsetY, scalePtPerMm);

  const footerY = pageH - margin - (tiledContext ? 54 : 40);
  doc
    .moveTo(margin, footerY - 6)
    .lineTo(pageW - margin, footerY - 6)
    .lineWidth(0.5)
    .strokeColor(PDF_PALETTE.borderLight)
    .stroke();

  doc.font('Helvetica-Bold').fontSize(9).fillColor(PDF_PALETTE.inkPrimary);
  drawSafeText(
    doc,
    `Scale 1 : ${ratioDenominator.toFixed(1)}`,
    margin,
    footerY,
  );

  doc.font('Helvetica').fontSize(8).fillColor(PDF_PALETTE.inkSecondary);
  drawSafeText(
    doc,
    'Solid: pattern   |   Thin: seam   |   Dashed: cutting',
    margin,
    footerY + 13,
  );
  drawSafeText(
    doc,
    '#N: Pattern piece   |   M: Mirrored   |   °: Rotation angle',
    margin,
    footerY + 25,
  );

  if (tiledContext) {
    const activeCount = tiledContext.plan.activeCells.size;
    doc
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor(PDF_PALETTE.tileOverlayStroke);
    drawSafeText(
      doc,
      `Blue grid: A4 sheets (${activeCount} active pages, pages 2–${activeCount + 1})`,
      margin,
      footerY + 37,
    );

    const realCalPt = 50 * MM_TO_PT;
    const realCalX = pageW - margin - realCalPt;
    const realCalY = pageH - margin - realCalPt;

    if (realCalY >= footerY - 2) {
      doc
        .rect(realCalX, realCalY, realCalPt, realCalPt)
        .fillAndStroke('#FFFFFF', PDF_PALETTE.inkPrimary);

      doc.font('Helvetica-Bold').fontSize(8).fillColor(PDF_PALETTE.inkPrimary);
      drawSafeText(doc, 'TEST 1:1', realCalX + 6, realCalY + 8);

      doc.font('Helvetica').fontSize(7.5).fillColor(PDF_PALETTE.inkSecondary);
      drawSafeText(doc, '50 x 50 mm', realCalX + 6, realCalY + 20);
      drawSafeText(doc, 'Print at 100%', realCalX + 6, realCalY + 31);
    }
  } else {
    const refBarMm = 100;
    const refBarPt = refBarMm * scalePtPerMm;
    if (refBarPt <= contentW * 0.35) {
      const barX = pageW - margin - refBarPt;
      const barY = footerY + 10;
      doc
        .moveTo(barX, barY)
        .lineTo(barX + refBarPt, barY)
        .lineWidth(1.5)
        .strokeColor(PDF_PALETTE.inkPrimary)
        .stroke();

      doc
        .moveTo(barX, barY - 3)
        .lineTo(barX, barY + 3)
        .moveTo(barX + refBarPt, barY - 3)
        .lineTo(barX + refBarPt, barY + 3)
        .lineWidth(1)
        .stroke();

      doc.font('Helvetica').fontSize(8).fillColor(PDF_PALETTE.inkSecondary);
      drawSafeText(doc, `${refBarMm} mm`, barX, barY + 5, {
        width: refBarPt,
        align: 'center',
      });
    }
  }
}

export function drawLayoutVector(
  doc: PDFKit.PDFDocument,
  view: OptimizationViewDto,
  bounds: Bounds,
  offsetX: number,
  offsetY: number,
  scalePtPerMm: number,
  fillPieces: boolean,
  drawGrid: boolean,
  clipBox?: ClipBox,
): void {
  const mapPt = ([x, y]: [number, number]): [number, number] => [
    offsetX + (x - bounds.minX) * scalePtPerMm,
    offsetY + (bounds.maxY - y) * scalePtPerMm,
  ];

  const fabricPts = getFabricPolygon(view).map(mapPt);
  if (fabricPts.length >= 3) {
    doc.save();
    tracePolygon(doc, fabricPts);
    doc.lineWidth(0.8);
    if (fillPieces) {
      doc.fillAndStroke(PDF_PALETTE.fabricFill, PDF_PALETTE.fabricStroke);
    } else {
      doc.strokeColor(PDF_PALETTE.fabricStroke).stroke();
    }
    doc.restore();
  }

  if (drawGrid) {
    const stepMm = getGridStepMm(bounds);
    const xTicks = getAxisTicks(bounds.width, stepMm);
    const yTicks = getAxisTicks(bounds.height, stepMm);
    const renderedW = bounds.width * scalePtPerMm;
    const renderedH = bounds.height * scalePtPerMm;

    doc.save();
    doc.lineWidth(0.35).dash(2, { space: 2 }).strokeColor(PDF_PALETTE.gridLine);

    for (const mm of xTicks) {
      if (mm <= 0 || Math.abs(mm - bounds.width) < 0.01) continue;
      const x = offsetX + mm * scalePtPerMm;
      doc
        .moveTo(x, offsetY)
        .lineTo(x, offsetY + renderedH)
        .stroke();
    }

    for (const mm of yTicks) {
      if (mm <= 0 || Math.abs(mm - bounds.height) < 0.01) continue;
      const y = offsetY + renderedH - mm * scalePtPerMm;
      doc
        .moveTo(offsetX, y)
        .lineTo(offsetX + renderedW, y)
        .stroke();
    }

    doc.undash().restore();
  }

  const totalAllowance = view.seamAllowanceMm + view.cuttingAllowanceMm;
  for (const placement of view.placements) {
    if (placement.polygon.length < 3) continue;

    if (view.cuttingAllowanceMm > 0 && totalAllowance > 0) {
      const cuttingPoly = offsetPolygon(
        toTuplePolygon(placement.polygon),
        totalAllowance,
      ).map(mapPt);
      if (cuttingPoly.length >= 3) {
        doc.save();
        tracePolygon(doc, cuttingPoly);
        doc
          .lineWidth(0.6)
          .dash(4, { space: 3 })
          .strokeColor(PDF_PALETTE.cuttingStroke)
          .stroke();
        doc.restore();
      }
    }

    if (view.seamAllowanceMm > 0) {
      const seamPoly = offsetPolygon(
        toTuplePolygon(placement.polygon),
        view.seamAllowanceMm,
      ).map(mapPt);
      if (seamPoly.length >= 3) {
        doc.save();
        tracePolygon(doc, seamPoly);
        doc.lineWidth(0.5).strokeColor(PDF_PALETTE.seamStroke).stroke();
        doc.restore();
      }
    }
  }

  const pieceTypeNumberById = new Map<number, number>();
  for (const placement of view.placements) {
    if (!pieceTypeNumberById.has(placement.patternPieceId)) {
      pieceTypeNumberById.set(
        placement.patternPieceId,
        pieceTypeNumberById.size + 1,
      );
    }
  }

  const activeBox: ClipBox = clipBox ?? {
    minX: 0,
    minY: 0,
    maxX: doc.page.width,
    maxY: doc.page.height,
  };

  view.placements.forEach((placement, idx) => {
    if (placement.polygon.length < 3) return;
    const mapped = toTuplePolygon(placement.polygon).map(mapPt);

    doc.save();
    tracePolygon(doc, mapped);
    doc.lineWidth(1.0);
    if (fillPieces) {
      doc
        .fillColor(PDF_PALETTE.pieceFill, 0.75)
        .strokeColor(PDF_PALETTE.pieceStroke)
        .fillAndStroke();
    } else {
      doc.strokeColor(PDF_PALETTE.pieceStroke).stroke();
    }
    doc.restore();

    const pieceNum =
      pieceTypeNumberById.get(placement.patternPieceId) ?? idx + 1;
    const label = formatPieceLabel(placement, pieceNum);
    const [cx, cy] = getPolygonCentroid(mapped);

    if (
      cx >= activeBox.minX &&
      cx <= activeBox.maxX &&
      cy >= activeBox.minY &&
      cy <= activeBox.maxY
    ) {
      doc
        .save()
        .font('Helvetica-Bold')
        .fontSize(fillPieces ? 7.5 : 9)
        .fillColor(PDF_PALETTE.inkPrimary);
      drawSafeText(doc, label, cx - 34, cy - 4.5, {
        width: 68,
        align: 'center',
      });
      doc.restore();
    }
  });
}

export function drawTileGuides(
  doc: PDFKit.PDFDocument,
  marginPt: number,
  tileWPt: number,
  tileHPt: number,
  row: number,
  col: number,
  pageNumber: number,
  totalPages: number,
  activeCells: Map<string, number>,
): void {
  doc.save();

  doc
    .rect(marginPt, marginPt, tileWPt, tileHPt)
    .lineWidth(0.8)
    .dash(4, { space: 3 })
    .strokeColor(PDF_PALETTE.tileGuide)
    .stroke()
    .undash();

  const corners: [number, number][] = [
    [marginPt, marginPt],
    [marginPt + tileWPt, marginPt],
    [marginPt, marginPt + tileHPt],
    [marginPt + tileWPt, marginPt + tileHPt],
  ];

  const tick = 10;
  doc.lineWidth(0.9).strokeColor(PDF_PALETTE.inkPrimary);
  for (const [cx, cy] of corners) {
    doc
      .moveTo(cx - tick, cy)
      .lineTo(cx + tick, cy)
      .moveTo(cx, cy - tick)
      .lineTo(cx, cy + tick)
      .stroke();
    doc.circle(cx, cy, 4).stroke();
  }

  const currentCode = getTileCode(row, col);
  const badgeW = 96;
  const badgeH = 24;
  const badgeX = marginPt + tileWPt - badgeW - 8;
  const badgeY = marginPt + 8;

  doc
    .rect(badgeX, badgeY, badgeW, badgeH)
    .fillAndStroke(PDF_PALETTE.tileBadgeBg, PDF_PALETTE.inkSecondary);

  doc.font('Helvetica-Bold').fontSize(11).fillColor(PDF_PALETTE.inkPrimary);
  drawSafeText(doc, currentCode, badgeX + 8, badgeY + 6);

  doc.font('Helvetica').fontSize(8.5).fillColor(PDF_PALETTE.inkSecondary);
  drawSafeText(
    doc,
    `Page ${pageNumber}/${totalPages}`,
    badgeX + 34,
    badgeY + 7,
    {
      width: badgeW - 42,
      align: 'right',
    },
  );

  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(PDF_PALETTE.inkPrimary);

  if (activeCells.has(`${row - 1}:${col}`)) {
    const topCode = getTileCode(row - 1, col);
    drawSafeText(
      doc,
      `UP: ${topCode}`,
      marginPt + tileWPt / 2 - 40,
      marginPt - 18,
      {
        width: 80,
        align: 'center',
      },
    );
  }

  if (activeCells.has(`${row + 1}:${col}`)) {
    const bottomCode = getTileCode(row + 1, col);
    drawSafeText(
      doc,
      `DOWN: ${bottomCode}`,
      marginPt + tileWPt / 2 - 45,
      marginPt + tileHPt + 7,
      {
        width: 90,
        align: 'center',
      },
    );
  }

  if (activeCells.has(`${row}:${col - 1}`)) {
    const leftCode = getTileCode(row, col - 1);
    doc.save();
    doc.translate(marginPt - 14, marginPt + tileHPt / 2 + 25);
    doc.rotate(-90);
    drawSafeText(doc, `LEFT: ${leftCode}`, 0, 0, {
      width: 50,
      align: 'center',
    });
    doc.restore();
  }

  if (activeCells.has(`${row}:${col + 1}`)) {
    const rightCode = getTileCode(row, col + 1);
    doc.save();
    doc.translate(marginPt + tileWPt + 14, marginPt + tileHPt / 2 - 25);
    doc.rotate(90);
    drawSafeText(doc, `RIGHT: ${rightCode}`, 0, 0, {
      width: 50,
      align: 'center',
    });
    doc.restore();
  }

  doc.restore();
}

function drawTiledGridOverlay(
  doc: PDFKit.PDFDocument,
  fullBounds: Bounds,
  offsetX: number,
  offsetY: number,
  scalePtPerMm: number,
  tileBounds: Bounds,
  plan: TileGridPlan,
): void {
  const { tileWmm, tileHmm, rows, cols, activeCells } = plan;

  const toPreviewX = (mmX: number) =>
    offsetX + (mmX - fullBounds.minX) * scalePtPerMm;
  const toPreviewY = (mmY: number) =>
    offsetY + (fullBounds.maxY - mmY) * scalePtPerMm;

  doc.save();

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cellMinX = tileBounds.minX + c * tileWmm;
      const cellMaxX = cellMinX + tileWmm;
      const cellMaxY = tileBounds.maxY - r * tileHmm;
      const cellMinY = cellMaxY - tileHmm;

      const x = toPreviewX(cellMinX);
      const y = toPreviewY(cellMaxY);
      const w = (cellMaxX - cellMinX) * scalePtPerMm;
      const h = (cellMaxY - cellMinY) * scalePtPerMm;

      const isActive = activeCells.has(`${r}:${c}`);

      if (!isActive) {
        doc.save().rect(x, y, w, h).fillColor('#94A3B8', 0.12).fill().restore();
      }

      doc
        .rect(x, y, w, h)
        .lineWidth(isActive ? 0.7 : 0.4)
        .dash(3, { space: 2 })
        .strokeColor(
          isActive ? PDF_PALETTE.tileOverlayStroke : PDF_PALETTE.borderLight,
        )
        .stroke()
        .undash();

      const code = isActive ? getTileCode(r, c) : '—';
      const badgeW = Math.min(w - 2, isActive ? 22 : 14);
      const badgeH = Math.min(h - 2, 11);

      if (badgeW >= 12 && badgeH >= 9) {
        doc
          .rect(x + 1.5, y + 1.5, badgeW, badgeH)
          .fillAndStroke(
            isActive ? PDF_PALETTE.tileOverlayBg : '#F8FAFC',
            isActive ? PDF_PALETTE.tileOverlayStroke : PDF_PALETTE.borderLight,
          );

        doc
          .font(isActive ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(6.5)
          .fillColor(
            isActive ? PDF_PALETTE.tileOverlayStroke : PDF_PALETTE.inkMuted,
          );

        drawSafeText(doc, code, x + 1.5, y + 3, {
          width: badgeW,
          align: 'center',
        });
      }
    }
  }

  doc.restore();
}

function drawDimensionRulers(
  doc: PDFKit.PDFDocument,
  bounds: Bounds,
  offsetX: number,
  offsetY: number,
  scalePtPerMm: number,
): void {
  const stepMm = getGridStepMm(bounds);
  const xTicks = getAxisTicks(bounds.width, stepMm);
  const yTicks = getAxisTicks(bounds.height, stepMm);

  const renderedW = bounds.width * scalePtPerMm;
  const renderedH = bounds.height * scalePtPerMm;

  doc.save();
  doc
    .lineWidth(0.5)
    .strokeColor(PDF_PALETTE.inkMuted)
    .fillColor(PDF_PALETTE.inkMuted)
    .font('Helvetica')
    .fontSize(6.5);

  const bottomY = offsetY + renderedH + 4;
  doc
    .moveTo(offsetX, bottomY)
    .lineTo(offsetX + renderedW, bottomY)
    .stroke();

  for (const mm of xTicks) {
    const x = offsetX + mm * scalePtPerMm;
    const isEnd = Math.abs(mm - bounds.width) < 0.01;
    doc
      .moveTo(x, bottomY)
      .lineTo(x, bottomY + (isEnd ? 5 : 3.5))
      .stroke();
    doc
      .font(isEnd ? 'Helvetica-Bold' : 'Helvetica')
      .text(`${Math.round(mm)}`, x - 16, bottomY + 6, {
        width: 32,
        align: 'center',
        lineBreak: false,
      });
  }

  const leftX = offsetX - 4;
  doc
    .moveTo(leftX, offsetY)
    .lineTo(leftX, offsetY + renderedH)
    .stroke();

  for (const mm of yTicks) {
    const y = offsetY + renderedH - mm * scalePtPerMm;
    const isEnd = Math.abs(mm - bounds.height) < 0.01;
    doc
      .moveTo(leftX, y)
      .lineTo(leftX - (isEnd ? 5 : 3.5), y)
      .stroke();
    doc
      .font(isEnd ? 'Helvetica-Bold' : 'Helvetica')
      .text(`${Math.round(mm)}`, leftX - 36, y - 3.5, {
        width: 30,
        align: 'right',
        lineBreak: false,
      });
  }

  doc.restore();
}

function getAxisTicks(maxMm: number, stepMm: number): number[] {
  const ticks: number[] = [];
  for (let mm = 0; mm < maxMm; mm += stepMm) {
    ticks.push(mm);
  }
  const lastTick = ticks.at(-1) ?? 0;
  if (ticks.length > 1 && maxMm - lastTick < stepMm * 0.65) {
    ticks[ticks.length - 1] = maxMm;
  } else if (maxMm - lastTick > 0.5) {
    ticks.push(maxMm);
  }
  return ticks;
}

function getGridStepMm(bounds: Bounds): number {
  const maxDim = Math.max(bounds.width, bounds.height);
  return maxDim <= 500 ? 50 : maxDim <= 1500 ? 100 : maxDim <= 3000 ? 250 : 500;
}

function tracePolygon(doc: PDFKit.PDFDocument, pts: [number, number][]): void {
  const [first, ...rest] = pts;
  if (!first) return;
  doc.moveTo(first[0], first[1]);
  for (const [x, y] of rest) {
    doc.lineTo(x, y);
  }
  doc.closePath();
}
