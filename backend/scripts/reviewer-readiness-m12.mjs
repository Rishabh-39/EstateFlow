/** Read-only demo checks against the configured LOCAL estateflow DB. No mutations. */
import 'dotenv/config';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import pg from 'pg';
import { assessReviewerSnapshot, safeReport, validateDemoTarget } from './m12-operations-core.mjs';

const root = process.cwd();
let pool;
try {
  validateDemoTarget(process.env, 'Reviewer readiness');
  const pkg = JSON.parse(readFileSync(join(root,'package.json'),'utf8'));
  for (const path of ['model/resort-intent-model.json','docs/openapi-m9.json','integrations/estateflow-api.ts','sql/004_booking_cancellation.sql']) {
    if (!existsSync(join(root,path))) throw new Error(`Missing essential project file: ${path}`);
  }
  const model = JSON.parse(readFileSync(join(root,'model/resort-intent-model.json'),'utf8'));
  if (!model || typeof model !== 'object') throw new Error('Trained model JSON is invalid');
  pool = new pg.Pool({
    host: process.env.DB_HOST || 'localhost', port: Number(process.env.DB_PORT || 5432),
    database: 'estateflow', user: process.env.DB_USER || 'rishabh', password: process.env.DB_PASSWORD || undefined,
    max: 1, connectionTimeoutMillis: 5000,
  });
  const client = await pool.connect();
  let snapshot;
  try {
    // Read-only transaction and fixed safe SELECT statements. No raw user input in SQL.
    await client.query('BEGIN READ ONLY');
    const identity = await client.query('SELECT current_database() AS name');
    if (identity.rows[0]?.name !== 'estateflow') throw new Error('Actual database identity does not match estateflow');
    const numeric = async (sql) => Number((await client.query(sql)).rows[0]?.count || 0);
    snapshot = {
      activeRoomUnits: await numeric('SELECT count(*) FROM room_units WHERE active = true'),
      roomTypes: await numeric('SELECT count(*) FROM room_types'),
      demoRateDays: await numeric("SELECT count(*) FROM daily_rates WHERE stay_date >= '2027-02-13' AND stay_date < '2027-02-15'"),
      demoInventoryDays: await numeric("SELECT count(*) FROM inventory_days WHERE stay_date >= '2027-02-13' AND stay_date < '2027-02-15'"),
      resourceCodes: (await client.query('SELECT code FROM resource_types')).rows.map(x => x.code),
      demoResourceSlots: await numeric("SELECT count(*) FROM resource_slots WHERE slot_date = '2027-02-14'"),
      staffCount: await numeric("SELECT count(*) FROM users WHERE role = 'STAFF'"),
      gmCount: await numeric("SELECT count(*) FROM users WHERE role = 'GM'"),
      guestCount: await numeric("SELECT count(*) FROM users WHERE role = 'GUEST'"),
      sampleEventCount: await numeric("SELECT count(*) FROM event_requests WHERE title = 'Demo Wedding — Parking Bottleneck'"),
    };
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
  const assessment = assessReviewerSnapshot(snapshot);
  const report = safeReport({ ...assessment, release: pkg.version, checkedAt: new Date().toISOString() });
  mkdirSync(join(root,'reports'),{recursive:true});
  const out = join(root,'reports','reviewer-readiness-m12.json');
  writeFileSync(out, JSON.stringify(report,null,2)+'\n',{mode:0o600});
  for(const item of report.checks)console.log(`${item.ok ? 'PASS':'FAIL'} ${item.id}: ${JSON.stringify(item.actual)}`);
  console.log(`Reviewer-demo readiness: ${report.ready ? 'READY':'NOT READY'}; aggregate-only report saved to ${out}`);
  console.log(report.nextAction);
  if(!report.ready)process.exitCode=1;
} catch (error) {
  console.error('Reviewer-readiness check failed:', error.message);
  process.exitCode=1;
} finally { if(pool)await pool.end(); }
