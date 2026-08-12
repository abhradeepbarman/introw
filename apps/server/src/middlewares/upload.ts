import { RESUME_MAX_BYTES, RESUME_MIME_TYPE } from '@repo/common/validations';
import type { NextFunction, Request, Response } from 'express';
import multer, { MulterError } from 'multer';
import CustomErrorHandler from '../utils/custom-error-handler';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: RESUME_MAX_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== RESUME_MIME_TYPE) {
      return cb(CustomErrorHandler.badRequest('Only PDF résumés are supported'));
    }
    cb(null, true);
  },
});

export const uploadResume = (req: Request, res: Response, next: NextFunction) => {
  upload.single('resume')(req, res, (err: unknown) => {
    if (err instanceof MulterError) {
      const message =
        err.code === 'LIMIT_FILE_SIZE'
          ? `Résumé must be under ${RESUME_MAX_BYTES / 1024 / 1024}MB`
          : 'Could not read the uploaded file';
      return next(CustomErrorHandler.badRequest(message));
    }

    next(err);
  });
};
