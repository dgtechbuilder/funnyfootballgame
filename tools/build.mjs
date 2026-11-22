// ============================================================================
//  BUILD: turns the source folder into the small, cacheable site that ships.
//
//    npm ci && npm run build        -> dist/
//
//  * the 13 game scripts become ONE minified file, named after its content
//    (js/app.<hash>.js): one request instead of 13, roughly a quarter of the bytes
//  * the page loads it with `defer`, so the loading screen paints first
//  * sw.js gets the version + the list of files to store for offline play
//  * fonts, icons and the manifest are copied as they are
//
//  Minifying uses esbuild (`npm ci` installs it). Without it the build still
//  succeeds with a plain (unminified) bundle and says so.
//  Local development needs none of this: open index.html from the source folder.
// ============================================================================

import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, process.argv[2] || 'dist');
const kb = n => (n / 1024).toFixed(1) + ' KB';

// ---- 1. the script list, in page order
const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
const block = html.match(/<!-- scripts[^>]*-->([\s\S]*?)<!-- \/scripts -->/);
if (!block) throw new Error('index.html: <!-- scripts --> ... <!-- /scripts --> block not found');
const scripts = [...block[1].matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);
if (!scripts.length) throw new Error('no scripts found in the scripts block');

// ---- 2. one bundle. Classic scripts share one global scope, so joining them in order behaves the same.
const joined = scripts.map(s => `// ---- ${s}\n${readFileSync(join(ROOT, s), 'utf8')}\n;`).join('\n');
let code = joined, minified = false;
try {
  const { transformSync } = await import('esbuild'); // devDependency: `npm ci` first
  code = transformSync(joined, { minify: true, target: 'es2017', charset: 'utf8', legalComments: 'none', loader: 'js' }).code;
  minified = true;
} catch (e) {
  console.warn(`! could not minify (${e.message.split('\n')[0]}); shipping the plain bundle. Run \`npm ci\` to get esbuild.`);
}
const hash = createHash('sha256').update(code).digest('hex').slice(0, 10);
const bundle = `js/app.${hash}.js`;

// ---- 3. write the site
rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, 'js'), { recursive: true });
writeFileSync(join(OUT, bundle), code);
const page = html.replace(block[0], `<script defer src="${bundle}"></script>`);
writeFileSync(join(OUT, 'index.html'), page);
for (const f of ['fonts', 'icons', 'manifest.webmanifest', '.nojekyll']) if (existsSync(join(ROOT, f))) cpSync(join(ROOT, f), join(OUT, f), { recursive: true });

// ---- 4. service worker: what to store for offline play, and a version that changes with any of it
const list = dir => readdirSync(join(OUT, dir)).flatMap(n => statSync(join(OUT, dir, n)).isDirectory() ? list(join(dir, n)) : [join(dir, n).replace(/\\/g, '/')]);
// Only what a launch needs; the rarely used extras (accented-letter fonts, big icons) are stored the first
// time the browser asks for them, so a slow first visit doesn't pay for them up front.
const precache = ['./', 'index.html', bundle, 'manifest.webmanifest', ...list('fonts').filter(f => !f.includes('latin-ext')), 'icons/icon.svg', 'icons/icon-192.png'];
const version = createHash('sha256').update(precache.map(f => f === './' ? '' : readFileSync(join(OUT, f))).join('\0')).digest('hex').slice(0, 10);
const sw = readFileSync(join(ROOT, 'sw.js'), 'utf8')
  .replace("'__VERSION__'", JSON.stringify(version))
  .replace(/const PRECACHE = \[[^\]]*\];.*$/m, `const PRECACHE = ${JSON.stringify(precache)};`);
if (sw.includes('__VERSION__')) throw new Error('sw.js: VERSION placeholder not replaced');
writeFileSync(join(OUT, 'sw.js'), sw);

// ---- 5. report
const size = f => statSync(join(OUT, f)).size;
const gz = f => gzipSync(readFileSync(join(OUT, f)), { level: 9 }).length;
const firstVisit = precache.filter(f => f !== './');
console.log(`built ${OUT}  (version ${version})`);
console.log(`  ${scripts.length} scripts -> ${bundle}: ${kb(Buffer.byteLength(joined))} -> ${kb(code.length)}${minified ? ' minified' : ' (NOT minified)'}, ${kb(gz(bundle))} gzipped`);
console.log(`  first visit downloads about ${kb(firstVisit.reduce((a, f) => a + (/\.(woff2|png)$/.test(f) ? size(f) : gz(f)), 0))} in ${firstVisit.length} requests, all from this site`);
console.log(`  stored for offline play: ${precache.length} files`);
