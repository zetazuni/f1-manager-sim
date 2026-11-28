// Draws the emblem: node tools/make-logo.mjs .
// App icon: screenshot logo.svg at 1024x1024 with headless Edge (--default-background-color=00000000)
// to src/web-ui/src-tauri/app-icon.png, then: npx tauri icon src-tauri/app-icon.png
import fs from 'node:fs';
import path from 'node:path';

const pub = path.join(process.argv[2], 'src/web-ui/public');
const f = (n) => +n.toFixed(1);
const polar = (r, deg) => [f(128 + r * Math.cos((deg * Math.PI) / 180)), f(128 + r * Math.sin((deg * Math.PI) / 180))];

// rev-counter ticks round the lower half, the last ones in the red zone
const ticks = [];
for (let i = 0; i <= 24; i++) {
  const a = 28 + (i / 24) * 124; // sweeping under the Z
  const [x1, y1] = polar(i % 4 === 0 ? 86 : 91, 180 - a);
  const [x2, y2] = polar(99, 180 - a);
  ticks.push(`<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${i > 17 ? '#ff3b30' : '#f6d7a8'}" stroke-width="${i % 4 === 0 ? 3.4 : 1.8}" opacity="${i % 4 === 0 ? 0.95 : 0.6}"/>`);
}
// chequered flag fragment flying off the top right
const flag = [];
for (let r = 0; r < 4; r++) {
  for (let c = 0; c < 7; c++) {
    if ((r + c) % 2) continue;
    const s = 9.5;
    const x = 150 + c * s;
    const y = 36 + r * s + Math.sin(c * 0.85) * 4;
    const dy = Math.sin((c + 1) * 0.85) * 4 - Math.sin(c * 0.85) * 4;
    flag.push(`<path d="M${f(x)} ${f(y)}l${s} ${f(dy)}v${s}l${-s} ${f(-dy)}z" fill="#fff6ec" opacity="${f(0.9 - c * 0.1)}"/>`);
  }
}

const HEX = 'M40 10H248L232 188L128 252L10 188L24 54Z'; // forward-leaning shield
const INNER = 'M48 21H236L221 182L128 239L22 182L35 58Z';
// the Z: two slanted bars joined by a diagonal, cut like a racing numeral
const Z = 'M76 66H202L195 91L121 158H186L176 192H46L53 167L128 99H66Z';

const defs = `<defs>
<linearGradient id="zr-rim" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff8a3d"/><stop offset=".45" stop-color="#e10600"/><stop offset="1" stop-color="#6d0b2c"/></linearGradient>
<linearGradient id="zr-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b2050"/><stop offset="1" stop-color="#0c0914"/></linearGradient>
<linearGradient id="zr-z" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#ffe9c7"/><stop offset=".52" stop-color="#d9b98c"/><stop offset="1" stop-color="#fff3de"/></linearGradient>
<linearGradient id="zr-speed" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f6b25e" stop-opacity="0"/><stop offset="1" stop-color="#f6b25e"/></linearGradient>
<pattern id="zr-carbon" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="4" height="8" fill="#ffffff" opacity=".035"/></pattern>
<clipPath id="zr-clip"><path d="${INNER}"/></clipPath>
</defs>`;

const full = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" role="img" aria-label="Zetrace">${defs}
<path d="${HEX}" fill="url(#zr-rim)"/>
<path d="${INNER}" fill="url(#zr-bg)"/>
<g clip-path="url(#zr-clip)">
<rect width="256" height="256" fill="url(#zr-carbon)"/>
<path d="M-10 214L150 -10H196L36 214Z" fill="#ffffff" opacity=".05"/>
${flag.join('')}
${ticks.join('')}
<path d="M12 104H66L63 111H12Z" fill="url(#zr-speed)"/><path d="M12 120H56L53 127H12Z" fill="url(#zr-speed)" opacity=".75"/><path d="M12 136H46L43 143H12Z" fill="url(#zr-speed)" opacity=".5"/>
</g>
<g transform="translate(0 -8)"><path d="${Z}" fill="#6d0b2c" transform="translate(9 9)" opacity=".9"/>
<path d="${Z}" fill="#e10600" transform="translate(4.5 4.5)"/>
<path d="${Z}" fill="url(#zr-z)" stroke="#1a0f1f" stroke-width="2.5" stroke-linejoin="round"/>
<path d="M82 73H193L191 79H80Z" fill="#e10600"/>
<path d="M58 182H172L174 176H60Z" fill="#e10600"/></g>
<path d="${INNER}" fill="none" stroke="#fff6ec" stroke-opacity=".22" stroke-width="1.5"/>
<g fill="#fff6ec" opacity=".8"><circle cx="48" cy="15.5" r="2"/><circle cx="238" cy="15.5" r="2"/><circle cx="17" cy="185" r="2"/><circle cx="226" cy="185" r="2"/></g>
</svg>`;

// small sizes: only the shape that survives at 16 px
const small = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><defs><linearGradient id="r" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff6a2b"/><stop offset=".5" stop-color="#e10600"/><stop offset="1" stop-color="#8a0b2c"/></linearGradient></defs>
<path d="M30 4H254L236 192L128 254L2 192L18 52Z" fill="url(#r)"/>
<path d="M62 50H220L211 90L129 166H204L190 206H36L45 166L128 90H52Z" fill="#fff6ec"/></svg>`;

fs.writeFileSync(path.join(pub, 'logo.svg'), full);
fs.writeFileSync(path.join(pub, 'favicon.svg'), small);
console.log('logo.svg', full.length, 'favicon.svg', small.length);
