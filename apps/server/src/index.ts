import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Application } from 'express';
import envConfig from './config/env';
import errorHandler from './middlewares/error-handler';
import CustomErrorHandler from './utils/custom-error-handler';
import { logger } from './utils/logger';
import routes from './routes';

const app: Application = express();

// middlewares
app.use(
  cors({
    origin: [envConfig.APP_URL],
    credentials: true,
    exposedHeaders: ['Content-Disposition'],
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());
app.use(express.text({ type: ['application/sdp', 'text/plain'] }));

// routes
app.use('/api/v1', routes);
app.use((_req, _res, next) => {
  next(CustomErrorHandler.notFound());
});

// error handler
app.use(errorHandler);

app.listen(envConfig.PORT, () => {
  logger.info(`Server is running on port ${envConfig.PORT}`);
});

export default app;
