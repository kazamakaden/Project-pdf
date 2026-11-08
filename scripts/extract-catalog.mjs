import fs from 'node:fs';
import zlib from 'node:zlib';

const fn = fs.readdirSync('.').find((f) => f.endsWith('.xlsx'));
const b = fs.readFileSync(fn);
let eocd = b.length - 22;
while (eocd > 0 && b.readUInt32LE(eocd) !== 0x06054b50) eocd--;
const cdCount = b.readUInt16LE(eocd + 10);
let cdOff = b.readUInt32LE(eocd + 16);
const entries = {};
for (let i = 0; i < cdCount; i++) {
  const method = b.readUInt16LE(cdOff + 10);
  const csize = b.readUInt32LE(cdOff + 20);
  const nlen = b.readUInt16LE(cdOff + 28);
  const elen = b.readUInt16LE(cdOff + 30);
  const clen = b.readUInt16LE(cdOff + 32);
  const lho = b.readUInt32LE(cdOff + 42);
  const name = b.toString('utf8', cdOff + 46, cdOff + 46 + nlen);
  entries[name] = { method, csize, lho };
  cdOff += 46 + nlen + elen + clen;
}
function xml(name) {
  const e = entries[name];
  if (!e) return '';
  const p = e.lho;
  const nlen = b.readUInt16LE(p + 26);
  const elen = b.readUInt16LE(p + 28);
  const start = p + 30 + nlen + elen;
  const comp = b.subarray(start, start + e.csize);
  return (e.method === 0 ? comp : zlib.inflateRawSync(comp)).toString('utf8');
}
const ss = xml('xl/sharedStrings.xml');
const shared = [];
for (const m of ss.matchAll(/<si[^>]*>([\s\S]*?)<\/si>/g)) {
  const t = [...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((x) => x[1]).join('');
  shared.push(t);
}
const wb = xml('xl/workbook.xml');
const sheetNames = [...wb.matchAll(/<sheet[^>]*?name="([^"]*)"/g)].map((m) => m[1]);
const result = { sheets: {} };
for (let sn = 1; sn <= 8; sn++) {
  const s = xml('xl/worksheets/sheet' + sn + '.xml');
  if (!s) continue;
  const rows = [];
  for (const rm of s.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const row = rm[1];
    const cells = {};
    for (const cm of row.matchAll(/<c([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = cm[1] || '';
      const inner = cm[2] || '';
      const r = (attrs.match(/ r="([^"]+)"/) || [])[1] || '?';
      const t = (attrs.match(/ t="([^"]+)"/) || [])[1] || 'n';
      let val = '';
      if (t === 's') {
        const v = (inner.match(/<v>([\s\S]*?)<\/v>/) || [])[1];
        val = shared[+v] ?? '';
      } else if (t === 'inlineStr') {
        val = [...inner.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((x) => x[1]).join('');
      } else {
        val = (inner.match(/<v>([\s\S]*?)<\/v>/) || [])[1] ?? '';
      }
      const col = r.replace(/[0-9]/g, '');
      if (val !== '') cells[col] = val;
    }
    if (Object.keys(cells).length) rows.push(cells);
  }
  result.sheets['sheet' + sn] = { name: sheetNames[sn - 1] || '(unnamed)', rows };
}
fs.writeFileSync('catalog-raw.json', JSON.stringify(result, null, 2), 'utf8');
console.log('OK -> catalog-raw.json');
for (const k of Object.keys(result.sheets)) {
  const sh = result.sheets[k];
  console.log(k, '[' + sh.name + ']', sh.rows.length, 'rows');
}