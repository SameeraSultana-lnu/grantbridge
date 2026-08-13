import dotenv from 'dotenv';

dotenv.config();

const useDatabase = String(process.env.USE_DATABASE ?? 'false').toLowerCase() === 'true';

// Only require DATABASE_URL when the database is actually enabled
if (useDatabase && !process.env.DATABASE_URL) {
  throw new Error('Missing required env var: DATABASE_URL (required when USE_DATABASE=true)');
}

const jwtSecret = process.env.JWT_SECRET ?? 'dev_jwt_secret_change_me';
if (process.env.NODE_ENV === 'production' && jwtSecret === 'dev_jwt_secret_change_me') {
  throw new Error('JWT_SECRET must be set to a strong random value in production');
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 8080),
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173',
  useDatabase,
  databaseUrl: process.env.DATABASE_URL ?? '',
  jwtSecret,
  openAiApiKey: process.env.OPENAI_API_KEY,
  openAiModel: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
  embeddingModel: process.env.EMBEDDING_MODEL ?? 'text-embedding-3-small',
  mockMode: String(process.env.MOCK_MODE ?? 'true').toLowerCase() === 'true',
};
