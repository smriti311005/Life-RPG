import mongoose from 'mongoose';

export async function connectDatabase(uri) {
  if (!uri) {
    throw new Error('MONGODB_URI is not set. Copy server/.env.example to server/.env.');
  }

  mongoose.set('strictQuery', true);

  mongoose.connection.on('disconnected', () => {
    console.warn('[db] disconnected');
  });
  mongoose.connection.on('reconnected', () => {
    console.log('[db] reconnected');
  });

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 15_000,
      autoIndex: process.env.NODE_ENV !== 'production',
    });
  } catch (error) {
    // Atlas reports several genuinely different problems through a handful of
    // opaque messages, so translate the common ones into the thing to change.
    throw new Error(
      `${describeConnectionFailure(error)}\n\nRun \`npm --workspace server run db:check\` for a step-by-step diagnosis.`,
    );
  }

  const { name, host } = mongoose.connection;
  console.log(`[db] connected to "${name}" at ${host}`);

  if (name === 'test') {
    console.warn(
      '[db] connected to the default "test" database — MONGODB_URI has no database ' +
        'name. Add one, e.g. .../life-rpg?retryWrites=true&w=majority',
    );
  }

  return mongoose.connection;
}

/** Turn a driver error into something that names what to go and fix. */
function describeConnectionFailure(error) {
  const message = String(error?.message ?? error).split('\n')[0];

  if (/bad auth|Authentication failed/i.test(message)) {
    return [
      'MongoDB rejected the credentials.',
      '  - Check the password in MONGODB_URI against Atlas -> Database Access.',
      '  - The database user password is NOT your Atlas account password.',
      '  - If it contains @ : / ? # or %, it must be percent-encoded.',
    ].join('\n');
  }

  if (/tlsv1 alert internal error|SSL alert number 80/i.test(message)) {
    return [
      'Atlas refused the TLS handshake.',
      '  - Almost always the IP allowlist: Atlas -> Network Access -> Add Current IP Address.',
      '  - A deployed API needs its host provider egress IPs added too.',
    ].join('\n');
  }

  if (/ETIMEDOUT|ServerSelectionError|timed out/i.test(message)) {
    return [
      'Could not reach the cluster before the timeout.',
      '  - Check Atlas -> Network Access allows this IP.',
      '  - Check the cluster is not paused.',
    ].join('\n');
  }

  if (/ECONNREFUSED/i.test(message)) {
    return [
      'Nothing is listening at that address.',
      '  - If this is a local server, start MongoDB.',
      '  - If this is Atlas, check the hostname in MONGODB_URI.',
    ].join('\n');
  }

  if (/ENOTFOUND|querySrv/i.test(message)) {
    return [
      'The cluster hostname did not resolve.',
      '  - Check it against the connection string shown in Atlas.',
      '  - Some networks block SRV lookups; try a different connection.',
    ].join('\n');
  }

  return `Could not connect to MongoDB: ${message}`;
}
