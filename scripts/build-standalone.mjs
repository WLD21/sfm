import { build } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Script } from 'node:vm';
import { siteConfig } from '../src/site.config.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const destination = process.argv[2] ? path.resolve(process.argv[2]) : path.join(root, 'OPEN-WEBSITE.html');
const result = await build({
  absWorkingDir: root,
  entryPoints: ['src/main.js'],
  outfile: '.cache/standalone/site.js',
  bundle: true,
  splitting: false,
  format: 'iife',
  platform: 'browser',
  target: 'es2020',
  minify: true,
  define: { 'process.env.NODE_ENV': '"production"' },
  charset: 'utf8',
  legalComments: 'eof',
  loader: { '.woff2': 'dataurl', '.woff': 'dataurl' },
  write: false,
});

let javascript = result.outputFiles.find((file) => file.path.endsWith('.js'))?.text;
const stylesheet = result.outputFiles.find((file) => file.path.endsWith('.css'))?.text;
if (!javascript || !stylesheet) throw new Error('Standalone build did not produce both CSS and JavaScript.');
let html = await readFile(path.join(root, 'index.html'), 'utf8');

// Preserve original JPEG bytes in both static markup and gallery runtime data.
for (const photo of siteConfig.photos) {
  if (!/^\/images\/[^/]+\.jpg$/.test(photo.src)) throw new Error(`Unexpected asset path: ${photo.src}`);
  const bytes = await readFile(path.join(root, 'public', photo.src.slice(1)));
  const embedded = `data:image/jpeg;base64,${bytes.toString('base64')}`;
  if (!html.includes(photo.src) || !javascript.includes(photo.src)) {
    throw new Error(`Photo is missing from markup or gallery: ${photo.src}`);
  }
  html = html.replaceAll(photo.src, embedded);
  javascript = javascript.replaceAll(photo.src, embedded);
}
const icon = await readFile(path.join(root, 'public/favicon.svg'));
html = html.replace('href="/favicon.svg"', `href="data:image/svg+xml;base64,${icon.toString('base64')}"`);
html = html.replace(/\s*<script\s+type="module"\s+src="\/src\/main\.js"><\/script>/, '');
// Use replacement functions: library code can contain literal $& / $` tokens
// that String.replace would otherwise expand into HTML and corrupt the script.
html = html.replace('</head>', () => `<style>\n${stylesheet.replace(/<\/style/gi, '<\\/style')}\n</style>\n</head>`);
html = html.replace('</body>', () => `<script>\n${javascript.replace(/<\/script/gi, '<\\/script')}\n</script>\n</body>`);

if (/\b(?:src|href)="\/(?:src|assets|images|favicon)/.test(html)) throw new Error('Unembedded local resource remains.');
if (/\bimport\s*\(/.test(javascript)) throw new Error('A dynamic JavaScript import remains.');
if (result.outputFiles.length !== 2) throw new Error('Unexpected extra files in standalone output.');
// Parse the actual embedded JavaScript without executing it before delivery.
const embeddedScript = html.match(/<script>\n([\s\S]*?)\n<\/script>/)?.[1];
if (!embeddedScript) throw new Error('Standalone script was not embedded.');
new Script(embeddedScript, { filename: 'OPEN-WEBSITE.html (embedded script)' });
await mkdir(path.dirname(destination), { recursive: true });
await writeFile(destination, html);
console.log(`Standalone HTML: ${destination} (${Buffer.byteLength(html).toLocaleString()} bytes)`);
console.log('Embedded: all CSS, classic JavaScript including GSAP, local font files, favicon and six original photos.');
