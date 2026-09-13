import 'dotenv/config';
import mongoose from 'mongoose';
import app, { ensureInitialized } from './app.js';

const PORT = Number(process.env.PORT) || 4000;

async function start() {
  await ensureInitialized();

  const server = app.listen(PORT, () => {
    console.log(`[api] listening on http://localhost:${PORT}`);
  });

  const shutdown = async (signal) => {
    console.log(`\n[api] ${signal} received, closing`);
    server.close(async () => {
      await mongoose.connection.close();
      process.exit(0);
    });
    // Do not hang forever on a stuck connection.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((err) => {
  console.error('[api] failed to start:', err.message);
  process.exit(1);
});

export default app;
