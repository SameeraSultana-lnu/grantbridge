import pg from 'pg';
import pgvector from 'pgvector/pg';
import { env } from '../config/env.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: env.databaseUrl,
});

pool.on('connect', (client) => {
  pgvector.registerTypes(client);
});
