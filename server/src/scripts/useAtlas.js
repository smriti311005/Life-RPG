import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';

/**
 * Point the app at MongoDB Atlas.
 *
 *   npm --workspace server run db:use-atlas
 *
 * Prompts for the cluster host and the database-user password, checks that the
 * credentials actually work *before* touching anything, then rewrites
 * MONGODB_URI in server/.env.
 *
 * The password is read with echo off, never passed as a command-line argument
 * (argv is visible to other processes and lands in shell history), and never
 * printed. It goes straight into .env, which is gitignored.
 */

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ENV_PATH = path.resolve(HERE, '../../.env');

const ask = (question) =>
  new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });

/** Prompt without echoing what is typed. */
const askSecret = (question) =>
  new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const onData = (char) => {
      // Stop muting once the line is submitted.
      if ([`\n`, `\r`, ``].includes(String(char))) {
        process.stdin.removeListener('data', onData);
        return;
      }
      readline.clearLine(process.stdout, 0);
      readline.cursorTo(process.stdout, 0);
      process.stdout.write(question);
    };

    process.stdout.write(question);
    process.stdin.on('data', onData);

    rl.question('', (answer) => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer.trim());
    });
  });

function buildUri({ host, user, password, database }) {
  const params = new URLSearchParams({ retryWrites: 'true', w: 'majority' });
  // Percent-encode both halves: a password with @ : / ? # in it breaks the URI
  // otherwise, and that failure looks identical to a wrong password.
  return `mongodb+srv://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}/${database}?${params}`;
}

function writeEnv(uri) {
  const original = fs.readFileSync(ENV_PATH, 'utf8');
  const lines = original.split(/\r?\n/);

  // Comment out whatever MONGODB_URI is live, keeping it recoverable.
  const next = [];
  let replaced = false;

  for (const line of lines) {
    if (/^MONGODB_URI=/.test(line)) {
      next.push(`# previous: ${line.replace(/(:)[^@]*(@)/, '$1********$2')}`);
      next.push(`MONGODB_URI=${uri}`);
      replaced = true;
    } else if (/^#\s*MONGODB_URI=/.test(line)) {
      // Drop stale commented-out entries so the file does not accumulate them.
      continue;
    } else {
      next.push(line);
    }
  }

  if (!replaced) next.push(`MONGODB_URI=${uri}`);

  fs.writeFileSync(ENV_PATH, next.join('\n'), 'utf8');
}

async function main() {
  console.log('\nPoint Life RPG at MongoDB Atlas\n');
  console.log('  Atlas -> Database -> Connect -> Drivers gives you the host.');
  console.log('  The password is the DATABASE USER one (Atlas -> Database Access),');
  console.log('  not your Atlas account password.\n');

  const current = process.env.MONGODB_URI ?? '';
  const guessHost = current.match(/@([^/?]+)/)?.[1] ?? 'cluster0.xxxxx.mongodb.net';
  const guessUser = current.match(/\/\/([^:@/]+):/)?.[1] ?? '';

  const host = (await ask(`  Cluster host [${guessHost}]: `)) || guessHost;
  const user = (await ask(`  Database username${guessUser ? ` [${guessUser}]` : ''}: `)) || guessUser;
  const password = await askSecret('  Database password (hidden): ');
  const database = (await ask('  Database name [life-rpg]: ')) || 'life-rpg';

  if (!host || !user || !password) {
    console.error('\n  Host, username and password are all required.\n');
    process.exit(1);
  }

  const uri = buildUri({ host, user, password, database });

  console.log('\n  Testing before changing anything…');

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 20_000 });

    // Connecting is not the same as being allowed to do anything: an Atlas user
    // with the wrong role connects fine and fails on the first write.
    const probe = mongoose.connection.db.collection('__conncheck');
    await probe.insertOne({ at: new Date() });
    await probe.deleteMany({});
    await probe.drop().catch(() => {}); // leave no trace of the check

    const collections = await mongoose.connection.db.listCollections().toArray();

    console.log(`  ✓ connected to "${mongoose.connection.name}"`);
    console.log('  ✓ read and write both permitted');
    console.log(
      collections.length
        ? `  ✓ existing collections: ${collections.map((c) => c.name).sort().join(', ')}`
        : '  · database is empty — the app will create its collections on first boot',
    );

    await mongoose.connection.close();
  } catch (error) {
    const message = String(error.message ?? error).split('\n')[0];
    console.error(`\n  ✗ ${message}\n`);

    if (/bad auth|Authentication failed/i.test(message)) {
      console.error('  Atlas rejected the credentials. server/.env has NOT been changed.');
      console.error('  Reset the password at Atlas -> Database Access -> Edit -> Edit Password.');
    } else if (/tlsv1 alert|SSL alert number 80|timed out|ETIMEDOUT/i.test(message)) {
      console.error('  Looks like the IP allowlist. server/.env has NOT been changed.');
      console.error('  Atlas -> Network Access -> Add IP Address -> Add Current IP Address.');
    }

    console.error('');
    await mongoose.connection.close().catch(() => {});
    process.exit(1);
  }

  writeEnv(uri);
  console.log(`\n  ✓ wrote MONGODB_URI to ${ENV_PATH}`);
  console.log('    (the previous value is kept as a comment, with its password masked)');

  console.log('\n  Next:');
  console.log('    npm --workspace server run seed:game   # create the content collections');
  console.log('    npm --workspace server run seed        # optional demo character');
  console.log('    npm run dev\n');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
