import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import type { OptimizationViewDto } from '../dto/optimization-view.dto.js';
import {
  buildTileGridPlan,
  computeBounds,
  getFabricPolygon,
  offsetPolygon,
} from './pdf-geometry.util.js';
import {
  type ClipBox,
  MM_TO_PT,
  drawLayoutVector,
  drawSummaryCoverPage,
  drawTileGuides,
} from './pdf-layout-renderer.js';

export type OptimizationPdfFormat = 'a4' | 'actual';

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

@Injectable()
export class OptimizationPdfService {
  async generate(
    view: OptimizationViewDto,
    format: OptimizationPdfFormat,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const buffer =
      format === 'actual'
        ? await this.renderTiledA4ActualPdf(view)
        : await this.renderA4ReportPdf(view);

    const baseName = this.sanitizeFilename(
      view.name ??
        view.pattern?.name ??
        `optimization-${view.id ?? view.runId ?? 'layout'}`,
    );
    const suffix = format === 'actual' ? '1-to-1-a4-tiles' : 'a4-preview';

    return {
      buffer,
      filename: `${baseName}-${suffix}.pdf`,
    };
  }

  private renderA4ReportPdf(view: OptimizationViewDto): Promise<Buffer> {
    const fabricPts = getFabricPolygon(view);
    const bounds = computeBounds([
      fabricPts,
      ...view.placements.map((p) => p.polygon),
    ]);
    const isLandscape = bounds.width > bounds.height * 1.15;

    const doc = this.createDocument(
      isLandscape,
      view.name ?? 'Optimization Layout (A4)',
    );

    return this.collectBuffer(doc, () => {
      doc.addPage({
        size: 'A4',
        layout: isLandscape ? 'landscape' : 'portrait',
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
      });

      drawSummaryCoverPage(doc, view);
      doc.end();
    });
  }

  private renderTiledA4ActualPdf(view: OptimizationViewDto): Promise<Buffer> {
    const totalAllowance = view.seamAllowanceMm + view.cuttingAllowanceMm;
    const activePolygons = view.placements
      .filter((p) => p.polygon.length >= 3)
      .map((p) =>
        totalAllowance > 0
          ? offsetPolygon(p.polygon, totalAllowance)
          : p.polygon,
      );

    const tileBounds = computeBounds(
      activePolygons.length > 0 ? activePolygons : [getFabricPolygon(view)],
    );

    const marginMm = 14;
    const plan = buildTileGridPlan(
      tileBounds,
      activePolygons,
      A4_WIDTH_MM - marginMm * 2,
      A4_HEIGHT_MM - marginMm * 2,
    );

    const fabricPts = getFabricPolygon(view);
    const fullBounds = computeBounds([
      fabricPts,
      ...view.placements.map((p) => p.polygon),
    ]);
    const summaryIsLandscape = fullBounds.width > fullBounds.height * 1.15;

    const doc = this.createDocument(
      summaryIsLandscape,
      `${view.name ?? 'Optimization Layout'} (1:1 A4 Tiled)`,
    );

    return this.collectBuffer(doc, () => {
      // Strona 1: Podsumowanie A4 z nałożoną siatką kafelków + kwadrat testowy 50x50 mm
      doc.addPage({
        size: 'A4',
        layout: summaryIsLandscape ? 'landscape' : 'portrait',
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
      });

      drawSummaryCoverPage(doc, view, { tileBounds, plan });

      // Strony 2..N: Czyste kafelki 1:1
      const marginPt = marginMm * MM_TO_PT;
      const tileWPt = plan.tileWmm * MM_TO_PT;
      const tileHPt = plan.tileHmm * MM_TO_PT;
      const tileClipBox: ClipBox = {
        minX: marginPt,
        minY: marginPt,
        maxX: marginPt + tileWPt,
        maxY: marginPt + tileHPt,
      };

      for (let row = 0; row < plan.rows; row++) {
        for (let col = 0; col < plan.cols; col++) {
          const pageNumber = plan.activeCells.get(`${row}:${col}`);
          if (pageNumber === undefined) continue;

          doc.addPage({
            size: 'A4',
            layout: plan.useLandscape ? 'landscape' : 'portrait',
            margins: { top: 0, bottom: 0, left: 0, right: 0 },
          });

          doc.save();
          doc.rect(marginPt, marginPt, tileWPt, tileHPt).clip();

          drawLayoutVector(
            doc,
            view,
            tileBounds,
            marginPt - col * tileWPt,
            marginPt - row * tileHPt,
            MM_TO_PT,
            false,
            false,
            tileClipBox,
          );
          doc.restore();

          drawTileGuides(
            doc,
            marginPt,
            tileWPt,
            tileHPt,
            row,
            col,
            pageNumber,
            plan.totalPages,
            plan.activeCells,
          );
        }
      }

      doc.end();
    });
  }

  private createDocument(
    isLandscape: boolean,
    title: string,
  ): PDFKit.PDFDocument {
    const doc = new PDFDocument({
      size: 'A4',
      layout: isLandscape ? 'landscape' : 'portrait',
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      autoFirstPage: false,
      info: { Title: title },
    });

    doc.on('pageAdded', () => {
      doc.page.margins = { top: 0, bottom: 0, left: 0, right: 0 };
    });

    return doc;
  }

  private collectBuffer(
    doc: PDFKit.PDFDocument,
    renderFn: () => void,
  ): Promise<Buffer> {
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    return new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      renderFn();
    });
  }

  private sanitizeFilename(raw: string): string {
    return (
      raw
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9_-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase() || 'optimization'
    );
  }
}
