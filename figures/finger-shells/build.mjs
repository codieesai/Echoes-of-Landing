// Fig 1 · Arc Gauntlet finger shells on a test stand.
// One index finger form with three nesting C-shaped half-shells. Pulling the ring back
// drags the line around the pulley, which pulls the front shell forward; it catches the
// middle shell after 22 mm. An elastic pulls them home. A tap pad under the fingertip
// presses the Morse button. Units: millimetres.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL = join(HERE, "..", "..", ".claude", "skills", "anatomy");
const k = await import(join(SKILL, "kit", "iso-kit.mjs"));
const G = await import(join(SKILL, "kit", "lathe.mjs"));
const { kitScript } = await import(join(SKILL, "scripts", "inline-kit.mjs"));
const latheScript = () => {
  const src = readFileSync(join(SKILL, "kit", "lathe.mjs"), "utf8").replace(/^import .*$/m, "").replace(/^export /gm, "");
  return `const G = (() => {\n${src}\nreturn { prismOf, frameOf, arcOf, pointOf };\n})();\n`;
};

const theme = process.argv.includes("--light") ? "light" : "dark";
const WIDTH = 640;
const HEIGHT = 290;

/* ---------- the model (one source of truth) ---------- */
const Z0 = 26; // finger axis height above the plate
const SHELLS = [
  { r: 12, s0: 4, s1: 42 }, // P1, fixed on the base bone
  { r: 11, s0: 14, s1: 44 }, // P2, travels 32 to the middle bone
  { r: 10, s0: 22, s1: 46 }, // P3, travels 54 to the tip bone
];
const CATCH = 22; // P3 travel before its tab catches P2
const TRAVEL2 = 32;
const PULL_MAX = 54;
const WALL = 0.9; // card thickness shown on the open front rim
const BOTTOM = -2; // shells come down to 2 mm below the axis on each side
const offsets = (p) => [0, Math.min(TRAVEL2, Math.max(0, p - CATCH)), p];
const LINE_Z = 39.7;
const LINE_Y = -3;
const PULLEY = { x: 111, r: 3.4, z: 37.5 };
const RING_X0 = -139;
const RING_Z = LINE_Z - 7;
const DOT_MS = 500;
const GAP_MS = 800;

