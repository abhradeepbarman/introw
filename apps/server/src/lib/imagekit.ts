import ImageKit, { toFile } from '@imagekit/nodejs';
import { envConfig } from '../config';
import { CustomErrorHandler } from '../utils';

const imagekit = new ImageKit({ privateKey: envConfig.IMAGEKIT_PRIVATE_KEY });

export const uploadFile = async (
  file: Buffer,
  fileName: string,
  folder: string,
  mimeType: string
): Promise<string> => {
  const { url } = await imagekit.files.upload({
    file: await toFile(file, fileName, { type: mimeType }),
    fileName,
    folder,
  });

  if (!url) {
    throw CustomErrorHandler.serverError('Could not store the file');
  }

  return url;
};

