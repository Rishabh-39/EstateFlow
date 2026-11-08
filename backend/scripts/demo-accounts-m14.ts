/** Local-only check/explicit reset of *three synthetic demo accounts*. Never run on production or remote DBs. */
import 'dotenv/config';
import * as bcrypt from 'bcryptjs';
import { Pool } from 'pg';

const dbName = process.env.DB_NAME || 'estateflow';
const host = process.env.DB_HOST || 'localhost';
const reset = process.argv.includes('--reset');
const safeHosts = new Set(['localhost', '127.0.0.1', '::1']);
if (process.env.NODE_ENV === 'production' || !safeHosts.has(host) || !new Set(['estateflow', 'estateflow_demo']).has(dbName)) {
  console.error('REFUSED: Demo-account management is restricted to local non-production estateflow/estateflow_demo databases.');
  process.exit(1);
}
const accounts = [
  { email: 'staff@estateflow.local', password: 'DemoStaff!2026', name: 'Reservations Staff', role: 'STAFF' },
  { email: 'gm@estateflow.local', password: 'DemoManager!2026', name: 'Demo General Manager', role: 'GM' },
  { email: 'guest@estateflow.local', password: 'DemoGuest!2026', name: 'Sample Guest', role: 'GUEST' },
] as const;
const pool = new Pool({ host, port: Number(process.env.DB_PORT || 5432), database: dbName,
  user: process.env.DB_USER || 'rishabh', password: process.env.DB_PASSWORD || undefined });
async function main() {
  const client = await pool.connect();
  try {
    if (reset) {
      await client.query('BEGIN');
      try {
        for (const a of accounts) {
          const hash = await bcrypt.hash(a.password, 12);
          await client.query(`INSERT INTO users(email,password_hash,display_name,role) VALUES($1,$2,$3,$4)
            ON CONFLICT(email) DO UPDATE SET password_hash=excluded.password_hash, display_name=excluded.display_name, role=excluded.role`,
          [a.email, hash, a.name, a.role]);
        }
        await client.query('COMMIT');
        console.log('Updated only the three named synthetic local demo accounts. No room, booking, or event data was changed.');
      } catch (error) { await client.query('ROLLBACK'); throw error; }
    }
    let bad = 0;
    for (const a of accounts) {
      const result = await client.query('SELECT password_hash,role FROM users WHERE email=$1', [a.email]);
      const row = result.rows[0];
      const good = Boolean(row && row.role === a.role && await bcrypt.compare(a.password, row.password_hash));
      console.log(`${good ? 'PASS' : 'FAIL'}: ${a.role} demo account ${a.email} ${good ? 'matches' : 'missing / mismatched (use --reset)'}`);
      if (!good) bad++;
    }
    if (bad) process.exitCode = 1;
  } finally { client.release(); await pool.end(); }
}
main().catch(e => { console.error('Demo-account check failed:', e instanceof Error ? e.message : String(e)); process.exitCode=1; });
