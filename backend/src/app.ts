import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { rateLimit } from 'express-rate-limit';
import path from 'node:path';
import fs from 'node:fs';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { authRouter } from './routes/auth.js';
import { deadlinesRouter } from './routes/deadlines.js';
import { draftsRouter } from './routes/drafts.js';
import { grantsRouter } from './routes/grants.js';
import { healthRouter } from './routes/health.js';
import { orgProfileRouter } from './routes/orgProfile.js';

export const app = express();

app.use(helmet());
app.use(cors({ origin: env.frontendOrigin }));
// 100 KB is sufficient; prevents large-payload denial-of-service
app.use(express.json({ limit: '100kb' }));
// Only log full request details in development
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

// Brute-force protection: max 15 auth attempts per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please try again in 15 minutes.' },
});

app.use('/api/health', healthRouter);
app.use('/api/auth', authLimiter, authRouter);
app.use('/api/org-profile', orgProfileRouter);
app.use('/api/grants', grantsRouter);
app.use('/api/drafts', draftsRouter);
app.use('/api/deadlines', deadlinesRouter);

const frontendDistPath = path.resolve(process.cwd(), '..', 'frontend', 'dist');
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get('/*splat', (_req, res) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

app.use(notFoundHandler);
app.use(errorHandler);
