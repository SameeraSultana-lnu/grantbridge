import { app } from './app.js';
import { env } from './config/env.js';
import { initDb } from './db/initDb.js';
import { pool } from './db/pool.js';
import { startScheduler } from './jobs/scheduler.js';
import { ensureDemoUser } from './services/authFileStore.js';

async function bootstrap() {
  if (env.useDatabase) {
    await initDb();
  } else {
    await ensureDemoUser();
    console.log('Running without database (USE_DATABASE=false)');
  }
  startScheduler();

  app.listen(env.port, () => {
    console.log(`GrantBridge API listening on port ${env.port}`);
  });
}

bootstrap().catch(async (error) => {
  console.error('Failed to start server', error);
  await pool.end();
  process.exit(1);
});
