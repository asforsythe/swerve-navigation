/**
 * Smoke test for HERE Traffic API v7
 *
 * Usage:
 *   npm run smoke:here
 *
 * Requires HERE_API_KEY to be set in .env
 * Tests a bbox over central Florida (I-4 corridor) — always has incidents.
 */
require('dotenv').config();

const KEY = process.env.HERE_API_KEY;
if (!KEY) {
  console.error('❌ HERE_API_KEY is not set in .env');
  console.error('   Add: HERE_API_KEY=your_key_here  to your .env file');
  process.exit(1);
}

// Bounding box over central Florida (I-4 corridor — reliably has incidents)
const bbox = '-81.6,28.3,-81.2,28.7';
const url =
  `https://data.traffic.hereapi.com/v7/incidents` +
  `?in=bbox:${bbox}` +
  `&locationReferencing=shape` +
  `&apiKey=${KEY}`;

console.log('Testing HERE Traffic API v7...');

fetch(url)
  .then(async (r) => {
    if (!r.ok) {
      const body = await r.text();
      console.error(`❌ HERE returned HTTP ${r.status}:`);
      console.error(`   ${body.slice(0, 500)}`);
      process.exit(1);
    }
    return r.json();
  })
  .then((data) => {
    const count = data.results?.length ?? 0;
    console.log(`✅ HERE API key works. Found ${count} incidents in central FL.`);
    if (count > 0) {
      const s = data.results[0];
      console.log('   Sample incident:', {
        type:        s.incidentDetails?.type,
        criticality: s.incidentDetails?.criticality,
        description: s.incidentDetails?.description?.value?.slice(0, 80),
      });
    } else {
      console.log('   (No active incidents in bbox right now — key is valid, data is live)');
    }
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Request failed:', err.message);
    process.exit(1);
  });