const PLATE = { x: -212, y: -40, w: 338, d: 80, r: 8 };
const PLATE_H = 10;
const FOOT_H = 5;
const WRIST = { x: -126, y: -18, w: 30, d: 36, r: 5 };
const WRIST_H = 38;
const PALM = { x: -96, y: -13, w: 96, d: 26, r: 5 };
const PALM_H = 34;
const BOX = { x: -80, y: 0, w: 48, d: 12, r: 2 };
const BOX_Z = PALM_H;
const BOX_H = 10;
const PAD = { x: 89, y: -7, w: 12, d: 14, r: 1.5 };
const PAD_H = 14;
const PRESS = 2.2;
const CAP_TRAVEL = 0.9;
const SWITCH = { x: 91, y: -3, w: 8, d: 6, r: 0.8 };
const FINGER = [[0, 8.2], [3, 8, 1], [40, 7.8, 1], [44, 7.0, 1], [47, 7.3, 1], [72, 7.1, 1], [75.5, 6.4, 1], [78.5, 6.6, 1], [97, 6.2, 1], [101, 4.8, 1], [104, 2.4, 1], [105, 0]];

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [PULLEY.x, 0, 40], [-120, -18, 42], [-60, 12, 46], [20, 12, 40]],
  WIDTH,
  HEIGHT,
  { pad: 14, azimuth: 58 },
);

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const AX = G.frameOf([0, 0, Z0], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
const alongY = (x, z) => G.frameOf([x, 0, z], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
const alongX = (y, z, x = 0) => G.frameOf([x, y, z], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

/* ---------- static parts ---------- */
function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 16))) {
    out.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid", inner: L(k.sideSeam(PLATE, -PLATE_H + 3, P), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 9);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  // ruler strip under the finger: 0 is the finger base, majors every 10 mm
  const strip = { x: -4, y: 27, w: 118, d: 7, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(0, 110, 2, 5, strip.y + 0.8, 0.6, [1.8, 3.4], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(L(k.lineOnTop([0, strip.y + 0.8], [0, strip.y + 5], 0.6, P), { tone: "hi" }));
  out.push(D([at([strip.x + 1.6, strip.y + 3.5, 0.6]), at([strip.x + strip.w - 1.6, strip.y + 3.5, 0.6])], { size: 0.45 }));
  // label plate with three rule lines
  const label = { x: -200, y: 24, w: 34, d: 10, r: 1 };
  out.push(S(k.slabOf(label, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  out.push(k.faceTextSvg(k.topMatrix([label.x + 3, label.y + 4.4], 0.6, P, "x"), "FIG 1 · P1 P2 P3", { size: 2.2, tone: "mid" }));
  for (const yy of [6.4, 8]) out.push(L(k.lineOnTop([label.x + 3, label.y + yy], [label.x + 3 + (yy > 7 ? 18 : 26), label.y + yy], 0.6, P), { tone: "faint", free: true }));
  return out.join("");
}

function track() {
  const out = [];
  for (const y of [-12, 2]) {
    out.push(S(k.slabOf({ x: -203, y, w: 73, d: 4, r: 1 }, 0, 3, P, 3, 0.4), { tone: "mid" }));
    out.push(D([-198, -135].map((x) => at([x, y + 2, 3])), { size: 0.4 }));
  }
  for (const x of [-207, -130]) {
    out.push(S(k.slabOf({ x, y: -15, w: 4, d: 23, r: 1.2 }, 0, 7, P, 3, 0.5), { tone: "mid" }));
    out.push(D([at([x + 2, -11, 7]), at([x + 2, 4, 7])], { size: 0.45 }));
  }
  const ticks = k.topTicks(-193, -139, 2, 5, -8 + 0.5, 0, [1.4, 2.6], P);
  out.push(L(ticks.minor, { tone: "faint" }), L(ticks.major, { tone: "lo" }));
  return out.join("");
}

function wrist() {
  const out = [`<path class="iso-halo" d="${k.haloOf(WRIST, 0, 2, P)}" style="filter:blur(3px)"/>`];
  out.push(S(k.slabOf(WRIST, 0, WRIST_H, P, 8, 1), {
    tone: "mid",
    inner: L(k.sideSeam(WRIST, 12, P) + k.sideSeam(WRIST, 30, P), { tone: "faint" }),
  }));
  out.push(L(k.planOutline(k.insetPlan(WRIST, 4), WRIST_H, P), { tone: "faint" }));
  out.push(D(k.corners(WRIST, 4).map(([x, y]) => at([x, y, WRIST_H])), { size: 0.45 }));
  out.push(k.faceTextSvg(k.sideMatrix([WRIST.x + 6, WRIST.y + WRIST.d], 19.5, P, "right"), "WRIST BAND", { size: 2.4, tone: "lo" }));
  return out.join("");
}

function palm() {
  const out = [];
  out.push(S(k.slabOf(PALM, 0, PALM_H, P, 8, 1), {
    tone: "mid",
    inner: L(k.sideSeam(PALM, 8, P), { tone: "faint" }),
  }));
  out.push(L(k.planOutline(k.insetPlan(PALM, 3.5), PALM_H, P), { tone: "faint" }));
  // spring peg on the near face
  out.push(S(G.disc(13, 16, 1.5, alongY(-18, 25), P), { tone: "mid" }));
  out.push(S(G.disc(16, 16.8, 2.4, alongY(-18, 25), P), { tone: "mid" }));
  return out.join("");
}

function box() {
  const out = [`<path class="iso-halo" d="${k.haloOf(k.insetPlan(BOX, -1), BOX_Z, 0.1, P)}" style="filter:blur(3px)"/>`];
  out.push(S(k.slabOf(BOX, BOX_Z, BOX_H, P, 4, 0.6), { tone: "mid", inner: L(k.sideSeam(BOX, BOX_Z + 7, P, 4), { tone: "lo" }) }));
  const top = BOX_Z + BOX_H;
  out.push(L(k.planOutline(k.insetPlan(BOX, 1.6), top, P, 4), { tone: "faint" }));
  out.push(D(k.corners(BOX, 2.4).map(([x, y]) => at([x, y, top])), { size: 0.42, tone: "lo" }));
  // vents
  for (let i = 0; i < 6; i++) {
    const x = BOX.x + 8 + i * 3;
    out.push(L(k.planOutline({ x, y: BOX.y + 3, w: 1.2, d: 6, r: 0.6 }, top, P, 3), { tone: "lo" }));
  }
  // USB-C slot on the near face
  out.push(L(k.segment([BOX.x + 30, BOX.y + BOX.d, BOX_Z + 3], [BOX.x + 37, BOX.y + BOX.d, BOX_Z + 3], P) + k.segment([BOX.x + 30, BOX.y + BOX.d, BOX_Z + 4.6], [BOX.x + 37, BOX.y + BOX.d, BOX_Z + 4.6], P) + k.segment([BOX.x + 30, BOX.y + BOX.d, BOX_Z + 3], [BOX.x + 30, BOX.y + BOX.d, BOX_Z + 4.6], P) + k.segment([BOX.x + 37, BOX.y + BOX.d, BOX_Z + 3], [BOX.x + 37, BOX.y + BOX.d, BOX_Z + 4.6], P), { tone: "lo" }));
  // mode button and LED
  out.push(S(k.cylinder(BOX.x + 36, BOX.y + 6, 2.2, top, 1, P, 20), { tone: "mid" }));
  out.push(S(k.cylinder(BOX.x + 36, BOX.y + 6, 1.4, top + 1, 0.8, P, 16), { tone: "mid" }));
  out.push(S(k.cylinder(BOX.x + 43, BOX.y + 6, 1.6, top, 1.1, P, 16), { tone: "mid" }));
  out.push(`<path data-part="led" class="iso-line" data-tone="lit" d="${k.ring(BOX.x + 43, BOX.y + 6, 2.6, top + 1.1, P, 20)}" style="opacity:0;stroke-width:1.2"/>`);
  return out.join("");
}

function guides() {
  // eyelets the line runs through: two on the wrist band, one on the palm, two on P1
  const out = [];
  const eyelet = (x, stemFrom) => {
    if (stemFrom !== null) out.push(S(k.cylinder(x, LINE_Y, 0.8, stemFrom, LINE_Z - 1.6 - stemFrom, P, 12), { tone: "mid", crease: "none" }));
    out.push(S(G.ringBand(-0.55, 0.55, 0.9, 1.7, alongX(LINE_Y, LINE_Z, x), P), { tone: "mid" }));
  };
  eyelet(-120, WRIST_H);
  eyelet(-102, WRIST_H);
  eyelet(-14, PALM_H);
  return { wristPalm: out.join(""), shell: () => {
    const o = [];
    for (const x of [10, 36]) {
      const surface = Z0 + Math.sqrt(SHELLS[0].r ** 2 - LINE_Y ** 2);
      o.push(S(k.cylinder(x, LINE_Y, 0.8, surface - 0.3, LINE_Z - 1.6 - surface + 0.3, P, 12), { tone: "mid", crease: "none" }));
      o.push(S(G.ringBand(-0.55, 0.55, 0.9, 1.7, alongX(LINE_Y, LINE_Z, x), P), { tone: "mid" }));
    }
    return o.join("");
  } };
}

function posts() {
  const out = [];
  for (const x of [22, 60]) {
    const r = x < 50 ? 7.9 : 7.2;
    out.push(S(k.slabOf({ x: x - 6, y: -7, w: 12, d: 14, r: 1.5 }, 0, 2.4, P, 3, 0.4), { tone: "lo" }));
    out.push(S(k.slabOf({ x: x - 3, y: -4, w: 6, d: 8, r: 1 }, 2.4, Z0 - r - 2.4 - 0.4, P, 3, 0.4), { tone: "mid" }));
    out.push(S(k.slabOf({ x: x - 3.6, y: -4.6, w: 7.2, d: 9.2, r: 1 }, Z0 - r - 0.4, 0.4, P, 3), { tone: "mid", crease: "none" }));
    out.push(D([at([x - 4, -5, 2.4]), at([x + 4, 5, 2.4])], { size: 0.4 }));
  }
  return out.join("");
}

function finger() {
  const out = [];
  const knuckles = [45.5, 77].map((s) => G.arcOf(AX, s, s < 60 ? 7.15 : 6.5, P)).join("");
  const nail = G.arcOf(AX, 99, 5.6, P, { from: Math.PI * 0.2, to: Math.PI * 0.8 });
  out.push(S(G.solidOf(FINGER, AX, P), { tone: "mid", inner: L(knuckles, { tone: "faint" }) + L(nail, { tone: "faint" }) }));
  return out.join("");
}

function pad() {
  const out = [];
  out.push(S(k.slabOf(k.insetPlan(PAD, -2.5), 0, 3, P, 3, 0.5), { tone: "lo" }));
  out.push(`<g data-part="pad">${S(k.slabOf(PAD, 3, PAD_H - 3, P, 3, 0.6), { tone: "mid", inner: L(k.sideSeam(PAD, 8, P, 3), { tone: "faint" }) })}${L(k.planOutline(k.insetPlan(PAD, 2), PAD_H, P, 3), { tone: "faint" })}</g>`);
  return out.join("");
}

function button() {
  const out = [];
  out.push(`<g data-part="cap">${S(k.cylinder(95, 0, 2, 15.3, 1.5, P, 20), { tone: "hi" })}</g>`);
  out.push(S(k.slabOf(SWITCH, 16.8, 3, P, 2, 0.3), { tone: "mid" }));
  out.push(D([at([SWITCH.x + 1.2, SWITCH.y + SWITCH.d - 1.2, 19.8]), at([SWITCH.x + SWITCH.w - 1.2, SWITCH.y + SWITCH.d - 1.2, 19.8])], { size: 0.35, tone: "lo" }));
  return out.join("");
}

function pulley() {
  const out = [];
  const { x, r, z } = PULLEY;
  out.push(S(k.slabOf({ x: x - 7, y: -8, w: 14, d: 16, r: 2 }, 0, 3, P, 3, 0.5), { tone: "lo" }));
  out.push(D([at([x - 4.5, 5.5, 3]), at([x + 4.5, -5.5, 3])], { size: 0.4 }));
  out.push(S(k.cylinder(x, 0, 2.2, 3, z - 1.7 - 3, P, 20), { tone: "mid" }));
  out.push(S(k.cylinder(x, 0, r, z - 1.7, 3.4, P, 32, 0.4), { tone: "mid", inner: L(k.sideArc(x, 0, r, z, P, 24), { tone: "lo" }) }));
  out.push(S(k.cylinder(x, 0, 1.2, z + 1.7, 0.8, P, 16), { tone: "mid" }));
  return out.join("");
}

function cable() {
  return k.wireSvg(at([BOX.x + BOX.w, 9, 39]), at([SWITCH.x, 1.2, 18.4]), {
    via: [at([2, 9, 39]), at([2, 9, 18.5]), at([84, 9, 18.5])],
    tone: "lo",
    size: 0.9,
  });
}

/* ---------- moving parts, built the same way the page rebuilds them ---------- */
const D_RING = (r) => {
  const pts = [];
  for (let i = 0; i <= 24; i++) {
    const t = (i / 24) * Math.PI;
    pts.push([r * Math.cos(t), r * Math.sin(t)]);
  }
  pts.push([-r, BOTTOM], [r, BOTTOM]);
  return pts;
};

function minus(range, cuts) {
  let parts = [range];
  for (const [c0, c1] of cuts) {
    const next = [];
    for (const [a, b] of parts) {
      if (c1 <= a || c0 >= b) { next.push([a, b]); continue; }
      if (c0 > a) next.push([a, c0]);
      if (c1 < b) next.push([c1, b]);
    }
    parts = next;
  }
  return parts.filter(([a, b]) => b - a > 0.05);
}

function shellPieces(p) {
  const o = offsets(p);
  const ranges = SHELLS.map((s, i) => [s.s0 + o[i], s.s1 + o[i]]);
  const pieces = [];
  ranges.forEach((range, i) => {
    for (const [a, b] of minus(range, ranges.slice(0, i))) pieces.push({ i, a, b, front: Math.abs(b - range[1]) < 1e-6 });
  });
  return pieces.sort((x, y) => x.a - y.a);
}

function shellsSvg(p) {
  return shellPieces(p)
    .map(({ i, a, b, front }) => {
      const r = SHELLS[i].r;
      const paths = G.prismOf(AX, D_RING(r), a, b, P);
      let inner = "";
      if (front) {
        const ring = D_RING(r - WALL).map(([u, v]) => [u, Math.max(v, BOTTOM + WALL)]);
        inner = L(k.pathOf(ring.map(([u, v]) => at([b, u, Z0 + v])), true), { tone: "lo" });
      }
      return S(paths, { tone: i === 2 ? "hi" : "hi", lit: i === 2, crease: "lo", inner });
    })
    .join("");
}

const armPlan = (p) => ({ x: SHELLS[2].s1 + p - 1.5, y: 9.6, w: 1.5, d: 7, r: 0.3 });

function linePoints(p) {
  const ring = RING_X0 - p;
  const front = SHELLS[2].s1 + p;
  const pts = [[ring, LINE_Y, LINE_Z], [-120, LINE_Y, LINE_Z], [-102, LINE_Y, LINE_Z], [-14, LINE_Y, LINE_Z], [10, LINE_Y, LINE_Z], [36, LINE_Y, LINE_Z], [PULLEY.x, -PULLEY.r, PULLEY.z]];
  for (let i = 1; i < 12; i++) {
    const t = -Math.PI / 2 + (i / 12) * Math.PI;
    pts.push([PULLEY.x + PULLEY.r * Math.cos(t), PULLEY.r * Math.sin(t), PULLEY.z]);
  }
  pts.push([PULLEY.x, PULLEY.r, PULLEY.z], [front - 0.8, 3, 36.4]);
  return pts;
}

function ringSvg() {
  const F = alongX(LINE_Y, RING_Z, RING_X0);
  const out = [];
  out.push(S(k.slabOf({ x: RING_X0 - 8, y: -12, w: 16, d: 18, r: 2 }, 3, 6, P, 3, 0.5), { tone: "mid" }));
  out.push(D([at([RING_X0 - 5, 3, 9]), at([RING_X0 + 5, 3, 9])], { size: 0.4, tone: "lo" }));
  out.push(S(k.cylinder(RING_X0, LINE_Y, 1.6, 9, RING_Z - 7 - 9 + 0.2, P, 16), { tone: "mid" }));
  out.push(S(G.ringBand(-1, 1, 4.3, 7, F, P), { tone: "hi" }));
  // knurled thumb knob on the near side of the carriage
  out.push(S(G.disc(6, 8.5, 2.6, alongY(RING_X0 + 3, 6), P), { tone: "mid" }));
  return out.join("");
}

const P0 = 0;
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "A test stand for one finger of the Arc Gauntlet glove. A finger form lies on two cradle posts in front of a palm block with the electronics box on top. Three C-shaped card shells cover the back of the finger: the biggest is fixed over the base bone, the other two nest inside it. A line runs from a pull ring at the wrist, through eyelets, around a pulley in front of the fingertip and back to the front shell. Pulling the ring 54 mm slides the front shell onto the tip bone and, after 22 mm, drags the middle shell onto the middle bone. An elastic pulls them home. A tap pad under the fingertip presses the Morse button.",
  body: [
    plate(),
    track(),
    `<g data-part="ring" transform="${k.translateAlong(P, [-P0, 0, 0])}">${ringSvg()}</g>`,
    wrist(),
    palm(),
    box(),
    guides().wristPalm,
    posts(),
    pad(),
    finger(),
    button(),
    pulley(),
    `<g data-part="shells">${shellsSvg(P0)}</g>`,
    guides().shell(),
    `<g data-part="arm" transform="${k.translateAlong(P, [P0, 0, 0])}">${S(k.slabOf(armPlan(0), 23, 4, P, 2), { tone: "mid" })}</g>`,
    cable(),
    `<g data-part="spring"></g>`,
    `<path data-part="line" class="iso-line" data-tone="hi" d="${k.pathOf(linePoints(P0).map(at))}" style="stroke-width:0.7"/>`,
    `<g data-part="ends">${D([at(linePoints(P0)[0]), at(linePoints(P0).at(-1))], { size: 0.8, tone: "hi" })}</g>`,
  ],
});

const live = `
${latheScript()}
const P = ${JSON.stringify(P)};
const SHELLS = ${JSON.stringify(SHELLS)};
const Z0 = ${Z0}, WALL = ${WALL}, BOTTOM = ${BOTTOM}, CATCH = ${CATCH}, TRAVEL2 = ${TRAVEL2}, PULL_MAX = ${PULL_MAX};
const LINE_Y = ${LINE_Y}, LINE_Z = ${LINE_Z}, RING_X0 = ${RING_X0}, PRESS = ${PRESS}, CAP_TRAVEL = ${CAP_TRAVEL};
const PULLEY = ${JSON.stringify(PULLEY)};
const DOT_MS = ${DOT_MS}, GAP_MS = ${GAP_MS};
const AX = G.frameOf([0, 0, Z0], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
const at = (pt) => iso(pt, P);
const S = (paths, style) => solidSvg(paths, style);
const L = (d, style) => lineSvg(d, style);
const offsets = ${offsets.toString()};
const D_RING = ${D_RING.toString()};
const minus = ${minus.toString()};
const shellPieces = ${shellPieces.toString()};
const k = { pathOf };
const shellsSvg = ${shellsSvg.toString()};
const linePoints = ${linePoints.toString()};
const MORSE = { ".-":"A","-...":"B","-.-.":"C","-..":"D",".":"E","..-.":"F","--.":"G","....":"H","..":"I",".---":"J","-.-":"K",".-..":"L","--":"M","-.":"N","---":"O",".--.":"P","--.-":"Q",".-.":"R","...":"S","-":"T","..-":"U","...-":"V",".--":"W","-..-":"X","-.--":"Y","--..":"Z" };
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const $ = (n) => svg.querySelector('[data-part="' + n + '"]');
const ringG = $("ring"), shellsG = $("shells"), armG = $("arm"), springG = $("spring"), lineEl = $("line"), endsG = $("ends"), padG = $("pad"), capG = $("cap"), led = $("led");
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
let pull = 0, target = 0, press = 0, pressed = false, downAt = 0, code = "", text = "", gapTimer = 0;
let drawnPull = -1, frame = 0, last = 0, visible = false, touring = !still.matches, clock = 0, idleTimer = 0;

function morseDown(now) { if (pressed) return; pressed = true; downAt = now; clearTimeout(gapTimer); run(); }
function morseUp(now) {
  if (!pressed) return; pressed = false;
  code += (now - downAt) < DOT_MS ? "." : "-";
  clearTimeout(gapTimer);
  gapTimer = setTimeout(() => { text = (text + (MORSE[code] || "?")).slice(-8); code = ""; say(); }, GAP_MS);
  say(); run();
}
function say() {
  const o = offsets(pull);
  const where = pull < 0.5 ? "stored" : pull > PULL_MAX - 0.5 ? "covered" : o[1] > 0 ? "P3+P2" : "P3";
  const shown = code.replace(/\\./g, "·").replace(/-/g, "−");
  const typed = (text + (shown ? " " + shown : "")).trim();
  const msg = Math.round(pull) + " mm · " + where + (typed ? " · " + typed : "");
  if (readout.textContent !== msg) readout.textContent = msg;
  stage.setAttribute("aria-valuenow", String(Math.round(pull)));
  stage.setAttribute("aria-valuetext", msg);
}
function draw() {
  const p = Math.round(pull * 4) / 4;
  if (p !== drawnPull) {
    drawnPull = p;
    shellsG.innerHTML = shellsSvg(p);
    ringG.setAttribute("transform", translateAlong(P, [-p, 0, 0]));
    armG.setAttribute("transform", translateAlong(P, [p, 0, 0]));
    const front = SHELLS[2].s1 + p - 1.5;
    const c = coil(-16.8, front, [15, 25], 1.4, 22, "x", P, 14);
    springG.innerHTML = L(c.back, { tone: "lo" }) + L(c.front, { tone: "mid" });
    const pts = linePoints(p);
    lineEl.setAttribute("d", pathOf(pts.map(at)));
    const a = at(pts[0]), b = at(pts[pts.length - 1]);
    endsG.innerHTML = '<g class="iso-dots" data-tone="hi"><circle cx="' + a[0].toFixed(1) + '" cy="' + a[1].toFixed(1) + '" r="0.8"/><circle cx="' + b[0].toFixed(1) + '" cy="' + b[1].toFixed(1) + '" r="0.8"/></g>';
  }
  padG.setAttribute("transform", translateAlong(P, [0, 0, press * PRESS]));
  capG.setAttribute("transform", translateAlong(P, [0, 0, press * CAP_TRAVEL]));
  led.style.opacity = String(press);
  say();
}
// idle tour: slide out, tap S O S, slide home
const TOUR = [[0, "pull", PULL_MAX], [1.6, "down"], [1.75, "up"], [1.95, "down"], [2.1, "up"], [2.3, "down"], [2.45, "up"], [3.4, "down"], [4.1, "up"], [4.3, "down"], [5.0, "up"], [5.2, "down"], [5.9, "up"], [6.9, "down"], [7.05, "up"], [7.25, "down"], [7.4, "up"], [7.6, "down"], [7.75, "up"], [9.4, "pull", 0], [11.5, "end"]];
let tourStep = 0;
function tourTick(dt, now) {
  clock += dt;
  while (tourStep < TOUR.length && TOUR[tourStep][0] <= clock) {
    const [, kind, value] = TOUR[tourStep++];
    if (kind === "pull") target = value;
    if (kind === "down") morseDown(now);
    if (kind === "up") morseUp(now);
    if (kind === "end") { clock = 0; tourStep = 0; text = ""; code = ""; }
  }
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  if (touring) tourTick(dt, now);
  const calm = still.matches;
  pull = calm ? target : pull + (target - pull) * (1 - Math.exp(-dt / 0.32));
  if (Math.abs(target - pull) < 0.02) pull = target;
  const want = pressed ? 1 : 0;
  press = calm ? want : press + (want - press) * (1 - Math.exp(-dt / 0.045));
  if (Math.abs(want - press) < 0.01) press = want;
  draw();
  const settled = !touring && pull === target && press === want;
  frame = visible && !settled ? requestAnimationFrame(tick) : 0;
}
function run() { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } }
function steer(next) {
  if (touring) { touring = false; pressed = false; clearTimeout(gapTimer); code = ""; text = ""; }
  target = clamp(next, 0, PULL_MAX);
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => { touring = !still.matches; clock = 0; tourStep = 0; run(); }, 6000);
  run();
}
new IntersectionObserver((e) => { visible = e[e.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
stage.addEventListener("pointermove", (event) => {
  if (event.pointerType === "touch") return;
  const box = svg.getBoundingClientRect();
  const share = clamp(1 - ((event.clientX - box.left) / box.width - 0.08) / 0.34, 0, 1);
  steer(share * PULL_MAX);
});
stage.addEventListener("pointerdown", (event) => { steer(target); morseDown(performance.now()); stage.setPointerCapture(event.pointerId); });
stage.addEventListener("pointerup", () => morseUp(performance.now()));
stage.addEventListener("pointercancel", () => morseUp(performance.now()));
stage.addEventListener("keydown", (event) => {
  if (event.key === " " || event.key === "Enter") { event.preventDefault(); if (!event.repeat) { steer(target); morseDown(performance.now()); } return; }
  let to = null;
  if (event.key === "ArrowLeft" || event.key === "ArrowUp") to = target + 6;
  if (event.key === "ArrowRight" || event.key === "ArrowDown") to = target - 6;
  if (event.key === "Home") to = 0;
  if (event.key === "End") to = PULL_MAX;
  if (to === null) return;
  event.preventDefault();
  steer(to);
});
stage.addEventListener("keyup", (event) => { if (event.key === " " || event.key === "Enter") morseUp(performance.now()); });
if (still.matches) { target = PULL_MAX; }
drawnPull = -1;
draw();
run();
`;

const body = k.plateHtml({
  fig: "Fig 1",
  title: "Finger shells · test stand",
  hint: "Move to pull · hold to tap",
  readout: "0 mm · stored",
  keys: [
    { mark: "lit", label: "P3, the front shell: the line pulls it 54 mm onto the tip bone" },
    { mark: "raised", label: "P1 fixed on the base bone, P2 caught by P3 after 22 mm" },
    { mark: "edge", label: "Pull line: ring → eyelets → pulley → back to P3" },
  ],
  caption:
    "One finger of the Arc Gauntlet glove on a test stand, in millimetres. Pulling the ring 54 mm slides P3 onto the tip bone; after 22 mm its tab catches P2, which ends 32 mm out over the middle bone, and the elastic pulls both home. Each shell stops short of a knuckle so the finger can still bend. A tap under 0.5 s is a dot, longer is a dash, and a 0.8 s pause ends the letter. This is a teaching figure, not the glove's CAD.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Finger shell stand: arrow keys pull the ring, space taps the Morse button" aria-valuemin="0" aria-valuemax="${PULL_MAX}" aria-valuenow="0">${svg}</div>`,
});

const name = theme === "light" ? "finger-shells-light.html" : "finger-shells.html";
writeFileSync(join(HERE, name), k.pageHtml({ title: "Finger shells", theme, body, script: kitScript() + live }));
console.log("wrote", name);
