/**
 * Start the disposable E2E API against a clean estateflow_test database.
 * DESTRUCTIVE: drops the public schema in estateflow_test ONLY.
 * Run using `npm run test:e2e`. Never use this against meaningful data.
 */
import 'dotenv/config';
import { spawn } from 'node:child_process';
import pg from 'pg';

const { Client } = pg;
const env = {
  ...process.env,
  NODE_ENV: 'test',
  // E2E must not depend on a developer's optional Ollama model or remote API.
  AI_PROVIDER: 'local',
  DB_NAME: 'estateflow_test',
  PORT: '4100',
  API_BASE_URL: 'http://127.0.0.1:4100',
};

function assertSafeTestEnvironment() {
  if (env.DB_NAME !== 'estateflow_test' || env.NODE_ENV !== 'test') {
    throw new Error('Refusing to run destructive E2E setup outside estateflow_test');
  }
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { env, stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', code => code === 0
      ? resolve()
      : reject(new Error(`${command} ${args.join(' ')} exited ${code}`)));
  });
}

async function resetDisposableDatabase() {
  assertSafeTestEnvironment();
  const client = new Client({
    host: env.DB_HOST || 'localhost',
    port: Number(env.DB_PORT || 5432),
    database: 'estateflow_test',
    user: env.DB_USER || 'rishabh',
    password: env.DB_PASSWORD || undefined,
  });

  await client.connect();
  try {
    // Verify the actual connection target, not just an environment variable.
    const identity = await client.query('SELECT current_database() AS name');
    if (identity.rows[0]?.name !== 'estateflow_test') {
      throw new Error('E2E reset blocked: database identity is not estateflow_test');
    }
    console.log('E2E reset: clearing public schema in estateflow_test ONLY.');
    await client.query('BEGIN');
    try {
      await client.query('DROP SCHEMA IF EXISTS public CASCADE');
      await client.query('CREATE SCHEMA public');
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
    console.log('E2E reset complete; migrations and seed will now run from a clean state.');
  } finally {
    await client.end();
  }
}

async function waitHealth() {
  for (let i = 0; i < 60; i++) {
    try {
      const response = await fetch(env.API_BASE_URL + '/health');
      const health = await response.json();
      if (response.ok && health.environment === 'test') return;
    } catch { /* The API has not started yet. */ }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error('Test NestJS server did not start in 30 seconds');
}

let server;
try {
  assertSafeTestEnvironment();
  console.log('WARNING: This command ERASES the public schema of estateflow_test before running tests.');
  console.log('The main estateflow database is never targeted.');
  console.log('Create estateflow_test once with PostgreSQL user rishabh before first use.');
  await resetDisposableDatabase();
  await run(process.execPath, ['-r', 'ts-node/register/transpile-only', 'scripts/migrate.ts']);
  await run(process.execPath, ['-r', 'ts-node/register/transpile-only', 'scripts/seed.ts']);
  server = spawn(process.execPath, ['dist/src/main.js'], { env, stdio: 'inherit' });
  await waitHealth();
  await run(process.execPath, ['scripts/e2e.mjs']);
} catch (error) {
  console.error('E2E RUNNER FAILED:', error.message);
  process.exitCode = 1;
} finally {
  if (server && !server.killed) server.kill();
}
