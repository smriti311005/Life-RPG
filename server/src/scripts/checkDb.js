import 'dotenv/config';
import mongoose from 'mongoose';
import dns from 'node:dns/promises';

/**
 * Diagnose a MongoDB connection.
 *
 *   npm --workspace server run db:check
 *
 * Atlas reports several genuinely different problems through a small number of
 * opaque messages — "bad auth" covers a wrong password, a user that was never
 * created, and a user scoped to the wrong database. This walks the connection
 * one layer at a time so the failure points somewhere specific.
 *
 * The password is never printed.
 */

const redact = (uri) =>
  String(uri).replace(/(mongodb(?:\+srv)?:\/\/[^:@/]+:)[^@]*@/, '$1********@');

const ok = (m) => console.log(`  [32m✓[0m ${m}`);
const bad = (m) => console.log(`  [31m✗[0m ${m}`);
const note = (m) => console.log(`    ${m}`);

async function main() {
  const uri = process.env.MONGODB_URI;

  console.log('\nMongoDB connection check\n');

  /* ------------------------------ 1. the string ----------------------------- */

  if (!uri) {
    bad('MONGODB_URI is not set.');
    note('Copy server/.env.example to server/.env and fill it in.');
    process.exit(1);
  }

  console.log(`  URI: ${redact(uri)}\n`);

  const parsed = uri.match(/^mongodb(\+srv)?:\/\/(?:([^:@/]+):([^@]*)@)?([^/?]+)(?:\/([^?]*))?/);
  if (!parsed) {
    bad('That does not parse as a MongoDB connection string.');
    note('Expected mongodb+srv://<user>:<password>@<host>/<database>');
    process.exit(1);
  }

  const [, srv, user, pass, host, dbName] = parsed;
  ok(`scheme: mongodb${srv ? '+srv' : ''}`);
  ok(`host: ${host}`);

  if (!user) {
    note('no username in the URI (fine for a local server, not for Atlas)');
  } else {
    ok(`username: ${user}`);

    if (pass === undefined || pass === '') {
      bad('The password is empty.');
      note('Atlas shows <db_password> as a placeholder — it has to be replaced.');
    } else if (/^<.*>$/.test(pass)) {
      bad(`The password is still the literal placeholder "${pass}".`);
      note('Replace it with the database user password from Atlas.');
      process.exit(1);
    } else if (pass !== encodeURIComponent(pass)) {
      bad('The password contains characters that must be percent-encoded.');
      note("Run: node -e \"console.log(encodeURIComponent('your password'))\"");
      note('Then paste the encoded form into the URI.');
    } else {
      ok(`password: ${pass.length} characters, no encoding needed`);
    }
  }

  if (!dbName) {
    bad('No database name in the URI — MongoDB will use "test".');
    note(`Add one: ...${host}/life-rpg?retryWrites=true&w=majority`);
  } else {
    ok(`database: ${dbName}`);
  }

  /* --------------------------------- 2. DNS --------------------------------- */

  if (srv) {
    console.log('');
    try {
      const records = await dns.resolveSrv(`_mongodb._tcp.${host}`);
      ok(`DNS: resolved ${records.length} cluster node${records.length === 1 ? '' : 's'}`);
    } catch (err) {
      bad(`DNS lookup for the cluster failed (${err.code ?? err.message}).`);
      note('Check the hostname, and that your network is not blocking SRV lookups.');
      process.exit(1);
    }
  }

  /* ------------------------------ 3. connect -------------------------------- */

  console.log('');
  const started = Date.now();

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 15_000 });
    ok(`connected in ${Date.now() - started}ms`);
    ok(`database in use: ${mongoose.connection.name}`);

    const collections = await mongoose.connection.db.listCollections().toArray();
    if (collections.length) {
      ok(`collections: ${collections.map((c) => c.name).sort().join(', ')}`);
    } else {
      note('database is empty — it will be created on first write');
    }

    // A read and a write, because connecting is not the same as being allowed
    // to do anything. An Atlas user with the wrong role connects fine and then
    // fails on the first operation.
    const probe = mongoose.connection.db.collection('__conncheck');
    await probe.insertOne({ at: new Date() });
    await probe.deleteMany({});
    // Drop it, not just empty it — otherwise the check leaves an empty
    // collection behind in the user's database every time it runs.
    await probe.drop().catch(() => {});
    ok('read and write both permitted');

    console.log('\n  Ready. Start the app with: npm run dev\n');
    await mongoose.connection.close();
  } catch (err) {
    const message = String(err.message || err).split('\n')[0];
    bad(`connection failed: ${message}`);
    console.log('');

    if (/bad auth|Authentication failed/i.test(message)) {
      note('Atlas says the credentials were rejected. In order of likelihood:');
      note('  1. The password is wrong. Atlas → Database Access → Edit → Edit Password.');
      note('  2. The database user does not exist. Atlas → Database Access → Add New User.');
      note('     Use "Password" authentication, and give it "Read and write to any database".');
      note('  3. You pasted the Atlas *account* password rather than the database user one.');
      note('     They are different. The database user is created separately.');
      note('  4. The user was created moments ago — Atlas can take a minute to apply it.');
    } else if (/timed out|ETIMEDOUT|ENOTFOUND|ServerSelectionError/i.test(message)) {
      note('Reached DNS but not the server. Usually the IP allowlist:');
      note('  Atlas → Network Access → Add IP Address → Add Current IP Address.');
      note('  For a deployed API, add the host provider egress IPs (or 0.0.0.0/0 if it has none).');
    } else if (/ECONNREFUSED/i.test(message)) {
      note('Nothing is listening there. If this is a local server, start MongoDB.');
    }

    console.log('');
    await mongoose.connection.close().catch(() => {});
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
