import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Application } from 'express';
import envConfig from './config/env';
import errorHandler from './middlewares/error-handler';
import CustomErrorHandler from './utils/custom-error-handler';
import { logger } from './utils/logger';

const app: Application = express();

app.use(
  cors({
    origin: [envConfig.APP_URL],
    credentials: true,
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// routes
app.get('/', (_req, res) => {
  res.status(200).json({
    message: 'Welcome to the API',
  });
});
app.use((_req, _res, next) => {
  next(CustomErrorHandler.notFound());
});

app.use(errorHandler);

app.listen(envConfig.PORT, () => {
  logger.info(`Server is running on port ${envConfig.PORT}`);
});

export default app;
