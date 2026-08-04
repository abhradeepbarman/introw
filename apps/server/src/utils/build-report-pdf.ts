import { DIMENSIONS, DIMENSION_KEYS, type Rubric } from '@repo/common/validations';
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';

const PAGE: [number, number] = [595.28, 841.89];
const MARGIN = 56;
const CONTENT_WIDTH = PAGE[0] - MARGIN * 2;

const INK = rgb(0.09, 0.09, 0.11);
const MUTED = rgb(0.45, 0.45, 0.5);
const RULE = rgb(0.85, 0.85, 0.87);
const BRAND = rgb(0.02, 0.47, 0.34);

const REPLACEMENTS: Record<string, string> = {
  '‘': "'",
  '’': "'",
  '“': '"',
  '”': '"',
  '–': '-',
  '—': '-',
  '…': '...',
  ' ': ' ',
};

const sanitize = (text: string) =>
  text.replace(/[^\x20-\x7E]/g, (character) => REPLACEMENTS[character] ?? '');

const wrap = (text: string, font: PDFFont, size: number, maxWidth: number) => {
  const lines: string[] = [];

  for (const paragraph of text.split('\n')) {
    let line = '';

    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;

      if (font.widthOfTextAtSize(candidate, size) > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }

    lines.push(line);
  }

  return lines;
};

type Layout = {
  pdf: PDFDocument;
  page: PDFPage;
  y: number;
  regular: PDFFont;
  bold: PDFFont;
  italic: PDFFont;
};

const addPage = (layout: Layout) => {
  layout.page = layout.pdf.addPage(PAGE);
  layout.y = PAGE[1] - MARGIN;
};

const ensureRoom = (layout: Layout, needed: number) => {
  if (layout.y - needed < MARGIN) addPage(layout);
};

const gap = (layout: Layout, amount: number) => {
  layout.y -= amount;
};

type TextOptions = {
  font?: PDFFont;
  size?: number;
  color?: ReturnType<typeof rgb>;
  indent?: number;
  leading?: number;
};

const writeText = (layout: Layout, text: string, options: TextOptions = {}) => {
  const font = options.font ?? layout.regular;
  const size = options.size ?? 10.5;
  const leading = options.leading ?? size * 1.45;
  const indent = options.indent ?? 0;

  for (const line of wrap(sanitize(text), font, size, CONTENT_WIDTH - indent)) {
    ensureRoom(layout, leading);
    layout.page.drawText(line, {
      x: MARGIN + indent,
      y: layout.y - size,
      size,
      font,
      color: options.color ?? INK,
    });
    layout.y -= leading;
  }
};

const writeRule = (layout: Layout) => {
  ensureRoom(layout, 12);
  layout.page.drawRectangle({
    x: MARGIN,
    y: layout.y,
    width: CONTENT_WIDTH,
    height: 0.75,
    color: RULE,
  });
  layout.y -= 12;
};

const writeScoreBar = (layout: Layout, score: number) => {
  const width = 160;
  ensureRoom(layout, 10);

  layout.page.drawRectangle({ x: MARGIN, y: layout.y, width, height: 2.5, color: RULE });
  layout.page.drawRectangle({
    x: MARGIN,
    y: layout.y,
    width: (width * score) / 100,
    height: 2.5,
    color: BRAND,
  });

  layout.y -= 10;
};

export type ReportInput = {
  id: string;
  createdAt: Date;
  score: number;
  feedback: string;
  rubric: Rubric | null;
};

export const buildReportPdf = async (interview: ReportInput): Promise<Uint8Array> => {
  const pdf = await PDFDocument.create();

  const layout: Layout = {
    pdf,
    page: pdf.addPage(PAGE),
    y: PAGE[1] - MARGIN,
    regular: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
    italic: await pdf.embedFont(StandardFonts.HelveticaOblique),
  };

  pdf.setTitle(`Intervue report ${interview.id}`);
  pdf.setCreator('Intervue');

  writeText(layout, 'INTERVUE', { font: layout.bold, size: 9, color: BRAND });
  gap(layout, 6);
  writeText(layout, 'Interview report', { font: layout.bold, size: 22 });
  gap(layout, 4);
  writeText(layout, `${interview.createdAt.toUTCString()}   |   ${interview.id}`, {
    size: 8.5,
    color: MUTED,
  });

  gap(layout, 18);
  writeText(layout, `${interview.score} / 100`, { font: layout.bold, size: 34 });
  gap(layout, 2);
  writeScoreBar(layout, interview.score);
  gap(layout, 6);
  writeText(layout, 'OVERALL', { font: layout.bold, size: 8, color: MUTED });

  gap(layout, 20);

  if (interview.rubric) {
    writeText(layout, 'BREAKDOWN', { font: layout.bold, size: 8, color: MUTED });
    gap(layout, 8);
    writeRule(layout);

    for (const key of DIMENSION_KEYS) {
      const dimension = interview.rubric[key];

      ensureRoom(layout, 90);
      writeText(layout, DIMENSIONS[key].label, { font: layout.bold, size: 12.5 });
      gap(layout, 2);
      writeText(layout, dimension.assessed ? `${dimension.score} / 100` : 'Not assessed', {
        font: layout.bold,
        size: 9.5,
        color: dimension.assessed ? BRAND : MUTED,
      });
      gap(layout, 6);

      if (dimension.assessed) {
        writeScoreBar(layout, dimension.score);
        gap(layout, 4);
      }

      writeText(layout, dimension.summary, { color: MUTED });
      gap(layout, 8);

      for (const quote of dimension.evidence) {
        writeText(layout, `"${quote}"`, { font: layout.italic, size: 9.5, indent: 14 });
        gap(layout, 4);
      }

      if (dimension.evidence.length > 0) gap(layout, 4);

      if (dimension.strengths.length > 0) {
        writeText(layout, 'DID WELL', { font: layout.bold, size: 8, color: MUTED });
        gap(layout, 4);
        for (const item of dimension.strengths) {
          writeText(layout, `-  ${item}`, { size: 10, indent: 8 });
        }
        gap(layout, 6);
      }

      if (dimension.improvements.length > 0) {
        writeText(layout, 'WORK ON', { font: layout.bold, size: 8, color: MUTED });
        gap(layout, 4);
        for (const item of dimension.improvements) {
          writeText(layout, `-  ${item}`, { size: 10, indent: 8 });
        }
        gap(layout, 6);
      }

      gap(layout, 10);
      writeRule(layout);
    }
  }

  ensureRoom(layout, 80);
  writeText(layout, 'FEEDBACK', { font: layout.bold, size: 8, color: MUTED });
  gap(layout, 8);
  writeText(layout, interview.feedback, { size: 11, leading: 17 });

  return pdf.save();
};
