/**
 * Turn a scraped lead into a finished mockup page.
 *
 *   node build.js                 build every lead in leads.json that has a template
 *   node build.js --only=salon    just one trade
 *
 * WHY TEMPLATES RATHER THAN HAND-BUILDING EACH ONE
 *
 * Five hand-built pages took an afternoon. Twenty would take four, and by the fifteenth
 * they would all quietly become the same page anyway - which is the worst outcome, since
 * a business owner who has seen a competitor's identical site knows exactly what he is
 * looking at.
 *
 * So: five genuinely different designs, each one already reviewed, filled with real data.
 * A salon and an interior studio get visibly different websites. Two salons get the same
 * layout with different names, which is honest - it is a free mockup, not a bespoke brand.
 *
 * WHAT IS REAL AND WHAT IS ASSUMED
 *
 * Real, from Google: name, review count, rating, phone, address, city, category.
 * Assumed by the template: the service lists. Every page says so in both languages,
 * because being confidently wrong about a stranger's own business is the fastest way to
 * lose them.
 */
const fs = require('fs');
const path = require('path');

// Default stays the Sunbiz/PK set so existing use is unchanged. --leads=<path> points it at
// another file, which is how a Google Maps run gets in without overwriting that one.
const LEADS =
  (process.argv.find((a) => a.startsWith('--leads=')) || '').split('=')[1] ||
  'C:/Users/Aayan/Documents/sunbiz-leads/data/leads.json';
const TPL = path.join(__dirname, 'templates');

/** Google's category -> which of the five designs suits it. */
const PICK = [
  // Order matters, first match wins. This one goes above 'salon' deliberately: "Pet grooming
  // salon" is a real Google category and would otherwise be handed the bridal-makeup design.
  // Mobile and local trades: no premises worth photographing, the review count and the
  // phone number are the whole pitch. Above 'salon' because "Pet grooming salon" is a real
  // category, and above 'interior' because "Landscape architect" is too - a Manchester
  // landscaper was being handed the Urdu bilingual interior-design page.
  [/pet groom|dog groom|cat groom|pet salon|groomer|dog breeder|car valet|valeting|car detail|mobile detail|car wash|mobile car|garden|landscap|lawn|fenc|tree surgeon|waste|rubbish|clearance|window clean|driveway|gutter|handyman|removals|plumb|electrician|roofer|paving/i, 'localservice'],
  [/beauty salon|hair salon|salon|spa|parlour|barber/i, 'salon'],
  [/photography studio|photographer.*commerce|studio/i, 'photostudio'],
  [/photograph/i, 'photographer'],
  [/interior|architect|decorat/i, 'interior'],
  [/fashion|boutique|couture|tailor|design(er)? in/i, 'couture'],
];
const templateFor = (cat) => (PICK.find(([re]) => re.test(cat || '')) || [])[1];

/** Mobile prefixes we can reach on WhatsApp. Add a country by adding its prefix here. */
const MOBILE = [/^923/, /^447/];

/** "Stretford, Manchester", but just "Manchester" when the area IS the city. */
const placeOf = (area, city) => (area && area !== city ? area + ', ' + city : city);

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 42);
const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** "+92 301 8666055" -> "923018666055" */
const digits = (s) => String(s || '').replace(/[^0-9]/g, '');

/**
 * Country suffixes that should never reach a page. Defined once because it was previously
 * written out three times and only one of them ever learned about the UK, which put
 * "United Kingdom" in the address block of every GB page.
 */
const COUNTRY = /,?\s*(Pakistan|United Kingdom|UK|England|Scotland|Wales)$/i;

/**
 * A UK postcode stuck on the end of a part: "Leeds LS6 3AA" -> "Leeds". Headings want the
 * neighbourhood, and a postcode passes every other test in areaOf() while being exactly the
 * wrong answer - "167 people in Leeds LS6 3AA" is how you look like a mail merge.
 */
