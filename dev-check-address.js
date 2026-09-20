/**
 * Address helper check. No network, no browser, no leads file.
 *
 *   node dev-check-address.js
 *
 * Exists because the previous check only asserted that every {{TOKEN}} got filled, which
 * proves nothing about whether the value is sane. Both of the bugs this catches filled
 * perfectly: an address block ending "United Kingdom", and a heading reading "in Leeds
 * LS6 3AA" because areaOf returned a postcode instead of a neighbourhood.
 */
const fs = require('fs');

const src = fs.readFileSync(require('path').join(__dirname, 'build.js'), 'utf8');
// Pull the real helpers out of build.js rather than copying them, so this cannot drift.
const from = src.indexOf('const COUNTRY =');
const to = src.indexOf('\n}', src.indexOf('function areaOf')) + 2;
if (from < 0 || to < 2) throw new Error('could not locate the address helpers in build.js');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const { twoLine, areaOf } = new Function('esc', src.slice(from, to) + '\nreturn { twoLine, areaOf };')(esc);

const CASES = [
  ['GB full', '12 High Street, Headingley, Leeds LS6 3AA, United Kingdom', 'Leeds, United Kingdom', 'Headingley'],
  ['GB no street', 'Headingley, Leeds LS6 3AA, United Kingdom', 'Leeds, United Kingdom', 'Headingley'],
  ['GB postcode only', 'Leeds LS6 3AA, United Kingdom', 'Leeds, United Kingdom', 'Leeds'],
  ['GB county tail', '12 High Street, Leeds LS6 3AA, West Yorkshire, UK', 'Leeds, UK', 'Leeds'],
  ['PK regression', 'Plot 14, Satellite Town, Rawalpindi', 'Rawalpindi Pakistan', 'Satellite Town'],
  ['PK long', 'Shop 3, Main Boulevard, Gulberg III, Lahore, Pakistan', 'Lahore Pakistan', 'Gulberg III'],
];

let bad = 0;
for (const [name, addr, city, want] of CASES) {
  const area = areaOf(addr, city);
  const line = twoLine(addr);
  const leak = /United Kingdom|Pakistan|\bUK\b/i.test(area + line);
  const post = /[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}/i.test(area);
  const ok = area === want && !leak && !post;
  if (!ok) bad++;
  console.log(
    (ok ? 'PASS  ' : 'FAIL  ') + name.padEnd(18) +
      'area=' + JSON.stringify(area).padEnd(17) +
      (ok ? '' : 'wanted ' + JSON.stringify(want) + '  ') +
      (leak ? 'COUNTRY LEAK  ' : '') + (post ? 'POSTCODE IN HEADING  ' : '') +
      '| ' + line.replace('<br>', ' / ')
  );
}
console.log(bad ? `\n${bad} failed` : '\nall address cases pass');
process.exit(bad ? 1 : 0);
