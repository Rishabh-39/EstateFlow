/** Pure guards and readiness policy; intentionally independent of PostgreSQL. */
import { resolve, relative, isAbsolute } from 'node:path';

export const DEMO_DATABASE = 'estateflow';
export const TEST_DATABASE = 'estateflow_test';
export const EXPECTED_ROOM_UNITS = 76;
export const REQUIRED_RESOURCES = Object.freeze(['LAWN', 'DINING', 'PARKING', 'EVENT_STAFF']);

export function validateDemoTarget(env, operation) {
  const dbName = env.DB_NAME || DEMO_DATABASE;
  if (env.NODE_ENV === 'production') throw new Error(`${operation} is disabled in production`);
  if (dbName !== DEMO_DATABASE) throw new Error(`${operation} requires DB_NAME=${DEMO_DATABASE}, received ${dbName}`);
  if (env.DB_HOST && !['localhost', '127.0.0.1', '::1'].includes(env.DB_HOST)) {
    throw new Error(`${operation} requires local PostgreSQL, received a remote DB host`);
  }
  return { database: dbName, host: env.DB_HOST || 'localhost' };
}

export function validateBackupFilename(filename, projectRoot) {
  if (!filename || typeof filename !== 'string') throw new Error('Backup filename is required');
  const abs = resolve(projectRoot, filename);
  const dir = resolve(projectRoot, 'backups');
  const within = relative(dir, abs);
  if (within.startsWith('..') || isAbsolute(within) || within === '') {
    throw new Error('Backup destination must be a regular file inside the local backups/ folder');
  }
  if (!/\.dump$/.test(abs)) throw new Error('Backup file must end in .dump');
  if (abs.includes('\0')) throw new Error('NUL byte in backup path');
  return abs;
}

/** Return aggregate-only diagnostics, never user emails or enquiry text. */
export function assessReviewerSnapshot(snapshot) {
  const checks = [
    { id: 'room-units', ok: snapshot.activeRoomUnits === EXPECTED_ROOM_UNITS, actual: snapshot.activeRoomUnits, expected: EXPECTED_ROOM_UNITS },
    { id: 'room-types', ok: snapshot.roomTypes >= 2, actual: snapshot.roomTypes, minimum: 2 },
    { id: 'rates-demo-dates', ok: snapshot.demoRateDays >= 4, actual: snapshot.demoRateDays, minimum: 4 },
    { id: 'inventory-demo-dates', ok: snapshot.demoInventoryDays >= 4, actual: snapshot.demoInventoryDays, minimum: 4 },
    { id: 'resource-types', ok: REQUIRED_RESOURCES.every(x => snapshot.resourceCodes.includes(x)), actual: snapshot.resourceCodes.length, required: REQUIRED_RESOURCES },
    { id: 'resource-slots-demo-date', ok: snapshot.demoResourceSlots >= 4, actual: snapshot.demoResourceSlots, minimum: 4 },
    { id: 'demo-users', ok: snapshot.staffCount >= 1 && snapshot.gmCount >= 1 && snapshot.guestCount >= 1, actual: { staff: snapshot.staffCount, gm: snapshot.gmCount, guests: snapshot.guestCount } },
    { id: 'demo-event', ok: snapshot.sampleEventCount >= 1, actual: snapshot.sampleEventCount, minimum: 1 },
  ];
  return { ready: checks.every(c => c.ok), checks, nextAction: checks.every(c => c.ok)
    ? 'Run npm run dev followed by npm run smoke:m9; then connect Lovable using the typed client.'
    : 'On an isolated local DEMO database only, run npm run db:seed, then npm run reviewer:ready again.' };
}

export function safeReport(report) {
  // Only aggregate fields intentionally selected above should reach reports and console.
  return { release: report.release, checkedAt: report.checkedAt, database: DEMO_DATABASE, ready: report.ready, checks: report.checks, nextAction: report.nextAction };
}
