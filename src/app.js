import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { errorHandler, notFound } from './middleware/errors.js';
import authRoutes from './modules/auth/routes.js';
import userRoutes from './modules/users/routes.js';
import recordRoutes from './modules/records/routes.js';
import cie10Routes from './modules/cie10/routes.js';
import importRoutes from './modules/imports/routes.js';
import reportRoutes from './modules/reports/routes.js';
import auditRoutes from './modules/audit/routes.js';
import settingRoutes from './modules/settings/routes.js';

export function crearApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || env.webOrigins.includes('*') || env.webOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(null, false);
      },
      credentials: true,
    })
  );
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(pinoHttp({ logger, autoLogging: env.nodeEnv !== 'test' }));

  app.get('/health', (_req, res) => {
    res.json({ ok: true, servicio: 'diagnosticos-api', entorno: env.nodeEnv });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/records', recordRoutes);
  app.use('/api/cie10', cie10Routes);
  app.use('/api/imports', importRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/audit', auditRoutes);
  app.use('/api/settings', settingRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
