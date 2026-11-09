import dotenv from 'dotenv';
import path from 'path';

// Attempt to load .env from workspace root or current directory
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config();

const resolvedDbPath = process.cwd().includes('server')
  ? path.resolve('./consent.db')
  : path.resolve('./server/consent.db');

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  llmProvider: process.env.LLM_PROVIDER || 'mock',
  llmApiKey: process.env.LLM_API_KEY || '',
  llmModel: process.env.LLM_MODEL || 'gemini-1.5-flash',
  paypalClientId: process.env.PAYPAL_CLIENT_ID || '',
  paypalClientSecret: process.env.PAYPAL_CLIENT_SECRET || '',
  paypalEnv: process.env.PAYPAL_ENV || 'sandbox',
  paypalBaseUrl: 'https://api-m.sandbox.paypal.com',
  demoMode: process.env.DEMO_MODE !== 'false',
  databaseUrl: process.env.DATABASE_URL || `file:${resolvedDbPath.replace(/\\/g, '/')}`,
};
