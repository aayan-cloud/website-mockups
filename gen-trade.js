/**
 * Build the trade one-pagers for the qualified Ad Library leads.
 *
 *   node gen-trade.js
 *
 * Separate from build.js on purpose. That one is shaped for Pakistani salons and
 * studios: WhatsApp links, addresses ending "Pakistan", five salon-ish designs. A
 * Barnsley builder and a Trinidad sawmill need a phone number at the top and a
 * different look entirely.
 *
 * WHAT IS REAL HERE AND WHAT IS NOT
 *
 * Real, and only from two places - the Ad Library run (output/leads-GB-2026-08-26-1235.csv)
 * and a verification search done by hand on 2026-09-12: the name, trade, town, phone,
 * email, Facebook page, follower count, how long they have been advertising, and JC's
 * Yell rating.
 *
 * Assumed: the service lists. Each page says so in plain words, because being
 * confidently wrong about a stranger's own business is the fastest way to lose them.
 *
 * Six of the nine leads with emails were REJECTED before this file was written, and the
 * reasons are worth keeping: Bark.com is a national platform, not a local business;
 * Patrick Hannifin Roofing, Absolute Exterior Cleaning and Andy's Roofing all have live
 * websites the engine never saw, because it only reads the Facebook page (Andy's is at
 * andysroofingltd.co.uk, which is even in his own email address); Roofs R Us could not be
 * verified at all; InstallerHub had been advertising for twelve days.
 */
const fs = require('fs');
const path = require('path');

const TPL = fs.readFileSync(path.join(__dirname, 'templates', 'trade.html'), 'utf8');

const tick = '<svg class="tick" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';

const LEADS = [
  {
    dir: 'ramkals-sawmilling',
    name: "Ramkal's Sawmilling Co Ltd.",
    tradeUpper: 'Roofing materials<br>& sawmilling',
    trade: 'Roofing materials and sawmilling',
    area: 'Penal, Trinidad',
    intro: 'Roofing materials, pallets and sawmill services from Katwaroo Branch Trace in Penal. Call for prices and what is in stock.',
    phone: '+1 868-647-4029',
    tel: '+18686474029',
    email: 'ramkalsawmilling@gmail.com',
    social: 'https://www.facebook.com/Ramkals',
    socialLabel: 'facebook.com/Ramkals',
    trust: ['Trading and advertising for over 8 years', '30,000 followers on Facebook', 'Penal, south Trinidad'],
    services: [
      ['Roofing materials', 'Sheeting, fixings and everything that goes with a roof.'],
      ['Sawmilling', 'Cut to the sizes a job actually needs.'],
      ['Pallets and skids', 'Made to order for shipping and storage.'],
    ],
    areaText: '#37 Katwaroo Branch Trace, Penal, Trinidad. Serving Penal, Debe and the surrounding south.',
  },
  {
    dir: 'jc-property-maintenance',
    name: 'JC Property Maintenance',
    tradeUpper: 'Roofing, guttering<br>& general building',
    trade: 'Roofing and general building',
    area: 'Barnsley',
    intro: 'Roof repairs, guttering and general property work across Barnsley and South Yorkshire. Tell us the job and we will come and look at it.',
    phone: '+44 7503 881933',
    tel: '+447503881933',
    email: 'jc.property.maintenance@mail.com',
    social: 'https://www.facebook.com/61573556136910',
    socialLabel: 'Our Facebook page',
    trust: ['5.0 from 31 reviews on Yell', 'Barnsley and South Yorkshire', 'No charge to come and quote'],
    services: [
      ['Roof repairs', 'Tiles, leaks, ridges and flashing put right.'],
      ['Guttering and fascias', 'Cleared, repaired or replaced.'],
      ['General building', 'Brickwork, pointing and the jobs nobody else will take.'],
    ],
    areaText: 'Based in Barnsley, S73. Covering Barnsley, Wombwell, Darfield and the villages around them.',
  },
  {
    dir: 'bathrooms-by-alex',
    name: 'Bathrooms by Alex',
    tradeUpper: 'Bathrooms, tiling<br>& plumbing',
    trade: 'Bathroom installation',
    area: 'Norwich',
    intro: 'Full bathroom installations, tiling and plumbing in Norwich. One person doing the whole job, start to finish.',
    phone: '+44 7500 702087',
    tel: '+447500702087',
    email: 'alexbathroom2017@gmail.com',
    social: 'https://www.facebook.com/61563011967185',
    socialLabel: 'Our Facebook page',
    trust: ['3,100 followers on Facebook', 'Norwich and Norfolk', 'The same person on site every day'],
    services: [
      ['Full bathroom fits', 'Stripped out and rebuilt, plumbing and tiling included.'],
      ['Tiling', 'Walls and floors, cut properly around the awkward parts.'],
      ['Plumbing', 'Taps, showers, leaks and replacements.'],
    ],
    areaText: 'Based in Norwich, NR7. Covering Norwich and the surrounding Norfolk villages.',
  },
];

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

for (const L of LEADS) {
  const html = TPL
    .replace(/\{\{NAME\}\}/g, esc(L.name))
    .replace(/\{\{TRADE_UPPER\}\}/g, L.tradeUpper)
    .replace(/\{\{TRADE\}\}/g, esc(L.trade))
    .replace(/\{\{AREA_TEXT\}\}/g, esc(L.areaText))
    .replace(/\{\{AREA\}\}/g, esc(L.area))
    .replace(/\{\{INTRO\}\}/g, esc(L.intro))
    .replace(/\{\{PHONE\}\}/g, esc(L.phone))
    .replace(/\{\{TEL\}\}/g, L.tel)
    .replace(/\{\{EMAIL\}\}/g, esc(L.email))
    .replace(/\{\{SOCIAL_LABEL\}\}/g, esc(L.socialLabel))
    .replace(/\{\{SOCIAL\}\}/g, L.social)
    .replace(/\{\{TRUST\}\}/g, L.trust.map((t) => `<span>${tick}${esc(t)}</span>`).join('\n    '))
    .replace(/\{\{SERVICES\}\}/g, L.services.map(([h, p]) => `<div class="card"><h3>${esc(h)}</h3><p>${esc(p)}</p></div>`).join('\n      '))
    .replace(/\{\{SERVICES_NOTE\}\}/g, 'These three are our best guess at what you do, taken from your Facebook page. Tell me what is wrong and I will change it.')
    .replace(/\{\{FOOT_NOTE\}\}/g, 'Free draft by Realm Systems');

  fs.mkdirSync(path.join(__dirname, L.dir), { recursive: true });
  fs.writeFileSync(path.join(__dirname, L.dir, 'index.html'), html);
  console.log(`${L.dir}/index.html  ${(html.length / 1024).toFixed(1)} KB`);
}
