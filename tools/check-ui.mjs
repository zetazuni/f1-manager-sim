#!/usr/bin/env node
/**
 * Headless UI check over the Chrome DevTools Protocol (no npm deps, Node 22+).
 *
 *   node tools/check-ui.mjs <url> <outDir> [steps.json] [--size=1400x1000]
 *
 * steps.json is a list of { "wait": ms } | { "eval": "js" } | { "shot": "name.png" }.
 * Without a steps file: wait 4 s, take shot.png, print the scene probe.
 * Prints every console error and uncaught exception; exits 1 if there were any.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const args = process.argv.slice(2);
const [url, outDir, stepsFile] = args.filter((a) => !a.startsWith('--'));
const size = ((args.find((a) => a.startsWith('--size=')) || '--size=1400x1000').slice(7)).split('x').map(Number);
const BROWSERS = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
];
const exe = BROWSERS.find((p) => fs.existsSync(p));
if (!url || !outDir || !exe) {
  console.error('usage: node tools/check-ui.mjs <url> <outDir> [steps.json]');
  process.exit(2);
}
fs.mkdirSync(outDir, { recursive: true });

const steps = stepsFile
  ? JSON.parse(fs.readFileSync(stepsFile, 'utf8'))
  : [{ wait: 4000 }, { shot: 'shot.png' }, { eval: 'JSON.stringify({cars: window.__zetrace?.carEntities.size, canvas: [document.querySelector("canvas").width, document.querySelector("canvas").height]})' }];

const port = 9300 + Math.floor(Math.random() * 500);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'zetrace-cdp-'));
const browser = spawn(exe, [
  '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars',
  `--window-size=${size[0]},${size[1]}`, 'about:blank',
], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let wsUrl;
for (let i = 0; i < 50 && !wsUrl; i++) {
  try {
    const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
    wsUrl = list.find((t) => t.type === 'page')?.webSocketDebuggerUrl;
  } catch { /* browser still starting */ }
  if (!wsUrl) await sleep(200);
}
if (!wsUrl) { console.error('browser did not start'); browser.kill(); process.exit(2); }

const ws = new WebSocket(wsUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let id = 0;
const pending = new Map();
const errors = [];
ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); return; }
  if (msg.method === 'Runtime.exceptionThrown') errors.push(`exception: ${msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text}`);
  if (msg.method === 'Runtime.consoleAPICalled' && ['error', 'assert'].includes(msg.params.type)) {
    errors.push(`console.${msg.params.type}: ${msg.params.args.map((a) => a.value ?? a.description).join(' ')}`);
  }
  if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') errors.push(`log: ${msg.params.entry.text} ${msg.params.entry.url || ''}`);
});
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });

await send('Runtime.enable');
await send('Log.enable');
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: size[0], height: size[1], deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url });

for (const step of steps) {
  if (step.wait) await sleep(step.wait);
  if (step.eval) {
    const res = await send('Runtime.evaluate', { expression: step.eval, awaitPromise: true, returnByValue: true });
    const r = res.result;
    if (r?.exceptionDetails) errors.push(`eval failed: ${step.eval} -> ${r.exceptionDetails.exception?.description}`);
    else console.log(`eval> ${typeof r?.result?.value === 'string' ? r.result.value : JSON.stringify(r?.result?.value)}`);
  }
  if (step.shot) {
    const res = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(outDir, step.shot), Buffer.from(res.result.data, 'base64'));
    console.log(`shot> ${path.join(outDir, step.shot)}`);
  }
}

ws.close();
browser.kill();
if (errors.length) { console.log(`ERRORS (${errors.length}):\n${errors.join('\n')}`); process.exit(1); }
console.log('no console errors');