const POSTCODE = /\s+[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;

/** Google gives one long address line; the pages want two. Split on a comma near the middle. */
function twoLine(addr) {
  const a = String(addr || '').replace(COUNTRY, '').trim();
  if (a.length < 46) return esc(a);
  const parts = a.split(', ');
  let first = '', i = 0;
  while (i < parts.length && (first + parts[i]).length < a.length / 2) { first += (first ? ', ' : '') + parts[i]; i++; }
  return esc(first) + ',<br>' + esc(parts.slice(i).join(', '));
}

/** The neighbourhood, for headings like "Find the salon in <area>". */
function areaOf(addr, city) {
  const a = String(addr || '')
    .replace(COUNTRY, '')
    .split(', ')
    .map((p) => p.replace(POSTCODE, '').trim())
    .filter(Boolean);
  const c = String(city || '').replace(COUNTRY, '');
  const hit = a.slice(0, -1).reverse().find((p) => p && !/^\d/.test(p) && p !== c && p.length > 3 && p.length < 30);
  return esc(hit || c);
}

const onlyArg = (process.argv.find((a) => a.startsWith('--only=')) || '').split('=')[1];

/**
 * Numbers already messaged. Their pages exist at hand-made slugs and the links in those
 * sent messages point there, so regenerating them under a generated slug leaves a live
 * page nobody links to and a second copy that quietly diverges. Deleting the duplicates
 * by hand worked exactly once, until the next build put them back.
 */
const MESSAGED = path.join(__dirname, 'messaged.txt');
const messaged = fs.existsSync(MESSAGED)
  ? new Set(fs.readFileSync(MESSAGED, 'utf8').split(/\s+/).filter(Boolean))
  : new Set();

const leads = JSON.parse(fs.readFileSync(LEADS, 'utf8'));
const built = [];
const skipped = [];

for (const l of leads) {
  const tpl = templateFor(l.category);
  const wa = digits(l.phone);

  if (messaged.has(wa)) { skipped.push([l.title, 'already messaged - page is live at its original slug']); continue; }
  if (!tpl) { skipped.push([l.title, 'no template for "' + l.category + '"']); continue; }
  if (onlyArg && tpl !== onlyArg) continue;
  // WhatsApp is the whole delivery mechanism. A landline lead has no route to the owner,
  // so a page for it is work nobody will ever see. The test is which country's MOBILE
  // prefix this is, not which country: hardcoding 923 silently dropped every lead from a
  // GB run before the template was even consulted.
  if (!MOBILE.some((re) => re.test(wa))) { skipped.push([l.title, 'no mobile number']); continue; }
  if (!l.reviews) { skipped.push([l.title, 'no reviews - nothing to open the message with']); continue; }

  const city = String(l.city || '').replace(COUNTRY, '');
  const short = esc(l.title.split(/[-(–|]/)[0].trim().slice(0, 34));
  const html = fs.readFileSync(path.join(TPL, tpl + '.html'), 'utf8')
    .split('{{NAME}}').join(esc(l.title))
    .split('{{BRANDCAPS}}').join(esc(short.toUpperCase()))
    .split('{{BRAND}}').join(esc(short))
    .split('{{SHORT}}').join(short)
    .split('{{REVIEWS}}').join(String(l.reviews))
    .split('{{RATING}}').join(String(l.rating || ''))
    .split('{{WA}}').join(wa)
    .split('{{PHONE}}').join(esc(l.phone))
    .split('{{ADDRESS}}').join(twoLine(l.address) || esc(city))
    .split('{{AREA2}}').join(areaOf(l.address, city))
    .split('{{AREA}}').join(areaOf(l.address, city))
    // "Manchester, Manchester" in a tab title and a link preview. Happens whenever the
    // address has no neighbourhood distinct from the city and areaOf correctly falls back
    // to it, so the fix belongs here rather than in areaOf.
    .split('{{PLACE}}').join(placeOf(areaOf(l.address, city), esc(city)))
    // The headline states what the business IS, which is a stronger claim than the service
    // list the draft disclaimer covers. Google's category is right most of the time and
    // wrong in a way only a human spots: "Dog breeder" for a mobile grooming service that
    // also breeds is confidently wrong about a stranger's own business. `headline` on the
    // lead overrides it; the run prints every headline at the end so they can be scanned.
    .split('{{CATEGORY}}').join(esc(l.headline || l.category || ''))
    .split('{{CITY}}').join(esc(city));

  const leftover = html.match(/\{\{[A-Z0-9]+\}\}/g);
  if (leftover) { skipped.push([l.title, 'unfilled token ' + leftover[0]]); continue; }

  const dir = slug(l.title);
  fs.mkdirSync(path.join(__dirname, dir), { recursive: true });
  fs.writeFileSync(path.join(__dirname, dir, 'index.html'), html);
  built.push({ dir, tpl, title: l.title, reviews: l.reviews, rating: l.rating, phone: l.phone, wa, city, category: l.category, headline: l.headline || l.category, niche: l.niche });
}

// Merge rather than clobber. built.json is the index the clip tooling reads, and a run over
// one country's leads used to replace every row in it - the other country's pages stayed on
// disk but vanished from the index, which looks exactly like they were never built.
const INDEX = path.join(__dirname, 'built.json');
const prior = fs.existsSync(INDEX) ? JSON.parse(fs.readFileSync(INDEX, 'utf8')) : [];
const merged = prior.filter((p) => !built.some((b) => b.dir === p.dir)).concat(built);
fs.writeFileSync(INDEX, JSON.stringify(merged, null, 1));

console.log(built.length + ' pages built\n');
const byTpl = {};
built.forEach((b) => { byTpl[b.tpl] = (byTpl[b.tpl] || 0) + 1; });
Object.entries(byTpl).forEach(([t, n]) => console.log('  ' + String(n).padStart(3) + '  ' + t));
if (skipped.length) {
  console.log('\n' + skipped.length + ' skipped:');
  skipped.slice(0, 12).forEach(([t, why]) => console.log('  ' + t.slice(0, 40).padEnd(42) + why));
}

// Every headline, grouped and counted, for a human to scan. This is the only check on it:
// the headline asserts what a stranger's business IS, and no rule catches "Dog breeder"
// being the wrong facet of a business whose own name says mobile pet services. Grouping
// does the work a cleverer detector could not - the one-offs at the bottom are the ones to
// read, because a niche run should produce one headline many times over.
if (built.length) {
  const groups = new Map();
  for (const b of built.filter((x) => x.tpl === 'localservice')) {
    if (!groups.has(b.headline)) groups.set(b.headline, []);
    groups.get(b.headline).push(b.title);
  }
  console.log('\nheadlines, read these before sending anything:');
  for (const [head, names] of [...groups].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${String(names.length).padStart(3)}x  "${head} in ..."`);
    if (names.length <= 2) names.forEach((n) => console.log('          ' + n));
  }
}
