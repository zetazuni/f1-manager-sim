#!/usr/bin/env node
/**
 * Run every check in order and print a summary.
 *
 *   node tools/run-checks.mjs [baseUrl] [outDir] [only,these,checks]
 *
 * baseUrl defaults to http://localhost:5317/ (start it with:
 * cd src/web-ui && npm run dev -- --port 5317). Exit code 1 if anything fails.
 */
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const base = (process.argv[2] || 'http://localhost:5317/').replace(/\/?$/, '/');
const out = process.argv[3] || path.join(os.tmpdir(), 'zetrace-checks');

// [check file, query string] - each flow needs its own starting point
const CHECKS = [
  ['m2-sim', '?notitle=1'], // simulation, season, weather, career tests
  ['m3-pits', '?notitle=1'],
  ['m4-weekend', '?notitle=1'],
  ['m5-hq', '?notitle=1'],
  ['m6-save', '?notitle=1'],
  ['m7-weather', '?round=6&rain=1'],
  ['m8-market', '?round=6'],
  ['m9-cameras', '?notitle=1'],
  ['m10-title', ''],
  ['m20-calendar', '?notitle=1'],
  ['m22-hq', '?notitle=1'],
  ['m22-tabs', '?notitle=1'],
];

const results = [];
const tracks = spawnSync(process.execPath, [path.join(here, 'validate-tracks.mjs')], { encoding: 'utf8' });
results.push(['validate-tracks', tracks.status === 0, tracks.status === 0 ? '6 layouts OK' : tracks.stdout.trim()]);

const only = process.argv[4] ? process.argv[4].split(',') : null;
for (const [name, query] of CHECKS) {
  if (only && !only.includes(name)) continue;
  const t0 = Date.now();
  const runOnce = () => spawnSync(process.execPath, [
    path.join(here, 'check-ui.mjs'), base + query, path.join(out, name), path.join(here, 'checks', `${name}.json`),
    '--size=1600x1000', '--limit=280000',
  ], { encoding: 'utf8' });
  let r = runOnce();
  // headless software rendering on a busy machine can starve a page load;
  // retry once and say so, so a real failure still fails twice
  let retried = false;
  if (r.status !== 0 && name !== 'm2-sim') {
    retried = true;
    r = runOnce();
  }
  let ok = r.status === 0;
  let note = `${Math.round((Date.now() - t0) / 1000)} s${retried ? (ok ? ' (passed on retry)' : ' (failed twice)') : ''}`;
  // the simulation check reports its own pass/fail inside the page
  if (name === 'm2-sim') {
    const m = r.stdout.match(/"pass":\s*(true|false)/);
    ok = ok && m && m[1] === 'true';
    if (m && m[1] === 'false') note += ` | ${(r.stdout.match(/"failures":\s*\[[^\]]*\]/) || [''])[0]}`;
  }
  if (!ok) note += ` | ${(r.stdout + r.stderr).split('\n').filter((l) => /ERRORS|failed|timed out|hard limit/.test(l)).slice(0, 2).join(' ')}`;
  results.push([name, ok, note]);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(16)} ${note}`);
}

const failed = results.filter((r) => !r[1]);
console.log(`\n${results.length - failed.length}/${results.length} passed${failed.length ? `; failed: ${failed.map((f) => f[0]).join(', ')}` : ''}`);
process.exit(failed.length ? 1 : 0);
