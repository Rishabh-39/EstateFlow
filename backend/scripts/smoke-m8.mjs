/** Read-only, non-destructive API smoke test. Does not log in or mutate the database. */
const base = (process.env.API_BASE_URL || 'http://127.0.0.1:4000').replace(/\/$/, '');
let passed = 0;
async function get(path) {
  const response = await fetch(base + path, {headers: {'Accept':'application/json'}});
  let data;
  try {data = await response.json();} catch {throw new Error(`Invalid JSON: GET ${path} (${response.status})`);}
  if (!response.ok) throw new Error(`GET ${path} failed HTTP ${response.status}: ${JSON.stringify(data).slice(0,500)}`);
  return {response, data};
}
function expect(condition, description) {
  if (!condition) throw new Error(`FAIL ${description}`);
  passed += 1;
  console.log(`PASS ${description}`);
}
try {
  console.log('EstateFlow M8 read-only API smoke test:',base);
  const health=await get('/health');
  expect(health.data && typeof health.data==='object','health endpoint responds');
  const ready=await get('/health/ready');
  expect(ready.data.database==='reachable','PostgreSQL connection is ready');
  const rooms=await get('/room-types');
  expect(Array.isArray(rooms.data)&&rooms.data.length>0,'room types return seeded inventory');
  const first=rooms.data[0];
  expect(typeof first.id==='string'&&typeof first.max_guests==='number','room types include id and occupancy');
  const detail=await get(`/room-types/${encodeURIComponent(first.id)}`);
  expect(detail.data.id===first.id&&typeof detail.data.total_units==='number','room detail matches room list');
  const date=new Date();date.setUTCDate(date.getUTCDate()+7);
  const checkIn=date.toISOString().slice(0,10);
  date.setUTCDate(date.getUTCDate()+2);
  const checkOut=date.toISOString().slice(0,10);
  const availability=await get(`/availability?checkIn=${checkIn}&checkOut=${checkOut}&roomTypeId=${encodeURIComponent(first.id)}`);
  expect(Array.isArray(availability.data)&&typeof availability.data[0]?.availableUnits==='number',
    'availability returns numeric units for a future stay');
  console.log(`ALL ${passed} M8 PUBLIC API SMOKE CHECKS PASSED`);
}catch(e) {console.error('M8 SMOKE FAILURE:',e.message);process.exitCode=1;}
