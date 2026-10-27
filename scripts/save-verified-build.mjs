// Commit only verified, generated deliverables to this task's feature branch.
// The short-lived Actions token is read from the environment and never logged.
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
const repository = process.env.GITHUB_REPOSITORY;
const branch = process.env.GITHUB_REF_NAME;
const expected = process.env.GITHUB_SHA;
if (repository !== 'WLD21/sfm' || branch !== 'codex/gym-spa-experience-2026-10-27') throw new Error('Unexpected build destination.');
const token = process.env.GITHUB_TOKEN;
if (!token) throw new Error('Missing scoped build token.');
async function api(route, method = 'GET', body) {
  const response = await fetch('https://api.github.com/repos/' + repository + route, {
    method,
    headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) throw new Error('GitHub build save failed: ' + response.status + ' ' + route);
  return response.json();
}
const ref = await api('/git/ref/heads/' + branch);
if (ref.object.sha !== expected) {
  console.log('A newer source change exists; generated output will remain in the workflow artifact.');
  process.exit(0);
}
const output = execFileSync('git', ['-c', 'status.renames=false', 'status', '--porcelain=v1', '-z', '--untracked-files=all', '--', 'dist', 'OPEN-WEBSITE.html', 'package-lock.json'], { encoding: 'utf8' });
const entries = output.split('\0').filter(Boolean);
if (!entries.length) { console.log('Generated output is already current.'); process.exit(0); }
const tree = [];
for (const entry of entries) {
  const path = entry.slice(3);
  if (!(path.startsWith('dist/') || path === 'OPEN-WEBSITE.html' || path === 'package-lock.json') || path.includes('..')) throw new Error('Unexpected output path.');
  if (entry.slice(0, 2).includes('D')) tree.push({ path, mode: '100644', type: 'blob', sha: null });
  else {
    const blob = await api('/git/blobs', 'POST', { content: (await readFile(path)).toString('base64'), encoding: 'base64' });
    tree.push({ path, mode: '100644', type: 'blob', sha: blob.sha });
  }
}
const parent = await api('/git/commits/' + expected);
const nextTree = await api('/git/trees', 'POST', { base_tree: parent.tree.sha, tree });
const commit = await api('/git/commits', 'POST', { message: 'Save verified gym and spa build and resolved dependency lock', tree: nextTree.sha, parents: [expected] });
const latest = await api('/git/ref/heads/' + branch);
if (latest.object.sha !== expected) throw new Error('Source changed while preparing the build; refusing to overwrite.');
await api('/git/refs/heads/' + branch, 'PATCH', { sha: commit.sha, force: false });
console.log('Verified build commit: ' + commit.sha);
