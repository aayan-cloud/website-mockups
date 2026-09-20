/**
 * Turn Google Maps engine CSVs into the leads.json shape build.js reads.
 *
 *   node maps-csv-to-leads.js "C:/Users/Aayan/Documents/Google maps scraper/output" gb-leads.json Manchester Leeds
 *
 * The two halves were never connected: the Maps engine writes
 * `maps-leads-<cities>-<date>.csv`, build.js reads a JSON array with different key names.
 * Someone had to translate, and doing it by hand across 34 rows is how a phone number ends
 * up on the wrong business.
 *
 * WHAT IT DROPS, AND WHY
 *
 * - Anything without a mobile `phoneType`. WhatsApp is the delivery mechanism; a landline
 *   lead has no route to the owner, so a page for it is work nobody sees. build.js would
 *   drop it anyway, but dropping it here keeps the reason visible.
 * - Anything the engine did not mark as a website lead. `leadReason` and `siteCheck` are
 *   the engine's verdict, and a business that already has a site is the worst possible
 *   person to send a free website mockup to.
 * - Duplicates by name, newest file wins, because the same business appears across reruns.
 *
 * It does NOT verify the no-website claim. That is still a human step: an earlier Ad
 * Library batch had six of nine "no website" leads turn out to have live sites.
 */
const fs = require('fs');
const path = require('path');

const [, , DIR, OUT, ...cityFilter] = process.argv;
if (!DIR || !OUT) {
  console.error('usage: node maps-csv-to-leads.js <csv-dir> <out.json> [city ...]');
  process.exit(1);
}

/** Proper CSV: addresses are quoted and contain commas, so a split(",") corrupts every row. */
function parseCSV(txt) {
  const rows = [];
  let row = [], cur = '', quoted = false;
  txt = txt.replace(/^\uFEFF/, '');
  for (let i = 0; i < txt.length; i++) {
    const ch = txt[i];
    if (quoted) {
      if (ch === '"') { if (txt[i + 1] === '"') { cur += '"'; i++; } else quoted = false; }
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cur); cur = ''; }
    else if (ch === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
    else if (ch !== '\r') cur += ch;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

const files = fs
  .readdirSync(DIR)
  .filter((f) => /^maps-leads-.*\.csv$/i.test(f))
  .filter((f) => !cityFilter.length || cityFilter.some((c) => f.toLowerCase().includes(c.toLowerCase())))
  .sort(); // oldest first, so a later rerun of the same business overwrites

if (!files.length) { console.error('no matching CSVs in ' + DIR); process.exit(1); }

const byName = new Map();
const dropped = { landline: 0, hasSite: 0, noReviews: 0 };

for (const f of files) {
  const rows = parseCSV(fs.readFileSync(path.join(DIR, f), 'utf8'));
  const hdr = rows[0];
  for (const r of rows.slice(1)) {
    if (r.length < hdr.length - 1) continue;
    const o = {};
    hdr.forEach((h, i) => (o[h] = (r[i] || '').trim()));
    if (!o.name) continue;

    if (o.phoneType !== 'mobile') { dropped.landline++; continue; }
    if (o.websiteFound) { dropped.hasSite++; continue; }
    if (!Number(o.reviewCount)) { dropped.noReviews++; continue; }

    byName.set(o.name, {
      title: o.name,
      rating: Number(o.rating) || '',
      reviews: Number(o.reviewCount) || 0,
      website: '',
      hasWebsite: false,
      phone: o.phone,
      address: o.address,
      category: o.category,
      mapsUrl: o.mapsUrl,
      niche: o.query,
      city: o.city,
      // carried through so a human can see what the engine actually claimed
      leadReason: o.leadReason,
      siteCheck: o.siteCheck,
    });
  }
}

const leads = [...byName.values()].sort((a, b) => b.reviews - a.reviews);
fs.writeFileSync(OUT, JSON.stringify(leads, null, 1));

console.log(`${files.length} file(s) -> ${leads.length} leads -> ${OUT}`);
console.log(`dropped: ${dropped.landline} not mobile, ${dropped.hasSite} already had a site, ${dropped.noReviews} no reviews`);
console.log('\ntop by reviews:');
leads.slice(0, 10).forEach((l) => console.log(`  ${String(l.reviews).padStart(4)}  ${l.rating}  ${l.category.padEnd(16)} ${l.title}`));
console.log('\nNOT verified: "no website" is the engine\'s claim. Check each before messaging.');
