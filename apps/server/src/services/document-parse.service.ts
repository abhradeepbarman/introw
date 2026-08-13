import { PDFParse } from 'pdf-parse';
import { CustomErrorHandler } from '../utils';

export const extractTextFromPDF = async (pdf: Buffer): Promise<string> => {
  const parser = new PDFParse({ data: pdf });

  try {
    const { text } = await parser.getText({ pageJoiner: '' });
    return text.trim();
  } catch {
    throw CustomErrorHandler.serverError('Could not extract text from PDF');
  } finally {
    await parser.destroy();
  }
};
