export type PdfLang = 'pl' | 'en';

export interface PdfLabels {
  defaultTitle: string;
  algorithm: string;
  fabric: string;
  allowances: string;
  usedLength: string;
  remaining: string;
  usableScraps: string;
  waste: string;
  scale: string;
  legendLines: string;
  legendPieces: string;
  blueGrid: (activeCount: number) => string;
  test1to1: string;
  print100: string;
  pageOf: (pageNumber: number, totalPages: number) => string;
  up: string;
  down: string;
  left: string;
  right: string;
}

export const PDF_LABELS: Record<PdfLang, PdfLabels> = {
  en: {
    defaultTitle: 'Optimization Layout',
    algorithm: 'Algorithm',
    fabric: 'Fabric',
    allowances: 'Allowances',
    usedLength: 'Used length',
    remaining: 'Remaining',
    usableScraps: 'Usable scraps',
    waste: 'Waste',
    scale: 'Scale',
    legendLines: 'Solid: pattern   |   Thin: seam   |   Dashed: cutting',
    legendPieces: '#N: Pattern piece   |   M: Mirrored   |   °: Rotation angle',
    blueGrid: (activeCount) =>
      `Blue grid: A4 sheets (${activeCount} active pages, pages 2–${activeCount + 1})`,
    test1to1: 'TEST 1:1',
    print100: 'Print at 100%',
    pageOf: (pageNumber, totalPages) => `Page ${pageNumber}/${totalPages}`,
    up: 'UP',
    down: 'DOWN',
    left: 'LEFT',
    right: 'RIGHT',
  },
  pl: {
    defaultTitle: 'Układ optymalizacji',
    algorithm: 'Algorytm',
    fabric: 'Materiał',
    allowances: 'Naddatki',
    usedLength: 'Wykorzystana długość',
    remaining: 'Pozostało',
    usableScraps: 'Użyteczne ścinki',
    waste: 'Odpady',
    scale: 'Skala',
    legendLines: 'Ciągła: wykrój   |   Cienka: szew   |   Przerywana: cięcie',
    legendPieces: '#N: Element wykroju   |   M: Lustro   |   °: Kąt obrotu',
    blueGrid: (activeCount) =>
      `Niebieska siatka: arkusze A4 (aktywne strony: ${activeCount}, strony 2–${activeCount + 1})`,
    test1to1: 'TEST 1:1',
    print100: 'Drukuj w skali 100%',
    pageOf: (pageNumber, totalPages) => `Str. ${pageNumber}/${totalPages}`,
    up: 'GÓRA',
    down: 'DÓŁ',
    left: 'LEWO',
    right: 'PRAWO',
  },
};

export function getPdfLabels(lang: PdfLang = 'en'): PdfLabels {
  return PDF_LABELS[lang] ?? PDF_LABELS.en;
}
