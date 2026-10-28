import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const metadata = JSON.parse(await readFile('tools/scroll-craft/UPSTREAM.json', 'utf8'));
for (const [file, expected] of Object.entries(metadata.files)) {
  const bytes = await readFile('tools/scroll-craft/' + file);
  const actual = createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex');
  if (actual !== expected) throw new Error('Upstream source changed: ' + file);
}
console.log('Verified ' + Object.keys(metadata.files).length + ' unmodified upstream files against ' + metadata.commit);
