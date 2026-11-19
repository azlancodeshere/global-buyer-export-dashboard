/**
 * Vercel entry point.
 *
 * Vercel's zero-config Express detection only looks for an `app`, `index` or
 * `server` file at the project root (or under `src/`), so this file exposes
 * the Express app that actually lives in `server/index.ts`.
 * See: https://vercel.com/docs/frameworks/backend/express
 */
import 'dotenv/config';
import express from 'express';

import app from './server/index.js';

// Referenced so the `express` import is intentional (detection requirement).
void express;

export default app;
