import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import pg from 'pg';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
  console.warn('AVERTISSEMENT: SESSION_SECRET absent ou trop court. Configurez .env avant tout développement d’authentification.');
}
if (!process.env.DATABASE_URL) {
  console.warn('DATABASE_URL absent: les routes nécessitant PostgreSQL retourneront une erreur de configuration.');
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction ? { rejectUnauthorized: true } : undefined,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000
});

app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '100kb' }));
app.use(express.static(path.join(__dirname, '../public'), { extensions: ['html'] }));

app.get('/api/health', async (_req, res) => {
  let database = 'not_configured';
  if (process.env.DATABASE_URL) {
    try {
      await pool.query('SELECT 1');
      database = 'connected';
    } catch {
      database = 'unavailable';
    }
  }
  const ok = database === 'connected';
  res.status(ok ? 200 : 503).json({
    app: 'KingComics_En_Action',
    status: ok ? 'ok' : 'degraded',
    database,
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/api/version', (_req, res) => {
  res.json({ name: 'KCA', version: '0.2.0', stage: 'starter' });
});

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'route_not_implemented', message: 'Cette fonction sera ajoutée dans un prochain module.' });
});

app.use((err, _req, res, _next) => {
  console.error('Erreur serveur:', isProduction ? 'internal_error' : err.message);
  res.status(500).json({ error: 'internal_server_error' });
});

const server = app.listen(port, () => {
  console.log(`KCA starter démarré sur http://localhost:${port}`);
});

async function shutdown(signal) {
  console.log(`${signal}: arrêt de KCA...`);
  server.close(async () => {
    await pool.end().catch(() => {});
    process.exit(0);
  });
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
