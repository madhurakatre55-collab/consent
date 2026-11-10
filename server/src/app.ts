import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { getDb } from './db/schema.js';
import circlesRouter from './routes/circles.js';
import mandatesRouter from './routes/mandates.js';
import proposalsRouter from './routes/proposals.js';
import consentsRouter from './routes/consents.js';
import paymentsRouter from './routes/payments.js';
import ledgerRouter from './routes/ledger.js';
import demoRouter from './routes/demo.js';
import agentsRouter from './routes/agents.js';
import blockchainRouter from './routes/blockchain.js';

export function createApp() {
  const app = express();

  // Security Headers Middleware
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // CORS & Body Parsing with strict size limits
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  // Mount API routes
  app.use('/api/circles', circlesRouter);
  app.use('/api/mandates', mandatesRouter);
  app.use('/api/proposals', proposalsRouter);
  app.use('/api/consents', consentsRouter);
  app.use('/api/payments', paymentsRouter);
  app.use('/api/ledger', ledgerRouter);
  app.use('/api/demo', demoRouter);
  app.use('/api/agents', agentsRouter);
  app.use('/api/blockchain', blockchainRouter);

  // Helper endpoint for active users list (allows switching personas in the demo UI)
  app.get('/api/users', async (req, res, next) => {
    try {
      const db = getDb();
      const usersRes = await db.execute('SELECT * FROM users ORDER BY name ASC');
      res.json(usersRes.rows);
    } catch (err: any) {
      next(err);
    }
  });

  // Health check with security and configuration status
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'Consent Engine API',
      timestamp: new Date().toISOString(),
      security: {
        headersEnabled: true,
        bodyLimit: '1mb',
        deterministicPolicyEngine: true,
        cryptographicChain: 'SHA-256',
      },
    });
  });

  // Serve production React static assets if built
  const webDistPath = path.resolve(process.cwd(), '../web/dist');
  const altWebDistPath = path.resolve(process.cwd(), './web/dist');
  const staticPath = fs.existsSync(webDistPath)
    ? webDistPath
    : fs.existsSync(altWebDistPath)
    ? altWebDistPath
    : null;

  if (staticPath) {
    app.use(express.static(staticPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.join(staticPath, 'index.html'));
    });
  }

  // Centralized Safe Error Handling Middleware
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled request error:', err);
    const status = typeof err.status === 'number' ? err.status : 500;
    res.status(status).json({
      error: err.message || 'Internal server error',
      code: err.code || 'INTERNAL_ERROR',
    });
  });

  return app;
}
