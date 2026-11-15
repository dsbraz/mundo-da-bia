// Downloads this run's artifacts whose names start with a prefix, keeping only the newest upload of each name. "Re-run failed jobs"
// uploads again under the same name, and actions/download-artifact then returned the older attempt's copy (run 43656784232: the
// gate read the failed quality-ci and stayed red after the re-run passed).
import { execFileSync } from 'node:child_process';
import { closeSync, mkdirSync, mkdtempSync, openSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
/** The newest of each name among `artifacts` ({ id, name, created }) whose names start with `prefix`. */
export function newest(artifacts, prefix) {
  const byName = new Map();
  for (const artifact of artifacts.filter(a => a.name.startsWith(prefix))) {
    const kept = byName.get(artifact.name);
    if (!kept || artifact.created > kept.created || (artifact.created === kept.created && artifact.id > kept.id)) byName.set(artifact.name, artifact);
  }
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}
function listed(repo, run) {
  const lines = execFileSync('gh', ['api', '--paginate', `repos/${repo}/actions/runs/${run}/artifacts?per_page=100`,
    '--jq', '.artifacts[] | select(.expired | not) | [.id, .name, .created_at] | @tsv'], { encoding: 'utf8' });
  return lines.split('\n').filter(Boolean).map(line => { const [id, name, created] = line.split('\t'); return { id: Number(id), name, created }; });
}
/** `merge`: every artifact's files land in `dest`; `dirs`: each in `dest/<name>/`. */
function download(prefix, dest, layout) {
  const repo = process.env.GITHUB_REPOSITORY, run = process.env.GITHUB_RUN_ID, scratch = mkdtempSync(join(tmpdir(), 'artifact-'));
  const chosen = newest(listed(repo, run), prefix);
  if (!chosen.length) throw new Error(`Nenhum artefato ${prefix}*`);
  for (const artifact of chosen) {
    const zip = join(scratch, `${artifact.id}.zip`), out = layout === 'dirs' ? join(dest, artifact.name) : dest, fd = openSync(zip, 'w');
    try { execFileSync('gh', ['api', `repos/${repo}/actions/artifacts/${artifact.id}/zip`], { stdio: ['ignore', fd, 'inherit'] }); } finally { closeSync(fd); }
    mkdirSync(out, { recursive: true });
    execFileSync('unzip', ['-o', '-q', zip, '-d', out], { stdio: 'inherit' });
    console.log(`${artifact.name} (${artifact.created}) → ${out}`);
  }
  rmSync(scratch, { recursive: true, force: true });
}
if (process.argv[1]?.endsWith('/artifacts.mjs')) {
  const [prefix, dest, layout = 'merge'] = process.argv.slice(2);
  if (!prefix || !dest || !['merge', 'dirs'].includes(layout)) throw new Error('Uso: artifacts.mjs <prefixo> <destino> [merge|dirs]');
  download(prefix, dest, layout);
}
