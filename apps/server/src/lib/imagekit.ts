import ImageKit, { toFile } from '@imagekit/nodejs';
import { RESUME_MIME_TYPE } from '@repo/common/validations';
import envConfig from '../config/env';
import CustomErrorHandler from '../utils/custom-error-handler';

const imagekit = new ImageKit({ privateKey: envConfig.IMAGEKIT_PRIVATE_KEY });

export const uploadResume = async (resume: Buffer, userId: string): Promise<string> => {
  const fileName = `${userId}-${Date.now()}.pdf`;

  const { url } = await imagekit.files.upload({
    file: await toFile(resume, fileName, { type: RESUME_MIME_TYPE }),
    fileName,
    folder: '/resumes',
  });

  if (!url) {
    throw CustomErrorHandler.serverError('Could not store the résumé');
  }

  return url;
};
