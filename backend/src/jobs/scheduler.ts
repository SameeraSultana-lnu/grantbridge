import cron from 'node-cron';
import { ingestFoundationRfps } from '../services/grantsIngestionService.js';

export function startScheduler() {
  // Daily ingest at 5:30 AM server time.
  cron.schedule('30 5 * * *', async () => {
    try {
      await ingestFoundationRfps();
      console.log('Scheduled ingest completed');
    } catch (error) {
      console.error('Scheduled ingest failed', error);
    }
  });
}
