// Dig for Dragon Eggs: HTML prototype.
// Goal: prove that digging, finding an egg, hatching a cute dragon and buying the next upgrade feels good.
// All numbers come from config.js. Game state is one plain object (S) so it maps onto a Roblox profile.
(() => {
'use strict';
const C = window.CONFIG;
const COLS = C.grid.cols;
const SAVE_KEY = 'ddeggs.save.v1';
const $ = id => document.getElementById(id);

// ---------------------------------------------------------------- utils
const SUF = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
function fmt(n) {
  if (!isFinite(n)) return '∞';
  if (n < 1000) return n < 10 && n % 1 ? n.toFixed(1).replace(/\.0$/, '') : String(Math.floor(n));
  let i = 0;
  while (n >= 1000 && i < SUF.length - 1) { n /= 1000; i++; }
  const s = n < 10 ? n.toFixed(2) : n < 100 ? n.toFixed(1) : Math.floor(n).toString();
  return s.replace(/\.0+$|(\.\d*[1-9])0+$/, '$1') + SUF[i];
}
const mmss = s => { s = Math.max(0, Math.ceil(s)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return h ? `${h}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}` : `${m}:${String(x).padStart(2, '0')}`; };
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const hash2 = (a, b) => (Math.imul(a ^ 0x9E3779B9, 0x85EBCA6B) ^ Math.imul(b + 0x632BE5AB, 0xC2B2AE35)) >>> 0;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const now = () => Date.now();
const EGG = Object.fromEntries(C.dragonEggs.map(e => [e.id, e]));
const RAR = C.rarities;

// ---------------------------------------------------------------- state
function newGame(keep) {
  const g = {
    v: 1, seed: (Math.random() * 2 ** 31) | 0,
    gold: 0, gems: 0, mats: {}, pick: 0, holdDig: false, reinforce: 0,
    up: { strength: 0, swing: 0, eggLuck: 0, hatchSpeed: 0 },
    gemUp: { goldBoost: 0, petPower: 0, hatchLuck: 0, autoHatch: 0 },
    nests: [null], nestBought: 0, basket: [],
    dragons: [], equipped: [], equipBought: 0, dex: {},
    rebirths: 0, maxDepth: 0, bestDepth: 0,
    player: { r: -1, c: 3 }, rows: {}, genTo: -1, rowsSinceEgg: 0, firstEggPlaced: false,
    tut: 0, passes: {}, seenLayers: { 0: true },
    settings: { autoDig: false, autoSellCommon: false, muted: false, timeScale: C.timeScale },
    stats: { blocks: 0, eggs: 0, hatched: 0, sold: 0 }, nextId: 1,
  };
  return Object.assign(g, keep || {});
}
function load() {
  try { const raw = localStorage.getItem(SAVE_KEY); if (!raw) return null; const s = JSON.parse(raw); return s && s.v === 1 ? s : null; } catch (e) { return null; }
}
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* storage unavailable: play continues unsaved */ } }

let S = load() || newGame();
// Fill fields added after a save was written.
S = Object.assign(newGame(), S);

// ---------------------------------------------------------------- derived stats
const layerIdx = r => { let i = 0; for (let k = 0; k < C.layers.length; k++) if (r >= C.layers[k].start) i = k; return i; };
const layerOf = r => C.layers[layerIdx(Math.max(0, r))];
const scaleAt = r => { const L = layerOf(r); return 1 + L.growth * Math.max(0, r - L.start); };
const lvlCost = (u, l) => Math.ceil(u.base * Math.pow(u.growth, l));
const strMult = () => Math.pow(C.upgrades.strength.per, S.up.strength);
const RB = C.rebirth.ladder;
const rbMult = () => S.rebirths ? RB[Math.min(S.rebirths, RB.length) - 1].mult : 1;
const nextRebirth = () => RB[S.rebirths] || null;
const rbUnlocks = u => RB.slice(0, S.rebirths).filter(r => r.unlock === u).length;
const UNLOCK_NAMES = { autoDig: 'Auto Dig', equipSlot: '+1 dragon slot', autoHatch: 'Auto-Hatch', nest: '+1 nest' };
const activeEvent = () => (EV.active && EV.active.ends > EV.t) ? EV.active : null;
function goldMult() {
  const e = activeEvent();
  return rbMult() * (1 + C.gemUpgrades.goldBoost.per * S.gemUp.goldBoost) * (S.passes.doubleGold ? 2 : 1) * (e && e.goldMult || 1);
}
const reinforceMult = () => Math.pow(C.reinforce.dmgMult, S.reinforce);
const hitDamage = () => C.pickaxes[S.pick].dmg * reinforceMult() * strMult() * rbMult();
function reinforceCost() {
  if (S.reinforce >= C.reinforce.costFrac.length) return null;
  const base = (C.pickaxes[S.pick + 1] || C.pickaxes[S.pick]).cost, f = C.reinforce.costFrac[S.reinforce] * (C.pickaxes[S.pick + 1] ? 1 : 4);
  return Object.fromEntries(Object.entries(base).map(([k, v]) => [k, Math.ceil(v * f)]));
}
const swingRate = () => C.player.baseSwingsPerSec + C.upgrades.swing.per * S.up.swing;
function petMult() { const e = activeEvent(); return strMult() * rbMult() * (1 + C.gemUpgrades.petPower.per * S.gemUp.petPower) * (e && e.petMult || 1); }
const dragonDef = d => EGG[d.egg].dragons[d.i];
const dragonPower = d => EGG[d.egg].power * RAR[d.i].power;
const dragonSell = d => Math.ceil(EGG[d.egg].sell * RAR[d.i].sell * goldMult());
const nestCap = () => C.incubators.start + S.nestBought + (S.passes.extraIncub ? 2 : 0) + rbUnlocks('nest');
const equipCap = () => C.equip.start + S.equipBought + rbUnlocks('equipSlot');
const rebirthDepth = () => nextRebirth() ? nextRebirth().depth : Infinity;
const autoDigUnlocked = () => rbUnlocks('autoDig') > 0 || !!S.passes.autoDigPass;
const autoHatchOn = () => S.gemUp.autoHatch > 0 || rbUnlocks('autoHatch') > 0;
const eggChance = () => C.eggs.base * (1 + C.upgrades.eggLuck.per * S.up.eggLuck);
const hatchSpeedMult = () => 1 + C.upgrades.hatchSpeed.per * S.up.hatchSpeed;
const equippedDragons = () => S.equipped.map(id => S.dragons.find(d => d.id === id)).filter(Boolean);
const totalPetDps = () => equippedDragons().reduce((a, d) => a + dragonPower(d), 0) * petMult();

// ---------------------------------------------------------------- world
function mkCell(kind, r, extra) {
  const L = layerOf(r);
  const bk = C.blockKinds[kind];
  const hp = Math.ceil(L.hp * scaleAt(r) * bk.hpMult);
  return Object.assign({ k: kind, hp, max: hp }, extra || {});
}
function genRow(r) {
  const L = layerOf(r);
  const rng = mulberry(hash2(S.seed, r));
  const row = [];
  if (L.sealTier > 0 && r === L.start) {
    for (let c = 0; c < COLS; c++) row.push(mkCell('seal', r, { t: L.sealTier }));
    return row;
  }
  const w = L.weights, keys = Object.keys(w), tot = keys.reduce((a, k) => a + w[k], 0);
  let hasEgg = false;
  for (let c = 0; c < COLS; c++) {
    if (!S.firstEggPlaced && r === C.eggs.firstEggRow && c === 3) { row.push(mkCell('egg', r, { e: L.egg, first: 1 })); S.firstEggPlaced = true; hasEgg = true; continue; }
    if (r > 1 && rng() < eggChance()) { row.push(mkCell('egg', r, { e: L.egg })); hasEgg = true; continue; }
    let x = rng() * tot, key = 'base';
    for (const k of keys) { if ((x -= w[k]) <= 0) { key = k; break; } }
    if (C.materials[key]) row.push(mkCell('vein', r, { m: key }));
    else row.push(mkCell(key, r));
  }
  if (hasEgg) S.rowsSinceEgg = 0;
  else if (++S.rowsSinceEgg >= C.eggs.pityRows && r > 2) { row[Math.floor(rng() * COLS)] = mkCell('egg', r, { e: L.egg }); S.rowsSinceEgg = 0; }
  return row;
}
function ensureRows() {
  const want = S.player.r + 26;
  while (S.genTo < want) { S.genTo++; S.rows[S.genTo] = genRow(S.genTo); }
}
const cellAt = (r, c) => (r < 0 || c < 0 || c >= COLS) ? null : (S.rows[r] ? S.rows[r][c] : null);
const isSolid = (r, c) => !!cellAt(r, c);
const inCols = c => c >= 0 && c < COLS;
const isOpen = (r, c) => inCols(c) && (r < 0 || !cellAt(r, c));
const walkable = (r, c) => r >= -1 && isOpen(r, c);
const exposed = (r, c) => isSolid(r, c) && (isOpen(r - 1, c) || isOpen(r + 1, c) || isOpen(r, c - 1) || isOpen(r, c + 1));
const sealLocked = cell => cell && cell.k === 'seal' && S.pick < cell.t;
const inReach = (r, c) => Math.max(Math.abs(r - S.player.r), Math.abs(c - S.player.c)) <= C.player.reach && exposed(r, c);
const standable = (r, c) => !isOpen(r + 1, c);

// BFS over open cells from the player. Returns dist and parent maps keyed "r,c".
function bfs(maxRows = 14) {
  const key = (r, c) => r * 16 + c + 1;
  const dist = new Map(), par = new Map();
  const s = key(S.player.r, S.player.c);
  dist.set(s, 0); const q = [[S.player.r, S.player.c]];
  while (q.length) {
    const [r, c] = q.shift(); const d = dist.get(key(r, c));
    for (const [dr, dc] of [[1, 0], [0, -1], [0, 1], [-1, 0]]) {
      const nr = r + dr, nc = c + dc;
      if (!walkable(nr, nc) || Math.abs(nr - S.player.r) > maxRows) continue;
      const k = key(nr, nc); if (dist.has(k)) continue;
      dist.set(k, d + 1); par.set(k, [r, c]); q.push([nr, nc]);
    }
  }
  return { dist, par, key };
}
function pathTo(dest, B) {
  const path = []; let cur = dest;
  while (cur && !(cur[0] === S.player.r && cur[1] === S.player.c)) { path.unshift(cur); cur = B.par.get(B.key(cur[0], cur[1])); }
  return path;
}
// Best open cell next to (r,c) to dig it from: reachable, prefer standing, then short.
function approach(r, c, B) {
  B = B || bfs();
  let best = null, bestScore = Infinity;
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    const nr = r + dr, nc = c + dc;
    if (!walkable(nr, nc)) continue;
    const d = B.dist.get(B.key(nr, nc)); if (d === undefined) continue;
    const sc = d + (standable(nr, nc) ? 0 : 3) + (dr === 0 || dc === 0 ? 0 : 0.5);
    if (sc < bestScore) { bestScore = sc; best = [nr, nc]; }
  }
  return best ? { cell: best, dist: B.dist.get(B.key(best[0], best[1])), B } : null;
}

// ---------------------------------------------------------------- runtime (not saved)
const R = {
  px: S.player.c, py: S.player.r, path: [], moving: false, target: null, holding: false, pendingTap: false,
  cd: 0, swingAnim: 0, face: 1, autoT: 0, pets: [], particles: [], shake: 0, camY: S.player.r, t: 0,
  lastSwingT: -99, revealQ: [], reveal: null, sealWarnT: 0, lastLayer: layerIdx(Math.max(0, S.player.r)), petNumT: 0,
};
const EV = { t: 0, next: C.events.everySec * 0.6, active: null, idx: 0 };

// ---------------------------------------------------------------- audio
let AC = null;
function audio() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; } } if (AC && AC.state === 'suspended') AC.resume(); return AC; }
function tone(freq, dur, type = 'sine', vol = 0.12, when = 0, slide = 0) {
  if (S.settings.muted || !AC) return;
  const t0 = AC.currentTime + when, o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t0 + dur);
  g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(AC.destination); o.start(t0); o.stop(t0 + dur + 0.02);
}
function noise(dur, vol = 0.1, freq = 900, when = 0) {
  if (S.settings.muted || !AC) return;
  const t0 = AC.currentTime + when, len = Math.floor(AC.sampleRate * dur), buf = AC.createBuffer(1, len, AC.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
  f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.8; g.gain.value = vol;
  src.buffer = buf; src.connect(f).connect(g).connect(AC.destination); src.start(t0);
}
const SFX = {
  hit: (depthT) => { noise(0.07, 0.16, 700 + depthT * 900); tone(140 - depthT * 40, 0.06, 'triangle', 0.08); },
  crit: () => { tone(880, 0.08, 'square', 0.05); },
  brk: () => { noise(0.16, 0.18, 400); tone(110, 0.14, 'sine', 0.14, 0, 0.5); },
  coin: () => { tone(1320, 0.06, 'square', 0.035); tone(1760, 0.08, 'square', 0.035, 0.05); },
  gem: () => { [1568, 2093, 2637].forEach((f, i) => tone(f, 0.12, 'sine', 0.06, i * 0.05)); },
  egg: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'triangle', 0.09, i * 0.07)); },
  clank: () => { tone(1900, 0.12, 'square', 0.04, 0, 0.7); noise(0.05, 0.08, 3000); },
  buy: () => { [784, 1175].forEach((f, i) => tone(f, 0.1, 'square', 0.05, i * 0.06)); },
  crack: () => { noise(0.05, 0.12, 2400); },
  hatch: (tier) => { [523, 659, 784, 1047, 1319].slice(0, 3 + Math.min(2, tier)).forEach((f, i) => tone(f, 0.22, 'triangle', 0.1, i * 0.09)); },
  step: () => { noise(0.03, 0.03, 300); },
};

// ---------------------------------------------------------------- particles & text
function addText(x, y, text, color = '#fff', size = 1, vy = -1.4) { R.particles.push({ kind: 'text', x, y, vx: 0, vy, life: 0.9, max: 0.9, text, color, size }); }
function addChips(x, y, color, n = 8, speed = 3) {
  for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = speed * (0.4 + Math.random()); R.particles.push({ kind: 'chip', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, life: 0.6 + Math.random() * 0.3, max: 0.9, color, size: 0.06 + Math.random() * 0.07 }); }
}
function addSparks(x, y, color, n = 6) {
  for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = 1 + Math.random() * 2.5; R.particles.push({ kind: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.5 + Math.random() * 0.4, max: 0.9, color, size: 0.05 + Math.random() * 0.04 }); }
}

// ---------------------------------------------------------------- UI helpers
function toast(msg, cls = '') {
  const el = document.createElement('div'); el.className = 'toast ' + cls; el.innerHTML = msg;
  const box = $('toasts'); box.prepend(el);
  while (box.children.length > 3) box.lastChild.remove();
  setTimeout(() => el.remove(), 2400);
}
function banner(t, s, accent) {
  $('bannerT').textContent = t; $('bannerS').textContent = s || '';
  $('banner').style.setProperty('--layer-accent', accent || '#fff');
  $('banner').classList.add('show'); clearTimeout(banner.h); banner.h = setTimeout(() => $('banner').classList.remove('show'), 2600);
}
const coinI = '<span class="coin"></span>', gemI = '<span class="gemi"></span>';
const matI = m => `<span class="sw" style="background:${C.materials[m].color}"></span>`;

// ---------------------------------------------------------------- economy actions
function canAfford(cost) { return Object.entries(cost).every(([k, v]) => (k === 'gold' ? S.gold : k === 'gems' ? S.gems : (S.mats[k] || 0)) >= v); }
function pay(cost) { for (const [k, v] of Object.entries(cost)) { if (k === 'gold') S.gold -= v; else if (k === 'gems') S.gems -= v; else S.mats[k] -= v; } }
function giveGold(n, x, y) { S.gold += n; if (x !== undefined) addText(x, y - 0.2, '+' + fmt(n), '#ffd84a', n > 0 ? 1 : 0.8); }

function breakCell(r, c, byPet) {
  const cell = cellAt(r, c); if (!cell) return;
  const L = layerOf(r), cx = c + 0.5, cy = r + 0.5, depthT = layerIdx(r) / (C.layers.length - 1);
  S.rows[r][c] = null;
  S.stats.blocks++;
  let coin = Math.ceil(L.coin * scaleAt(r) * goldMult());
  const pal = L.colors;
  addChips(cx, cy, pal.a, 10); addChips(cx, cy, pal.dark, 5);
  R.shake = Math.max(R.shake, byPet ? 0.04 : 0.08);
  SFX.brk();
  if (cell.k === 'gold') { coin *= C.blockKinds.gold.coinMult; addSparks(cx, cy, '#ffd84a', 14); SFX.coin(); }
  if (cell.k === 'vein') {
    const [a, b] = C.blockKinds.vein.amount; const n = a + Math.floor(Math.random() * (b - a + 1));
    S.mats[cell.m] = (S.mats[cell.m] || 0) + n;
    addText(cx + 0.25, cy + 0.1, `+${n} ${C.materials[cell.m].name}`, C.materials[cell.m].color, 0.8, -1.1);
  }
  if (cell.k === 'gem') {
    const g = C.blockKinds.gem.gems + Math.floor(layerIdx(r) / 2);
    S.gems += g; addText(cx, cy + 0.2, `+${g} gem${g > 1 ? 's' : ''}`, '#62e3ff', 1.1, -1.2); addSparks(cx, cy, '#62e3ff', 18); SFX.gem();
  }
  giveGold(coin, cx, cy);
  if (cell.k === 'egg') findEgg(cell.e, cx, cy, cell.first);
  else { const e = activeEvent(); if (e && e.eggOnBreak && Math.random() < e.eggOnBreak) findEgg(L.egg, cx, cy); }
  if (R.target && R.target[0] === r && R.target[1] === c) R.target = null;
  if (S.tut === 0 && S.stats.blocks >= 3) setTut(1);
}

function findEgg(eggId, x, y, first) {
  S.stats.eggs++;
  SFX.egg(); R.shake = 0.18;
  addSparks(x, y, '#fff6b0', 26);
  addText(x, y - 0.4, first ? 'You found an egg!' : EGG[eggId].name + '!', '#fff', 1.3, -0.9);
  const free = S.nests.findIndex(n => !n);
  if (free >= 0) placeEgg(free, eggId);
  else if (S.basket.length < C.eggs.basketCap) { S.basket.push(eggId); toast(`${EGG[eggId].name} is waiting for a free nest`); }
  else { const g = Math.ceil(EGG[eggId].sell * 0.3 * goldMult()); S.gold += g; toast(`Egg basket full. Sold the egg for ${coinI}${fmt(g)}`, 'bad'); }
  if (S.tut <= 1) setTut(2);
}
function placeEgg(i, eggId) {
  const sec = (S.stats.hatched === 0 && S.stats.eggs <= 1) ? 8 : EGG[eggId].hatchSec;
  S.nests[i] = { egg: eggId, start: now(), dur: (sec * 1000) / hatchSpeedMult() / S.settings.timeScale };
  buildNests();
}
function nestRemaining(n) { return Math.max(0, n.start + n.dur - now()) / 1000; }
function refillNests() { for (let i = 0; i < S.nests.length; i++) if (!S.nests[i] && S.basket.length) placeEgg(i, S.basket.shift()); }

function rollRarity() {
  const luck = (1 + C.gemUpgrades.hatchLuck.per * S.gemUp.hatchLuck) * (S.passes.luckyHatch ? 1.5 : 1);
  const w = RAR.map((r, i) => i === 0 ? r.weight : r.weight * luck);
  let x = Math.random() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < w.length; i++) if ((x -= w[i]) <= 0) return i;
  return 0;
}
function hatch(i, auto) {
  const n = S.nests[i]; if (!n || nestRemaining(n) > 0) return;
  if (S.dragons.length >= C.equip.storageCap) { toast('Dragon storage is full. Sell a dragon to hatch more.', 'bad'); openPanel('dragons'); return; }
  const first = S.stats.hatched === 0;
  const ri = first ? 1 : rollRarity();
  const d = { id: S.nextId++, egg: n.egg, i: ri };
  S.nests[i] = null; S.stats.hatched++;
  const isNew = !S.dex[n.egg + ri]; S.dex[n.egg + ri] = 1;
  S.dragons.push(d);
  if (S.equipped.length < equipCap()) S.equipped.push(d.id);
  refillNests(); buildNests(); syncPets();
  if (auto && !first) {
    if (S.settings.autoSellCommon && ri === 0 && !S.equipped.includes(d.id)) { sellDragon(d.id, true); toast(`Auto-sold ${dragonDef(d).name}`); }
    else toast(`Hatched <b style="color:${RAR[ri].color}">${RAR[ri].name} ${dragonDef(d).name}</b>${isNew ? ' (new!)' : ''}`, 'good');
  } else {
    R.revealQ.push({ d, isNew, first }); if (!R.reveal) nextReveal();
  }
  if (S.tut <= 3) setTut(4);
  save();
}
function sellDragon(id, quiet) {
  const d = S.dragons.find(x => x.id === id); if (!d) return;
  const g = dragonSell(d);
  S.dragons = S.dragons.filter(x => x.id !== id); S.equipped = S.equipped.filter(x => x !== id);
  S.gold += g; S.stats.sold++; syncPets();
  if (!quiet) { SFX.coin(); toast(`Sold ${dragonDef(d).name} for ${coinI}${fmt(g)}`, 'gold'); }
}
function equipBest() {
  S.equipped = S.dragons.slice().sort((a, b) => dragonPower(b) - dragonPower(a)).slice(0, equipCap()).map(d => d.id);
  syncPets();
}
function toggleEquip(id) {
  if (S.equipped.includes(id)) S.equipped = S.equipped.filter(x => x !== id);
  else if (S.equipped.length < equipCap()) S.equipped.push(id);
  else {
    const weakest = equippedDragons().sort((a, b) => dragonPower(a) - dragonPower(b))[0];
    S.equipped = S.equipped.filter(x => x !== weakest.id); S.equipped.push(id);
  }
  syncPets();
}

function buyUpgrade(k) {
  const u = C.upgrades[k], c = lvlCost(u, S.up[k]);
  if (S.up[k] >= u.max || S.gold < c) return;
  S.gold -= c; S.up[k]++; SFX.buy();
  if (S.tut === 4) setTut(5);
}
function buyHoldDig() {
  if (S.holdDig || !canAfford(C.holdDig.cost)) return;
  pay(C.holdDig.cost); S.holdDig = true; SFX.buy();
  banner('Hold to Dig!', 'Hold on the ground to keep digging', '#ffd84a');
}
function buyGemUpgrade(k) {
  const u = C.gemUpgrades[k], c = lvlCost(u, S.gemUp[k]);
  if (S.gemUp[k] >= u.max || S.gems < c) return;
  S.gems -= c; S.gemUp[k]++; SFX.buy();
}
function craftPick() {
  const p = C.pickaxes[S.pick + 1]; if (!p || !canAfford(p.cost)) return;
  pay(p.cost); S.pick++; S.reinforce = 0; SFX.buy(); SFX.egg();
  banner(p.name + '!', 'x' + fmt(p.dmg / C.pickaxes[S.pick - 1].dmg) + ' dig damage', p.color);
  if (S.tut === 5) setTut(6);
}
function reinforcePick() {
  const c = reinforceCost(); if (!c || !canAfford(c)) return;
  pay(c); S.reinforce++; SFX.buy();
  banner('Reinforced!', `${C.pickaxes[S.pick].name} x${fmt(reinforceMult())} damage`, C.pickaxes[S.pick].color);
}
function buyNest() {
  const c = C.incubators.buy[S.nestBought]; if (!c || !canAfford(c)) return;
  pay(c); S.nestBought++; SFX.buy(); syncNestCount(); refillNests(); buildNests();
}
function buyEquipSlot() {
  const c = C.equip.buy[S.equipBought]; if (!c || !canAfford(c)) return;
  pay(c); S.equipBought++; SFX.buy();
}
function sellMats(m, keepNeeded) {
  let total = 0;
  for (const k of m ? [m] : Object.keys(S.mats)) {
    const keep = keepNeeded ? matsNeeded(k) : 0;
    const n = Math.max(0, Math.floor((S.mats[k] || 0) - keep));
    if (!n) continue;
    total += n * C.materials[k].sell * goldMult(); S.mats[k] -= n;
  }
  if (total) { S.gold += Math.ceil(total); SFX.coin(); toast(`Sold materials for ${coinI}${fmt(total)}`, 'gold'); }
}
const matsNeeded = m => [1, 2].reduce((a, k) => a + ((C.pickaxes[S.pick + k] || { cost: {} }).cost[m] || 0), 0);
function syncNestCount() { while (S.nests.length < nestCap()) S.nests.push(null); }

function skipCostGems(n) { return Math.max(1, Math.ceil(nestRemaining(n) * S.settings.timeScale * C.skip.gemsPerSec)); }
function skipCostRobux(n) { const s = nestRemaining(n) * S.settings.timeScale; return C.skip.robux.find(b => s <= b.maxSec).price; }
function skipNest(i, how) {
  const n = S.nests[i]; if (!n) return;
  if (how === 'gems') { const g = skipCostGems(n); if (S.gems < g) return; S.gems -= g; }
  n.dur = now() - n.start; closeSkip(); hatch(i);
}

function doRebirth() {
  const next = nextRebirth(); if (!next || S.maxDepth < next.depth) return;
  const keep = {
    gems: S.gems + next.gems,
    gemUp: S.gemUp, nests: S.nests, nestBought: S.nestBought, basket: S.basket, dragons: S.dragons, equipped: S.equipped,
    equipBought: S.equipBought, dex: S.dex, rebirths: S.rebirths + 1, bestDepth: Math.max(S.bestDepth, S.maxDepth),
    holdDig: S.holdDig, tut: 9, passes: S.passes, settings: S.settings, stats: S.stats, nextId: S.nextId, firstEggPlaced: true,
  };
  S = newGame(keep);
  R.px = S.player.c; R.py = S.player.r; R.camY = S.player.r; R.path = []; R.target = null; R.lastLayer = 0;
  ensureRows(); syncPets(); buildNests(); closePanel();
  SFX.hatch(4);
  syncNestCount(); refillNests(); buildNests();
  banner('Rebirth ' + S.rebirths + '!', `Gold and dig power x${fmt(next.mult)}` + (next.unlock ? ' · Unlocked ' + UNLOCK_NAMES[next.unlock] : ''), '#c77dff');
  save();
}

// Lift the player to the highest spot they can stand on, so blocks left behind above stay minable.
function surface() {
  let best = null;
  for (let c = 0; c < COLS; c++) {
    let r = 0; while (r <= S.genTo && !isSolid(r, c)) r++;
    const score = r * 10 + Math.abs(c - 3);
    if (!best || score < best.score) best = { r: r - 1, c, score };
  }
  S.player.r = best.r; S.player.c = best.c;
  R.px = best.c; R.py = best.r; R.camY = best.r; R.vy = 0; R.path = []; R.target = null; R.holding = false;
  R.pets = []; syncPets();
  SFX.buy(); addChips(best.c + 0.5, best.r + 0.5, '#9fe3ff', 10, 3);
  save();
}

function simulatePurchase(kind, id) {
  if (kind === 'pass') {
    S.passes[id] = true; syncNestCount(); refillNests(); buildNests();
    toast(`Simulated purchase: ${C.premium.gamepasses.find(p => p.id === id).name}`, 'good');
  } else {
    const p = C.premium.products.find(x => x.id === id);
    if (p.gems) S.gems += p.gems;
    if (id === 'serverLuck') startEvent('eggShower');
    toast(`Simulated purchase: ${p.name}`, 'good');
  }
  SFX.buy();
}

// ---------------------------------------------------------------- tutorial and goals
function setTut(n) { if (n > S.tut) { S.tut = n; R.hintSig = null; } }
function costChips(cost) {
  return Object.entries(cost).map(([k, v]) => {
    const have = k === 'gold' ? S.gold : (S.mats[k] || 0);
    return `<span class="${have >= v ? 'ok' : ''}">${k === 'gold' ? 'Gold' : C.materials[k].name} ${fmt(Math.min(have, v))}/${fmt(v)}</span>`;
  }).join('');
}
function goalHtml() {
  switch (S.tut) {
    case 0: return S.holdDig ? 'Tap the ground to dig. <b>Hold</b> to keep digging!' : '<b>Tap</b> the ground to dig!';
    case 1: return 'Something is glowing down there. <b>Dig to the egg!</b>';
    case 2: return 'Your egg is warming up in a <b>nest</b>. Keep digging!';
    case 3: return 'Your egg is ready! <b>Tap it</b> to hatch.';
  }
  if (S.tut === 4) {
    const c = lvlCost(C.upgrades.strength, S.up.strength);
    return S.gold >= c ? 'Your dragon digs with you! Open the <b>Shop</b> and buy <b>Strength</b>.' : `Your dragon digs with you! Collect ${coinI} gold for an upgrade.`;
  }
  if (!S.holdDig) return (canAfford(C.holdDig.cost) ? 'Tired of tapping? Buy <b>Hold to Dig</b> in the Shop!' : 'Tired of tapping? Save up for <b>Hold to Dig</b>.') + `<div class="need">${costChips(C.holdDig.cost)}</div>`;
  const rc = reinforceCost();
  if (rc) return `Reinforce your <b>${C.pickaxes[S.pick].name}</b> (${S.reinforce + 1}/${C.reinforce.costFrac.length}) for x${C.reinforce.dmgMult} damage<div class="need">${costChips(rc)}</div>`;
  const next = C.pickaxes[S.pick + 1];
  const nextLayer = C.layers.find(l => l.start > S.maxDepth);
  if (next && nextLayer && nextLayer.sealTier > S.pick) return `Craft the <b>${next.name}</b> to break into ${nextLayer.name}<div class="need">${costChips(next.cost)}</div>`;
  if (!nextRebirth()) return 'You climbed the whole rebirth ladder! <b>More rebirths arrive with updates.</b>';
  if (S.maxDepth >= rebirthDepth()) return '<b>Rebirth is ready!</b> Open Rebirth for a permanent boost.';
  return `Dig to <b>${rebirthDepth()} m</b> to unlock Rebirth`;
}

// ---------------------------------------------------------------- input
const cv = $('mine'), ctx = cv.getContext('2d');
let VW = 0, VH = 0, CS = 48, X0 = 0, DPR = 1;
function resize() {
  const r = $('mineWrap').getBoundingClientRect();
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  VW = r.width; VH = r.height; cv.width = Math.round(VW * DPR); cv.height = Math.round(VH * DPR);
  // Blocks are tap targets: keep them at least 48px by showing fewer rows on short screens,
  // and trim the side walls in portrait where width is the limit.
  const portrait = VH > VW;
  CS = Math.floor(Math.min(VW / (COLS + (portrait ? 0.6 : 1.2)), Math.max(VH / 7.2, 48), 84));
  X0 = Math.round((VW - COLS * CS) / 2);
  document.documentElement.style.setProperty('--hud-h', $('hud').getBoundingClientRect().height + 'px');
}
const camTop = () => R.camY - (VH / CS) * 0.36;
function screenToCell(x, y) { return [Math.floor(y / CS + camTop()), Math.floor((x - X0) / CS)]; }

cv.addEventListener('pointerdown', e => {
  audio(); e.preventDefault();
  cv.setPointerCapture && cv.setPointerCapture(e.pointerId);
  const rect = cv.getBoundingClientRect();
  const [r, c] = screenToCell(e.clientX - rect.left, e.clientY - rect.top);
  R.holding = true;
  if (!inCols(c)) return;
  if (isSolid(r, c)) {
    if (!exposed(r, c)) { addText(c + 0.5, r + 0.5, 'Dig closer', '#ffb3b3', 0.8, -0.6); return; }
    R.target = [r, c]; R.pendingTap = true; R.manual = true;
    if (!inReach(r, c)) { const a = approach(r, c); if (a) R.path = pathTo(a.cell, a.B); else { addText(c + 0.5, r + 0.5, "Can't reach", '#ffb3b3', 0.8, -0.6); R.target = null; } }
  } else if (walkable(r, c)) {
    const B = bfs(); if (B.dist.has(B.key(r, c))) { R.path = pathTo([r, c], B); R.target = null; }
  }
});
cv.addEventListener('contextmenu', e => e.preventDefault()); // long-press is hold-to-dig, not a menu
const release = () => { R.holding = false; };
cv.addEventListener('pointerup', release); cv.addEventListener('pointercancel', release); cv.addEventListener('pointerleave', release);
window.addEventListener('keydown', e => {
  if (e.repeat) return;
  if (e.key === ' ' || e.key === 'ArrowDown' || e.key === 's') {
    audio(); R.holding = true; R.keyHold = true;
    if (!S.holdDig) R.keyTap = true; // without Hold to Dig, each key press is one tap on the block below
  }
});
window.addEventListener('keyup', e => { if (R.keyHold) { R.holding = false; R.keyHold = false; } });

// ---------------------------------------------------------------- update
function swing() {
  const [r, c] = R.target; const cell = cellAt(r, c);
  R.cd = 1 / swingRate(); R.swingAnim = 0.16; R.lastSwingT = R.t; R.face = c < S.player.c ? -1 : c > S.player.c ? 1 : R.face;
  if (sealLocked(cell)) {
    SFX.clank(); R.shake = 0.06;
    if (R.sealWarnT <= 0) { addText(c + 0.5, r + 0.3, `Needs ${C.pickaxes[cell.t].name}`, '#ffb3b3', 1, -0.6); R.sealWarnT = 1.2; }
    R.holding = false; R.target = null; return;
  }
  let dmg = hitDamage(); const crit = Math.random() < 0.1; if (crit) dmg *= 2;
  cell.hp -= dmg;
  SFX.hit(layerIdx(r) / 6); if (crit) SFX.crit();
  addChips(c + 0.5, r + 0.5, layerOf(r).colors.b, 3, 2);
  addText(c + 0.5 + (Math.random() - 0.5) * 0.3, r + 0.3, (crit ? 'CRIT ' : '') + fmt(dmg), crit ? '#ffcf4a' : '#ffffff', crit ? 1.1 : 0.85, -1.6);
  if (cell.hp <= 0) breakCell(r, c, false);
  else if (cell.hp / cell.max < 0.34 && cell.hp + dmg >= cell.max * 0.34) SFX.crack();
}

function autoPick() {
  const B = bfs(10);
  let best = null, bestScore = Infinity;
  for (let r = S.player.r - 3; r <= S.player.r + 8; r++) for (let c = 0; c < COLS; c++) {
    const cell = cellAt(r, c); if (!cell || !exposed(r, c) || sealLocked(cell)) continue;
    let d = Infinity;
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) { const k = B.key(r + dr, c + dc); if (B.dist.has(k)) d = Math.min(d, B.dist.get(k)); }
    if (d === Infinity) continue;
    const bonus = { egg: 10, gem: 7, gold: 4, vein: 1.5 }[cell.k] || 0;
    const sc = d - bonus - (r - S.player.r) * 0.4 + (r < S.player.r ? 3 : 0);
    if (sc < bestScore) { bestScore = sc; best = [r, c]; }
  }
  if (!best) return;
  R.target = best; R.manual = false;
  if (!inReach(best[0], best[1])) { const a = approach(best[0], best[1], B); if (a) R.path = pathTo(a.cell, a.B); }
}

function updatePlayer(dt) {
  // Movement along path, then gravity.
  if (R.path.length) {
    const [nr, nc] = R.path[0];
    if (!walkable(nr, nc)) { R.path = []; }
    else {
      const sp = C.player.moveCellsPerSec * dt;
      R.px += clamp(nc - R.px, -sp, sp); R.py += clamp(nr - R.py, -sp, sp);
      if (nc !== S.player.c) R.face = nc < S.player.c ? -1 : 1;
      if (Math.abs(R.px - nc) < 0.01 && Math.abs(R.py - nr) < 0.01) { S.player.r = nr; S.player.c = nc; R.path.shift(); SFX.step(); }
    }
  } else if (walkable(S.player.r + 1, S.player.c)) {
    R.vy = (R.vy || 0) + 30 * dt; R.py += R.vy * dt;
    if (R.py >= S.player.r + 1) { S.player.r++; if (!walkable(S.player.r + 1, S.player.c)) { R.py = S.player.r; R.vy = 0; } }
  } else { R.py = lerp(R.py, S.player.r, 0.5); R.px = lerp(R.px, S.player.c, 0.5); R.vy = 0; }
  R.moving = R.path.length > 0 || Math.abs(R.py - S.player.r) > 0.05;
  if (S.player.r > S.maxDepth) S.maxDepth = S.player.r;

  // Targeting and swinging.
  if (R.target && !isSolid(R.target[0], R.target[1])) R.target = null;
  const hold = R.holding && S.holdDig;
  if (R.holding && !S.holdDig && !R.keyHold) {
    // Nudge kids who hold before they own Hold to Dig.
    R.holdT = (R.holdT || 0) + dt;
    if (R.holdT > 0.9 && R.t > (R.holdHintT || 0)) { addText(R.px + 0.5, R.py - 0.1, 'Tap, tap, tap!', '#ffd84a', 0.9, -0.8); R.holdHintT = R.t + 4; }
  } else R.holdT = 0;
  if (R.keyTap && !R.moving) {
    R.keyTap = false; const b = [S.player.r + 1, S.player.c];
    if (cellAt(b[0], b[1])) { R.target = b; R.pendingTap = true; R.manual = true; }
  }
  if (!R.target && hold && !R.moving) {
    const b = [S.player.r + 1, S.player.c]; const cell = cellAt(b[0], b[1]);
    if (cell && !sealLocked(cell)) { R.target = b; R.manual = true; }
  }
  const auto = S.settings.autoDig && autoDigUnlocked();
  if (auto && !R.target && !R.moving && !R.holding) { R.autoT -= dt; if (R.autoT <= 0) { R.autoT = 0.15; autoPick(); } }
  R.cd -= dt;
  if (R.target && !R.moving && R.cd <= 0 && inReach(R.target[0], R.target[1]) && (hold || R.pendingTap || (auto && !R.manual))) { R.pendingTap = false; swing(); }
  if (R.target && !R.moving && !R.path.length && !inReach(R.target[0], R.target[1]) && !R.holding) R.target = null;
  R.swingAnim = Math.max(0, R.swingAnim - dt);
  R.sealWarnT -= dt;

  // Layer change.
  const li = layerIdx(Math.max(0, S.player.r));
  if (li !== R.lastLayer) {
    R.lastLayer = li; const L = C.layers[li];
    if (!S.seenLayers[li]) { S.seenLayers[li] = true; }
    banner(L.name, `New egg: ${EGG[L.egg].name}`, L.colors.accent);
  }
}

const PET_HOME = [[-0.85, -0.55], [0.85, -0.55], [-1.25, 0.25], [1.25, 0.25], [0, -1.05], [-0.6, -1.2], [0.6, -1.2], [0, 0.9]];
function syncPets() {
  const eq = equippedDragons();
  R.pets = eq.map((d, i) => { const old = R.pets.find(p => p.id === d.id); return old || { id: d.id, d, x: R.px + 0.5 + PET_HOME[i % 8][0], y: R.py + 0.5 + PET_HOME[i % 8][1], target: null, acc: 0, t: Math.random() * 10 }; });
}
function updatePets(dt) {
  const mult = petMult();
  R.petNumT -= dt;
  let shownDmg = 0, shownAt = null;
  const digging = R.t - R.lastSwingT < C.player.dragonsDigForSec;
  R.pets.forEach((p, i) => {
    p.t += dt;
    if (!digging) p.target = null;
    if (p.target && !isSolid(p.target[0], p.target[1])) p.target = null;
    if (p.target && Math.max(Math.abs(p.target[0] - S.player.r), Math.abs(p.target[1] - S.player.c)) > 3) p.target = null;
    if (!p.target && digging) {
      p.retarget = (p.retarget || 0) - dt;
      if (p.retarget <= 0) {
        p.retarget = 0.4;
        const taken = new Set(R.pets.filter(q => q.target).map(q => q.target.join()));
        const cand = [];
        for (let r = S.player.r - 1; r <= S.player.r + 2; r++) for (let c = S.player.c - 2; c <= S.player.c + 2; c++) {
          const cell = cellAt(r, c); if (cell && cell.k !== 'seal' && exposed(r, c) && !taken.has(r + ',' + c)) cand.push([r, c]);
        }
        if (cand.length) p.target = cand[Math.floor(Math.random() * cand.length)];
      }
    }
    let tx, ty;
    if (p.target) {
      const vx = (R.px + 0.5) - (p.target[1] + 0.5), vy = (R.py + 0.5) - (p.target[0] + 0.5), l = Math.hypot(vx, vy) || 1;
      tx = p.target[1] + 0.5 + vx / l * 0.55; ty = p.target[0] + 0.5 + vy / l * 0.55 - 0.15;
    } else { tx = R.px + 0.5 + PET_HOME[i % 8][0]; ty = R.py + 0.5 + PET_HOME[i % 8][1] + Math.sin(p.t * 2) * 0.08; }
    p.x = lerp(p.x, tx, Math.min(1, dt * 6)); p.y = lerp(p.y, ty, Math.min(1, dt * 6));
    p.face = tx < p.x ? -1 : 1;
    if (p.target && Math.hypot(p.x - tx, p.y - ty) < 0.35) {
      const cell = cellAt(p.target[0], p.target[1]);
      const dmg = dragonPower(p.d) * mult * dt;
      cell.hp -= dmg; p.acc += dmg; p.puff = (p.puff || 0) - dt;
      if (p.puff <= 0) { p.puff = 0.3; addSparks(p.target[1] + 0.5, p.target[0] + 0.5, dragonDef(p.d).wing, 2); }
      if (R.petNumT <= 0 && p.acc > 0) { shownDmg += p.acc; shownAt = shownAt || [p.target[1] + 0.5, p.target[0] + 0.5]; p.acc = 0; }
      if (cell.hp <= 0) breakCell(p.target[0], p.target[1], true);
    }
  });
  if (R.petNumT <= 0) { R.petNumT = 0.6; if (shownAt && shownDmg >= 0.5) addText(shownAt[0], shownAt[1] + 0.2, fmt(shownDmg), '#ffc2e2', 0.7, -1); }
}

function updateParticles(dt) {
  for (const p of R.particles) {
    p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.kind === 'chip') p.vy += 14 * dt;
    if (p.kind === 'text') p.vy *= 0.95;
    if (p.kind === 'spark') { p.vx *= 0.94; p.vy *= 0.94; }
  }
  R.particles = R.particles.filter(p => p.life > 0);
  if (R.particles.length > 400) R.particles.splice(0, R.particles.length - 400);
}

function startEvent(id) {
  const ev = C.events.list.find(e => e.id === id) || C.events.list[EV.idx++ % C.events.list.length];
  EV.active = Object.assign({ ends: EV.t + C.events.durationSec }, ev);
  EV.next = EV.t + C.events.durationSec + C.events.everySec;
  banner(ev.name + '!', ev.desc, '#ffc93c'); SFX.hatch(2);
}
function updateEvents(dt) {
  EV.t += dt;
  if (EV.active && EV.active.ends <= EV.t) { toast(`${EV.active.name} is over`); EV.active = null; }
  if (!EV.active && EV.t >= EV.next) startEvent();
}

function updateNests() {
  S.nests.forEach((n, i) => {
    if (!n) return;
    if (nestRemaining(n) <= 0) {
      if (autoHatchOn() && !R.reveal) hatch(i, true);
      else if (S.tut === 2) setTut(3);
    }
  });
}

// ---------------------------------------------------------------- drawing: dragons and eggs
function roundRect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function star(c, x, y, r, n = 5, inner = 0.45) { c.beginPath(); for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / n, rr = i % 2 ? r * inner : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.closePath(); }
function drawDragon(c, x, y, s, d, t, opts = {}) {
  const flap = Math.sin(t * 9) * 0.35, bob = Math.sin(t * 3) * s * 0.04;
  c.save(); c.translate(x, y + bob); if (opts.flip) c.scale(-1, 1);
  if (opts.silhouette) { c.globalAlpha = 0.9; }
  const body = opts.silhouette ? '#120c22' : d.body, belly = opts.silhouette ? '#120c22' : d.belly, wing = opts.silhouette ? '#0b0716' : d.wing;
  c.lineJoin = 'round'; c.lineWidth = s * 0.06; c.strokeStyle = opts.silhouette ? '#3b2f66' : 'rgba(40,20,40,.55)';
  // wings
  for (const side of [-1, 1]) {
    c.save(); c.translate(-s * 0.15 * side - s * 0.1, -s * 0.05); c.rotate(side * (0.5 + flap) - 0.2);
    c.fillStyle = wing; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(side * -s * 0.75, -s * 0.85, side * -s * 0.95, -s * 0.2); c.quadraticCurveTo(side * -s * 0.55, -s * 0.25, side * -s * 0.5, s * 0.1); c.quadraticCurveTo(side * -s * 0.25, 0, 0, s * 0.15); c.closePath(); c.fill(); c.stroke();
    c.restore();
  }
  // tail
  c.fillStyle = body; c.beginPath(); c.moveTo(-s * 0.45, s * 0.35); c.quadraticCurveTo(-s * 1.05, s * 0.55, -s * 0.95, s * 0.05); c.quadraticCurveTo(-s * 0.85, s * 0.35, -s * 0.35, s * 0.12); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = wing; c.beginPath(); c.moveTo(-s * 0.95, s * 0.05); c.lineTo(-s * 1.12, -s * 0.12); c.lineTo(-s * 0.82, -s * 0.02); c.closePath(); c.fill();
  if (d.feature === 'flame' && !opts.silhouette) { c.fillStyle = '#ffcf4a'; c.beginPath(); c.ellipse(-s * 1.08, -s * 0.18, s * 0.09, s * 0.16 + Math.sin(t * 20) * s * 0.03, -0.5, 0, 7); c.fill(); }
  if (d.feature === 'spikes') { c.fillStyle = wing; for (let k = 0; k < 3; k++) { c.beginPath(); const bx = -s * 0.35 + k * s * 0.22; c.moveTo(bx - s * 0.1, -s * 0.15 + k * -s * 0.05); c.lineTo(bx, -s * 0.38 - k * s * 0.05); c.lineTo(bx + s * 0.1, -s * 0.18 - k * s * 0.05); c.fill(); } }
  if (d.feature === 'crystal') { c.fillStyle = opts.silhouette ? wing : '#ffffff'; c.globalAlpha *= 0.85; for (let k = 0; k < 3; k++) { const bx = -s * 0.32 + k * s * 0.2; c.beginPath(); c.moveTo(bx - s * 0.07, -s * 0.12); c.lineTo(bx, -s * 0.42 - (k % 2) * s * 0.1); c.lineTo(bx + s * 0.07, -s * 0.12); c.fill(); } c.globalAlpha = opts.silhouette ? 0.9 : 1; }
  // feet
  c.fillStyle = body; for (const fx of [-0.25, 0.2]) { c.beginPath(); c.ellipse(fx * s, s * 0.62, s * 0.16, s * 0.1, 0, 0, 7); c.fill(); c.stroke(); }
  // body
  c.fillStyle = body; c.beginPath(); c.ellipse(-s * 0.02, s * 0.25, s * 0.52, s * 0.44, 0, 0, 7); c.fill(); c.stroke();
  c.fillStyle = belly; c.beginPath(); c.ellipse(s * 0.06, s * 0.33, s * 0.3, s * 0.29, 0, 0, 7); c.fill();
  // head
  const hx = s * 0.22, hy = -s * 0.28, hr = s * 0.46;
  if (d.feature === 'horns' || d.feature === 'crown' || d.feature === 'gem') {
    c.fillStyle = opts.silhouette ? body : (d.feature === 'horns' ? '#fff3d6' : body);
    for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(hx + sx * hr * 0.35 - s * 0.08, hy - hr * 0.7); c.lineTo(hx + sx * hr * 0.55, hy - hr * 1.25); c.lineTo(hx + sx * hr * 0.35 + s * 0.08, hy - hr * 0.75); c.closePath(); c.fill(); c.stroke(); }
  }
  c.fillStyle = body; c.beginPath(); c.ellipse(hx, hy, hr, hr * 0.9, 0, 0, 7); c.fill(); c.stroke();
  // snout
  c.fillStyle = belly; c.beginPath(); c.ellipse(hx + hr * 0.45, hy + hr * 0.3, hr * 0.42, hr * 0.32, 0, 0, 7); c.fill();
  if (!opts.silhouette) {
    c.fillStyle = 'rgba(60,20,30,.6)'; c.beginPath(); c.arc(hx + hr * 0.62, hy + hr * 0.22, s * 0.025, 0, 7); c.arc(hx + hr * 0.38, hy + hr * 0.2, s * 0.025, 0, 7); c.fill();
    // eyes
    const blink = (Math.sin(t * 0.9 + (d.name || '').length) > 0.985) ? 0.15 : 1;
    for (const ex of [-0.18, 0.28]) {
      c.fillStyle = '#1c1028'; c.beginPath(); c.ellipse(hx + ex * hr, hy - hr * 0.12, hr * 0.17, hr * 0.22 * blink, 0, 0, 7); c.fill();
      if (blink > 0.5) { c.fillStyle = '#fff'; c.beginPath(); c.arc(hx + ex * hr + hr * 0.06, hy - hr * 0.22, hr * 0.07, 0, 7); c.fill(); c.beginPath(); c.arc(hx + ex * hr - hr * 0.05, hy - hr * 0.04, hr * 0.035, 0, 7); c.fill(); }
    }
    c.fillStyle = 'rgba(255,120,150,.45)'; c.beginPath(); c.ellipse(hx - hr * 0.42, hy + hr * 0.2, hr * 0.13, hr * 0.08, 0, 0, 7); c.fill();
    c.strokeStyle = 'rgba(60,20,30,.7)'; c.lineWidth = s * 0.035; c.beginPath(); c.arc(hx + hr * 0.42, hy + hr * 0.42, hr * 0.12, 0.3, 2.6); c.stroke();
  }
  // head features
  const fx = hx - hr * 0.05, fy = hy - hr * 0.9;
  c.lineWidth = s * 0.04; c.strokeStyle = 'rgba(40,20,40,.5)';
  const fcol = opts.silhouette ? body : null;
  switch (d.feature) {
    case 'leaf': c.fillStyle = fcol || '#5fd35f'; c.beginPath(); c.ellipse(fx, fy - s * 0.05, s * 0.1, s * 0.2, 0.5, 0, 7); c.fill(); c.stroke(); break;
    case 'flower': for (let k = 0; k < 5; k++) { c.fillStyle = fcol || '#ffffff'; c.beginPath(); c.arc(fx + Math.cos(k * 1.256) * s * 0.09, fy + Math.sin(k * 1.256) * s * 0.09, s * 0.07, 0, 7); c.fill(); } c.fillStyle = fcol || '#ffd84a'; c.beginPath(); c.arc(fx, fy, s * 0.06, 0, 7); c.fill(); break;
    case 'clover': for (let k = 0; k < 3; k++) { c.fillStyle = fcol || '#2a9e62'; c.beginPath(); c.arc(fx + Math.cos(k * 2.09 - 1.57) * s * 0.08, fy + Math.sin(k * 2.09 - 1.57) * s * 0.08, s * 0.075, 0, 7); c.fill(); } break;
    case 'sun': c.fillStyle = fcol || '#ffa928'; star(c, fx, fy, s * 0.16, 8, 0.6); c.fill(); break;
    case 'gem': c.fillStyle = fcol || '#62e3ff'; c.beginPath(); c.moveTo(hx, hy - hr * 0.62); c.lineTo(hx + s * 0.07, hy - hr * 0.5); c.lineTo(hx, hy - hr * 0.36); c.lineTo(hx - s * 0.07, hy - hr * 0.5); c.closePath(); c.fill(); break;
    case 'mushroom': c.fillStyle = fcol || '#ff5d6c'; c.beginPath(); c.ellipse(fx, fy + s * 0.02, s * 0.26, s * 0.15, 0, Math.PI, 0); c.fill(); c.stroke(); if (!fcol) { c.fillStyle = '#fff'; [[-0.1, -0.06], [0.07, -0.09], [0.14, -0.01]].forEach(([a, b]) => { c.beginPath(); c.arc(fx + a * s, fy + b * s, s * 0.035, 0, 7); c.fill(); }); } break;
    case 'antenna': c.strokeStyle = fcol || body; c.lineWidth = s * 0.035; for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(fx + sx * s * 0.08, fy + s * 0.08); c.quadraticCurveTo(fx + sx * s * 0.12, fy - s * 0.1, fx + sx * s * 0.2, fy - s * 0.15); c.stroke(); c.fillStyle = fcol || '#fffbb0'; c.beginPath(); c.arc(fx + sx * s * 0.2, fy - s * 0.15, s * 0.06, 0, 7); c.fill(); } break;
    case 'flame': c.fillStyle = fcol || '#ffcf4a'; c.beginPath(); c.moveTo(fx - s * 0.1, fy + s * 0.06); c.quadraticCurveTo(fx - s * 0.08, fy - s * 0.2, fx, fy - s * 0.26 - Math.sin(t * 14) * s * 0.03); c.quadraticCurveTo(fx + s * 0.1, fy - s * 0.1, fx + s * 0.1, fy + s * 0.06); c.fill(); break;
    case 'snow': c.strokeStyle = fcol || '#ffffff'; c.lineWidth = s * 0.035; for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(fx + Math.cos(k * 1.05) * s * 0.13, fy + Math.sin(k * 1.05) * s * 0.13); c.lineTo(fx - Math.cos(k * 1.05) * s * 0.13, fy - Math.sin(k * 1.05) * s * 0.13); c.stroke(); } break;
    case 'star': c.fillStyle = fcol || '#ffd76a'; star(c, fx, fy - s * 0.02, s * 0.15); c.fill(); c.stroke(); break;
    case 'moon': c.fillStyle = fcol || '#ffd76a'; c.beginPath(); c.arc(fx, fy, s * 0.13, 0, 7); c.fill(); c.fillStyle = body; c.beginPath(); c.arc(fx + s * 0.06, fy - s * 0.04, s * 0.11, 0, 7); c.fill(); break;
    case 'crown': c.fillStyle = fcol || '#ffc93c'; c.beginPath(); c.moveTo(fx - s * 0.15, fy + s * 0.06); c.lineTo(fx - s * 0.17, fy - s * 0.12); c.lineTo(fx - s * 0.07, fy - s * 0.03); c.lineTo(fx, fy - s * 0.17); c.lineTo(fx + s * 0.07, fy - s * 0.03); c.lineTo(fx + s * 0.17, fy - s * 0.12); c.lineTo(fx + s * 0.15, fy + s * 0.06); c.closePath(); c.fill(); c.stroke(); break;
  }
  c.restore();
}
function drawEgg(c, x, y, s, egg, t, wobble = 0, crack = 0) {
  c.save(); c.translate(x, y + s * 0.5); c.rotate(Math.sin(t * 18) * wobble * 0.25); c.translate(0, -s * 0.5);
  c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(0, s * 0.52, s * 0.36, s * 0.08, 0, 0, 7); c.fill();
  c.beginPath(); c.moveTo(0, -s * 0.55); c.bezierCurveTo(s * 0.42, -s * 0.55, s * 0.48, s * 0.5, 0, s * 0.5); c.bezierCurveTo(-s * 0.48, s * 0.5, -s * 0.42, -s * 0.55, 0, -s * 0.55); c.closePath();
  c.fillStyle = egg.shell; c.fill(); c.lineWidth = s * 0.05; c.strokeStyle = 'rgba(40,20,40,.45)'; c.stroke();
  c.save(); c.clip();
  c.fillStyle = egg.spots; [[-0.18, -0.15, 0.1], [0.16, 0.05, 0.13], [-0.1, 0.28, 0.08], [0.2, -0.32, 0.06], [-0.28, 0.1, 0.05]].forEach(([a, b, r]) => { c.beginPath(); c.arc(a * s, b * s, r * s, 0, 7); c.fill(); });
  c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(-s * 0.15, -s * 0.28, s * 0.07, s * 0.13, -0.4, 0, 7); c.fill();
  c.restore();
  if (crack > 0) {
    c.strokeStyle = 'rgba(40,20,40,.8)'; c.lineWidth = s * 0.04; c.beginPath();
    c.moveTo(-s * 0.4, -s * 0.02); const n = Math.ceil(crack * 6);
    for (let k = 1; k <= n; k++) c.lineTo(-s * 0.4 + k * s * 0.13, (k % 2 ? -s * 0.12 : s * 0.04));
    c.stroke();
  }
  c.restore();
}
function drawPick(c, x, y, s, color, ang) {
  c.save(); c.translate(x, y); c.rotate(ang);
  c.fillStyle = '#7a4a22'; c.fillRect(-s * 0.05, -s * 0.05, s * 0.1, s * 0.75);
  c.fillStyle = color; c.strokeStyle = 'rgba(30,20,30,.6)'; c.lineWidth = s * 0.05;
  c.beginPath(); c.moveTo(-s * 0.45, s * 0.05); c.quadraticCurveTo(0, -s * 0.25, s * 0.45, s * 0.05); c.quadraticCurveTo(0, -s * 0.08, -s * 0.45, s * 0.05); c.fill(); c.stroke();
  c.restore();
}

// ---------------------------------------------------------------- drawing: world
function drawBlock(c, cell, r, col, x, y, s, revealed) {
  const L = layerOf(r), P = L.colors;
  const v = hash2(r, col) % 3;
  c.fillStyle = cell.k === 'seal' ? P.dark : (v === 0 ? P.a : P.b);
  roundRect(c, x + 1, y + 1, s - 2, s - 2, s * 0.14); c.fill();
  c.fillStyle = 'rgba(255,255,255,.08)'; c.fillRect(x + 3, y + 3, s - 6, s * 0.16);
  c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(x + 3, y + s * 0.8, s - 6, s * 0.16);
  // speckles
  const rng = mulberry(hash2(r * 31, col)); c.fillStyle = P.dark;
  for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(x + s * (0.2 + rng() * 0.6), y + s * (0.25 + rng() * 0.55), s * 0.035, 0, 7); c.fill(); }
  const cx = x + s / 2, cy = y + s / 2;
  if (!revealed && cell.k !== 'base' && cell.k !== 'seal') {
    c.fillStyle = `rgba(255,255,230,${0.35 + 0.35 * Math.sin(R.t * 3 + r + col)})`; star(c, cx + s * 0.18, cy - s * 0.15, s * 0.07, 4, 0.35); c.fill();
  } else if (cell.k === 'vein') {
    c.fillStyle = C.materials[cell.m].color; c.strokeStyle = 'rgba(0,0,0,.3)'; c.lineWidth = 1.5;
    for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(x + s * (0.25 + rng() * 0.5), y + s * (0.25 + rng() * 0.5), s * (0.08 + rng() * 0.05), 0, 7); c.fill(); c.stroke(); }
  } else if (cell.k === 'gold') {
    for (let k = 0; k < 4; k++) { const gx = x + s * (0.25 + rng() * 0.5), gy = y + s * (0.25 + rng() * 0.5); c.fillStyle = '#ffc93c'; c.beginPath(); c.arc(gx, gy, s * 0.09, 0, 7); c.fill(); c.fillStyle = '#fff3b0'; c.beginPath(); c.arc(gx - s * 0.03, gy - s * 0.03, s * 0.03, 0, 7); c.fill(); }
    if (Math.sin(R.t * 4 + col * 2 + r) > 0.9) { c.fillStyle = '#fff'; star(c, cx + s * 0.2, cy - s * 0.2, s * 0.08, 4, 0.3); c.fill(); }
  } else if (cell.k === 'gem') {
    c.save(); c.translate(cx, cy); c.fillStyle = '#62e3ff'; c.strokeStyle = '#1d7fa0'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(0, -s * 0.26); c.lineTo(s * 0.2, -s * 0.05); c.lineTo(0, s * 0.26); c.lineTo(-s * 0.2, -s * 0.05); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.moveTo(0, -s * 0.2); c.lineTo(s * 0.08, -s * 0.05); c.lineTo(0, 0); c.closePath(); c.fill(); c.restore();
  } else if (cell.k === 'egg') {
    const g = c.createRadialGradient(cx, cy, s * 0.05, cx, cy, s * 0.55); g.addColorStop(0, 'rgba(255,250,200,.75)'); g.addColorStop(1, 'rgba(255,250,200,0)');
    c.fillStyle = g; c.fillRect(x, y, s, s);
    drawEgg(c, cx, cy + s * 0.04, s * 0.62, EGG[cell.e], R.t, 0.15);
  } else if (cell.k === 'seal') {
    c.strokeStyle = 'rgba(255,255,255,.15)'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(x + 4, y + s * 0.3); c.lineTo(x + s - 4, y + s * 0.3); c.moveTo(x + 4, y + s * 0.7); c.lineTo(x + s - 4, y + s * 0.7); c.stroke();
    if (col === 3) { drawPick(c, cx, cy - s * 0.05, s * 0.55, C.pickaxes[cell.t].color, -0.6); }
    if (sealLocked(cell) && col !== 3) { c.fillStyle = 'rgba(255,255,255,.55)'; roundRect(c, cx - s * 0.11, cy - s * 0.02, s * 0.22, s * 0.18, 3); c.fill(); c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 2.5; c.beginPath(); c.arc(cx, cy - s * 0.04, s * 0.08, Math.PI, 0); c.stroke(); }
  }
  // cracks
  const dmg = 1 - cell.hp / cell.max;
  if (dmg > 0.05) {
    c.strokeStyle = 'rgba(20,10,10,.7)'; c.lineWidth = Math.max(1.5, s * 0.035);
    const cr = mulberry(hash2(col * 7, r * 13)); const n = 1 + Math.floor(dmg * 4);
    c.beginPath();
    for (let k = 0; k < n; k++) { let px = x + s * (0.3 + cr() * 0.4), py = y + s * (0.3 + cr() * 0.4); c.moveTo(px, py); for (let j = 0; j < 3; j++) { px += (cr() - 0.5) * s * 0.35; py += (cr() - 0.5) * s * 0.35; c.lineTo(clamp(px, x + 3, x + s - 3), clamp(py, y + 3, y + s - 3)); } }
    c.stroke();
  }
}

function drawPlayer(c, x, y, s) {
  const bob = R.moving ? Math.sin(R.t * 18) * s * 0.03 : 0;
  c.save(); c.translate(x, y + bob); c.scale(R.face, 1);
  // body
  c.fillStyle = '#3d7bd9'; roundRect(c, -s * 0.2, -s * 0.05, s * 0.4, s * 0.38, s * 0.1); c.fill();
  c.fillStyle = '#2a2a3a'; c.fillRect(-s * 0.17, s * 0.3, s * 0.12, s * 0.14); c.fillRect(s * 0.05, s * 0.3, s * 0.12, s * 0.14);
  // head
  c.fillStyle = '#ffd7a8'; c.beginPath(); c.arc(0, -s * 0.2, s * 0.19, 0, 7); c.fill();
  c.fillStyle = '#1c1028'; c.beginPath(); c.arc(s * 0.07, -s * 0.22, s * 0.03, 0, 7); c.arc(-s * 0.04, -s * 0.22, s * 0.03, 0, 7); c.fill();
  // helmet + lamp
  c.fillStyle = '#ffcf4a'; c.beginPath(); c.arc(0, -s * 0.25, s * 0.21, Math.PI, 0); c.fill(); c.fillRect(-s * 0.24, -s * 0.27, s * 0.48, s * 0.06);
  c.fillStyle = '#fffbe0'; c.beginPath(); c.arc(s * 0.08, -s * 0.36, s * 0.05, 0, 7); c.fill();
  // pick
  const sw = R.swingAnim > 0 ? (R.swingAnim / 0.16) : 0;
  const ang = R.target && R.target[0] > S.player.r && R.target[1] === S.player.c ? lerp(0.6, -1.3, sw) + 1.2 : lerp(0.2, -1.6, sw);
  drawPick(c, s * 0.15, s * 0.08, s * 0.5, C.pickaxes[S.pick].color, ang);
  c.restore();
}

function render() {
  const s = CS, top = camTop(), shake = R.shake > 0 ? R.shake * s * 0.25 : 0;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  const L = layerOf(Math.max(0, Math.floor(R.camY)));
  ctx.fillStyle = L.colors.bg; ctx.fillRect(0, 0, VW, VH);
  ctx.save(); ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
  const r0 = Math.floor(top) - 1, r1 = Math.ceil(top + VH / s) + 1;
  const yOf = r => (r - top) * s;
  // sky
  if (r0 < 0) {
    const yg = yOf(0);
    const g = ctx.createLinearGradient(0, yg - VH, 0, yg); g.addColorStop(0, '#5ec8ff'); g.addColorStop(1, '#bfeaff');
    ctx.fillStyle = g; ctx.fillRect(0, 0, VW, Math.max(0, yg));
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    for (let k = 0; k < 4; k++) { const cx = ((k * 211 + R.t * 8 * (k + 1)) % (VW + 200)) - 100, cy = yg - s * (2.2 + (k % 3) * 0.8); ctx.beginPath(); ctx.ellipse(cx, cy, s * 0.7, s * 0.25, 0, 0, 7); ctx.ellipse(cx + s * 0.4, cy - s * 0.12, s * 0.45, s * 0.25, 0, 0, 7); ctx.fill(); }
    // hills
    ctx.fillStyle = '#6cc04a'; ctx.beginPath(); ctx.moveTo(0, yg); for (let x = 0; x <= VW; x += 20) ctx.lineTo(x, yg - s * 0.6 - Math.sin(x / 90) * s * 0.3); ctx.lineTo(VW, yg); ctx.fill();
    ctx.fillStyle = '#7ed957'; ctx.fillRect(0, yg - s * 0.18, VW, s * 0.22);
  }
  // side walls
  for (let r = Math.max(0, r0); r <= r1; r++) {
    const P = layerOf(r).colors; ctx.fillStyle = P.dark;
    ctx.fillRect(0, yOf(r), X0, s + 1); ctx.fillRect(X0 + COLS * s, yOf(r), VW - X0 - COLS * s, s + 1);
  }
  // dug background
  for (let r = Math.max(0, r0); r <= r1; r++) { ctx.fillStyle = layerOf(r).colors.bg; ctx.fillRect(X0, yOf(r), COLS * s, s + 1); }
  // layer boundary labels on the side walls
  for (const Ly of C.layers) if (Ly.start >= r0 && Ly.start <= r1 && Ly.start > 0) {
    ctx.fillStyle = Ly.colors.accent; ctx.font = `600 ${Math.max(11, s * 0.24)}px Fredoka, sans-serif`; ctx.textAlign = 'right';
    ctx.fillText(Ly.start + ' m', X0 - 6, yOf(Ly.start) + s * 0.55);
  }
  // blocks
  for (let r = Math.max(0, r0); r <= r1; r++) for (let c = 0; c < COLS; c++) {
    const cell = cellAt(r, c); if (!cell) continue;
    const revealed = r - S.player.r <= 6 || cell.first;
    drawBlock(ctx, cell, r, c, X0 + c * s, yOf(r), s, revealed);
  }
  // depth darkness
  const dg = ctx.createRadialGradient(X0 + (R.px + 0.5) * s, yOf(R.py + 0.5), s * 2, X0 + (R.px + 0.5) * s, yOf(R.py + 0.5), s * 6.5);
  dg.addColorStop(0, 'rgba(0,0,0,0)'); dg.addColorStop(1, `rgba(0,0,0,${clamp(S.player.r / 120, 0, 0.45)})`);
  ctx.fillStyle = dg; ctx.fillRect(0, 0, VW, VH);
  // target highlight
  if (R.target && isSolid(R.target[0], R.target[1])) {
    const [tr, tc] = R.target, cell = cellAt(tr, tc), x = X0 + tc * s, y = yOf(tr);
    ctx.strokeStyle = sealLocked(cell) ? '#ff6b6b' : 'rgba(255,255,255,.9)'; ctx.lineWidth = 3; roundRect(ctx, x + 2, y + 2, s - 4, s - 4, s * 0.14); ctx.stroke();
    if (cell.hp < cell.max) { ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(x + 6, y - 9, s - 12, 6); ctx.fillStyle = '#5fd35f'; ctx.fillRect(x + 6, y - 9, (s - 12) * clamp(cell.hp / cell.max, 0, 1), 6); }
  }
  // tutorial arrow
  let arrow = null;
  if (S.tut === 0) arrow = [S.player.r + 1, S.player.c];
  if (S.tut === 1) for (let r = S.player.r; r < S.player.r + 8 && !arrow; r++) for (let c = 0; c < COLS; c++) { const cell = cellAt(r, c); if (cell && cell.k === 'egg') { arrow = [r, c]; break; } }
  if (arrow) {
    const ax = X0 + (arrow[1] + 0.5) * s, ay = yOf(arrow[0]) - s * 0.15 + Math.sin(R.t * 6) * s * 0.08;
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#1c1028'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax - s * 0.18, ay - s * 0.22); ctx.lineTo(ax - s * 0.07, ay - s * 0.22); ctx.lineTo(ax - s * 0.07, ay - s * 0.45); ctx.lineTo(ax + s * 0.07, ay - s * 0.45); ctx.lineTo(ax + s * 0.07, ay - s * 0.22); ctx.lineTo(ax + s * 0.18, ay - s * 0.22); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  // pets behind player
  for (const p of R.pets) drawDragon(ctx, X0 + p.x * s, yOf(p.y), s * 0.4, dragonDef(p.d), p.t, { flip: p.face < 0 });
  drawPlayer(ctx, X0 + (R.px + 0.5) * s, yOf(R.py + 0.5) + s * 0.06, s);
  // particles
  for (const p of R.particles) {
    const a = clamp(p.life / p.max, 0, 1), x = X0 + p.x * s, y = yOf(p.y);
    if (p.kind === 'text') {
      ctx.globalAlpha = Math.min(1, a * 1.6); ctx.font = `700 ${Math.round(s * 0.3 * p.size)}px Fredoka, sans-serif`; ctx.textAlign = 'center';
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(20,10,30,.85)'; ctx.strokeText(p.text, x, y); ctx.fillStyle = p.color; ctx.fillText(p.text, x, y);
    } else { ctx.globalAlpha = a; ctx.fillStyle = p.color; if (p.kind === 'spark') { star(ctx, x, y, p.size * s, 4, 0.4); ctx.fill(); } else ctx.fillRect(x - p.size * s / 2, y - p.size * s / 2, p.size * s, p.size * s); }
  }
  ctx.globalAlpha = 1;
  // event tint
  const ev = activeEvent();
  if (ev && ev.id === 'goldRush') { ctx.fillStyle = `rgba(255,200,60,${0.06 + 0.03 * Math.sin(R.t * 3)})`; ctx.fillRect(0, 0, VW, VH); }
  if (ev && ev.id === 'eggShower') for (let k = 0; k < 6; k++) { const ex = ((k * 137 + R.t * 40) % VW), ey = ((k * 91 + R.t * 120) % (VH + 40)) - 20; ctx.globalAlpha = 0.35; drawEgg(ctx, ex, ey, s * 0.3, EGG[L.egg], R.t); ctx.globalAlpha = 1; }
  ctx.restore();
}

// ---------------------------------------------------------------- HUD and nests DOM
let hudCache = {};
function setText(id, v) { if (hudCache[id] !== v) { hudCache[id] = v; $(id).innerHTML = v; } }
function updateHud() {
  setText('gold', fmt(S.gold)); setText('gems', fmt(S.gems));
  const d = Math.max(0, S.player.r);
  setText('depthM', d + ' m');
  const li = layerIdx(d), L = C.layers[li], next = C.layers[li + 1];
  setText('layerName', L.name);
  $('layerBar').style.width = (next ? clamp((d - L.start) / (next.start - L.start), 0, 1) * 100 : 100) + '%';
  document.documentElement.style.setProperty('--layer-accent', L.colors.accent);
  const ev = activeEvent();
  $('event').classList.toggle('on', !!ev);
  setText('event', ev ? `${ev.name} ${mmss(ev.ends - EV.t)}` : `Next event ${mmss(EV.next - EV.t)}`);
  const hint = goalHtml(); if (R.hintSig !== hint) { R.hintSig = hint; $('hint').innerHTML = hint; }
  $('surfaceBtn').hidden = S.player.r < C.player.surfaceButtonDepth;
  $('autoBtn').hidden = !autoDigUnlocked(); $('autoBtn').classList.toggle('on', !!S.settings.autoDig);
  const shopCost = lvlCost(C.upgrades.strength, S.up.strength);
  $('navShop').classList.toggle('pulse', (S.tut === 4 && S.gold >= shopCost) || (S.tut >= 5 && !S.holdDig && canAfford(C.holdDig.cost)));
  $('rebirthDot').hidden = S.maxDepth < rebirthDepth(); $('rebirthDot').textContent = '!';
  const pick = C.pickaxes[S.pick + 1]; $('shopDot').hidden = !(pick && canAfford(pick.cost)); $('shopDot').textContent = '!';
  $('soundBtn').textContent = S.settings.muted ? '✕' : '♪';
}
function buildNests() {
  syncNestCount();
  const box = $('nestList'); box.innerHTML = '';
  S.nests.forEach((n, i) => {
    const b = document.createElement('button'); b.className = 'nest'; b.dataset.i = i;
    b.innerHTML = '<canvas width="168" height="168"></canvas><i class="ring"></i><span class="t"></span>';
    b.onclick = () => { audio(); const nn = S.nests[i]; if (!nn) return; if (nestRemaining(nn) <= 0) hatch(i); else openSkip(i); };
    box.appendChild(b);
  });
  const nb = C.incubators.buy[S.nestBought];
  if (nb) {
    const b = document.createElement('button'); b.className = 'nest locked';
    b.innerHTML = `<span class="plus">+</span>${nb.gold ? coinI.replace('coin"', 'coin" style="width:14px;height:14px"') + fmt(nb.gold) : gemI.replace('gemi"', 'gemi" style="width:14px;height:14px"') + fmt(nb.gems)}`;
    b.onclick = () => { audio(); if (canAfford(nb)) buyNest(); else { toast('Not enough ' + (nb.gold ? 'gold' : 'gems') + ' for another nest yet', 'bad'); } };
    box.appendChild(b);
  }
}
function updateNestsDom() {
  const els = $('nestList').querySelectorAll('.nest:not(.locked)');
  els.forEach((el, i) => {
    const n = S.nests[i]; const c = el.querySelector('canvas').getContext('2d');
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, 168, 168);
    const ring = el.querySelector('.ring'), t = el.querySelector('.t');
    if (!n) { el.classList.remove('ready'); ring.style.background = 'none'; t.textContent = 'empty'; return; }
    const rem = nestRemaining(n), ready = rem <= 0, frac = clamp(1 - rem * 1000 / n.dur, 0, 1);
    el.classList.toggle('ready', ready);
    ring.style.background = ready ? 'none' : `conic-gradient(#ffc93c ${frac * 360}deg, rgba(255,255,255,.12) 0)`;
    t.textContent = ready ? 'HATCH!' : mmss(rem);
    drawEgg(c, 84, 78, 92, EGG[n.egg], R.t, ready ? 1 : (rem < 3 ? 0.4 : 0.05), ready ? 0.6 : 0);
  });
  const b = S.basket.length;
  $('basket').textContent = b ? `${b} egg${b > 1 ? 's' : ''} waiting` : '';
  if (S.tut === 2 || S.tut === 3) $('nestList').querySelector('.nest')?.classList.add('pulse'); else $('nestList').querySelector('.nest.pulse')?.classList.remove('pulse');
}
function drawNavIcons() {
  const t = R.t;
  const d = $('navDragonIcon').getContext('2d'); d.setTransform(1, 0, 0, 1, 0, 0); d.clearRect(0, 0, 68, 68);
  const fav = equippedDragons()[0];
  drawDragon(d, 34, 38, 19, fav ? dragonDef(fav) : C.dragonEggs[0].dragons[0], t);
  const s = $('navShopIcon').getContext('2d'); s.setTransform(1, 0, 0, 1, 0, 0); s.clearRect(0, 0, 68, 68); drawPick(s, 34, 30, 46, C.pickaxes[Math.min(S.pick + 1, C.pickaxes.length - 1)].color, -0.7);
  const rb = $('navRebirthIcon').getContext('2d'); rb.setTransform(1, 0, 0, 1, 0, 0); rb.clearRect(0, 0, 68, 68);
  rb.save(); rb.translate(34, 34); rb.rotate(t * 0.8); rb.fillStyle = '#ffe27a'; star(rb, 0, 0, 22, 6, 0.5); rb.fill(); rb.restore();
}

// ---------------------------------------------------------------- panels
let panel = null, panelSig = '';
function openPanel(name) { panel = name; panelSig = ''; $('sheet').classList.add('open'); renderPanel(); if (S.tut === 4 && name === 'shop') R.hintSig = null; }
function closePanel() { panel = null; $('sheet').classList.remove('open'); }
function shopChips(cost) {
  return Object.entries(cost).map(([k, v]) => { const have = k === 'gold' ? S.gold : (S.mats[k] || 0); return `<span class="chip ${have >= v ? 'ok' : 'no'}">${k === 'gold' ? coinI.replace('coin"', 'coin" style="width:12px;height:12px"') : matI(k)}${fmt(Math.min(have, v))}/${fmt(v)}</span>`; }).join('');
}
function costBtn(cost, action, label) {
  const ok = canAfford(cost);
  const parts = Object.entries(cost).map(([k, v]) => k === 'gold' ? coinI + fmt(v) : k === 'gems' ? gemI + fmt(v) : matI(k) + fmt(v)).join(' ');
  return `<button class="btn" data-a="${action}" ${ok ? '' : 'disabled'}>${label ? label + ' ' : ''}${parts}</button>`;
}
function dragonCard(d, extra = '') {
  const def = dragonDef(d), r = RAR[d.i], eq = S.equipped.includes(d.id);
  return `<div class="dcard ${eq ? 'eq' : ''} ${R.selDragon === d.id ? 'sel' : ''}" data-a="sel:${d.id}" style="border-color:${eq ? '' : r.color + '55'}">
    <canvas width="128" height="128" data-dragon="${d.egg}:${d.i}"></canvas>
    <div class="nm">${def.name}</div><div class="rar" style="color:${r.color}">${r.name}</div><div class="pw">Power ${fmt(dragonPower(d) * petMult())}/s</div>
    ${R.selDragon === d.id ? `<div class="dactions"><button class="btn ${eq ? 'alt' : ''}" data-a="eq:${d.id}">${eq ? 'Unequip' : 'Equip'}</button><button class="btn danger" data-a="${d.i >= 2 && R.sellConfirm !== d.id ? 'sellask' : 'sell'}:${d.id}">${R.sellConfirm === d.id ? 'Tap again to sell' : 'Sell ' + fmt(dragonSell(d))}</button></div>` : ''}${extra}</div>`;
}
function panelHtml() {
  if (panel === 'shop') {
    const next = C.pickaxes[S.pick + 1], cur = C.pickaxes[S.pick];
    let h = `<div class="sec"><h4>Pickaxe</h4><div class="row"><canvas width="96" height="96" data-pick="${S.pick}" style="width:44px;height:44px"></canvas><div class="grow"><div class="nm">${cur.name}</div><div class="ds">${S.reinforce ? `Reinforced ${S.reinforce}/${C.reinforce.costFrac.length} · ` : ''}${fmt(hitDamage())} damage per hit · ${swingRate().toFixed(1)} swings/s</div></div></div>`;
    const rc = reinforceCost();
    if (rc) h += `<div class="row"><div class="grow"><div class="nm">Reinforce ${S.reinforce + 1}/${C.reinforce.costFrac.length} <span class="lv">x${C.reinforce.dmgMult} damage</span></div><div class="ds">Strengthen your ${cur.name} before the next one</div><div class="chips">${shopChips(rc)}</div></div><button class="btn alt" data-a="reinforce" ${canAfford(rc) ? '' : 'disabled'}>Reinforce</button></div>`;
    if (next) {
      const chips = shopChips(next.cost);
      h += `<div class="row"><canvas width="96" height="96" data-pick="${S.pick + 1}" style="width:44px;height:44px"></canvas><div class="grow"><div class="nm">${next.name} <span class="lv">x${fmt(next.dmg / cur.dmg)} damage</span></div><div class="ds">Breaks the ${C.layers[S.pick + 1] ? C.layers[S.pick + 1].name : 'deepest'} seal</div><div class="chips">${chips}</div></div><button class="btn alt" data-a="craft" ${canAfford(next.cost) ? '' : 'disabled'}>Craft</button></div>`;
    }
    h += `</div><div class="sec"><h4>Upgrades</h4>`;
    h += `<div class="row"><div class="grow"><div class="nm">${C.holdDig.name} ${S.holdDig ? '<span class="lv">OWNED</span>' : ''}</div><div class="ds">${C.holdDig.desc}. Kept through rebirth.</div></div>${S.holdDig ? '' : costBtn(C.holdDig.cost, 'hold')}</div>`;
    for (const [k, u] of Object.entries(C.upgrades)) {
      const lv = S.up[k], max = lv >= u.max;
      h += `<div class="row"><div class="grow"><div class="nm">${u.name} <span class="lv">Lv ${lv}${max ? ' MAX' : ''}</span></div><div class="ds">${u.desc}</div></div>${max ? '' : costBtn({ gold: lvlCost(u, lv) }, 'up:' + k)}</div>`;
    }
    h += `</div><div class="sec"><h4>Nests and dragon slots</h4>`;
    const nb = C.incubators.buy[S.nestBought];
    h += `<div class="row"><div class="grow"><div class="nm">Nest ${nestCap() + 1}</div><div class="ds">Hatch one more egg at a time (${nestCap()} now)</div></div>${nb ? costBtn(nb, 'nest') : '<span class="lv">MAX</span>'}</div>`;
    const eb = C.equip.buy[S.equipBought];
    h += `<div class="row"><div class="grow"><div class="nm">Dragon slot ${equipCap() + 1}</div><div class="ds">Bring one more dragon digging (${equipCap()} now)</div></div>${eb ? costBtn(eb, 'eslot') : '<span class="lv">MAX</span>'}</div>`;
    h += `</div><div class="sec"><h4>Sell materials</h4>`;
    const mats = Object.keys(C.materials).filter(m => (S.mats[m] || 0) >= 1);
    if (!mats.length) h += `<div class="note">Dig veins to collect materials for pickaxes. Spares sell for gold.</div>`;
    for (const m of mats) {
      const need = matsNeeded(m), have = Math.floor(S.mats[m]);
      h += `<div class="row"><span class="sw" style="background:${C.materials[m].color};width:18px;height:18px"></span><div class="grow"><div class="nm">${C.materials[m].name} × ${fmt(have)}</div><div class="ds">${need ? `Next pickaxes need ${need}` : 'Not needed for your next pickaxes'} · ${fmt(C.materials[m].sell * goldMult())} each</div></div><button class="btn alt" data-a="sellm:${m}" ${have > need ? '' : 'disabled'}>Sell ${fmt(Math.max(0, have - need))}</button></div>`;
    }
    h += `</div><div class="sec"><h4>Gem upgrades <span class="note">(kept through rebirth)</span></h4>`;
    for (const [k, u] of Object.entries(C.gemUpgrades)) {
      const lv = S.gemUp[k], max = lv >= u.max;
      h += `<div class="row"><div class="grow"><div class="nm">${u.name} <span class="lv">${u.max > 1 ? 'Lv ' + lv : ''}${max ? ' OWNED' : ''}</span></div><div class="ds">${u.desc}</div></div>${max ? '' : costBtn({ gems: lvlCost(u, lv) }, 'gup:' + k)}</div>`;
    }
    h += `</div><div class="sec"><h4>Robux store</h4><div class="sub">Prototype only: buttons simulate a purchase. Prices are placeholders.</div>`;
    for (const p of C.premium.gamepasses) h += `<div class="row"><div class="grow"><div class="nm">${p.name}</div><div class="ds">${p.desc}</div></div>${S.passes[p.id] ? '<span class="lv">OWNED</span>' : `<button class="btn robux" data-a="pass:${p.id}">R$ ${p.robux}</button>`}</div>`;
    for (const p of C.premium.products) h += `<div class="row"><div class="grow"><div class="nm">${p.name}</div><div class="ds">${p.desc || 'Gem pack'}</div></div><button class="btn robux" data-a="prod:${p.id}">R$ ${p.robux}</button></div>`;
    return h + '</div>';
  }
  if (panel === 'dragons') {
    const eq = equippedDragons(), others = S.dragons.filter(d => !S.equipped.includes(d.id)).sort((a, b) => dragonPower(b) - dragonPower(a) || b.id - a.id);
    const commons = others.filter(d => d.i === 0);
    let h = `<div class="sec"><h4>Digging with you · ${eq.length}/${equipCap()}</h4><div class="sub">Equipped dragons dig nearby blocks while you dig: ${fmt(totalPetDps())} damage/s in total.</div>`;
    h += eq.length ? `<div class="grid">${eq.map(d => dragonCard(d)).join('')}</div>` : `<div class="note">Hatch an egg to get your first dragon.</div>`;
    h += `<div class="chips" style="margin-top:8px"><button class="btn" data-a="best">Equip best</button>${commons.length ? `<button class="btn danger" data-a="sellcommon">Sell ${commons.length} unequipped Common (${coinI}${fmt(commons.reduce((a, d) => a + dragonSell(d), 0))})</button>` : ''}</div></div>`;
    h += `<div class="sec"><h4>Your dragons · ${S.dragons.length}/${C.equip.storageCap}</h4>${others.length ? `<div class="grid">${others.map(d => dragonCard(d)).join('')}</div>` : '<div class="note">Dragons you keep but do not equip wait here.</div>'}</div>`;
    if (autoHatchOn()) h += `<div class="sec"><h4>Auto-Hatch</h4><div class="row"><div class="grow"><div class="nm">Auto-sell Common dragons</div><div class="ds">When an egg hatches on its own</div></div><div class="seg"><button class="${S.settings.autoSellCommon ? 'on' : ''}" data-a="asc:1">On</button><button class="${S.settings.autoSellCommon ? '' : 'on'}" data-a="asc:0">Off</button></div></div></div>`;
    const total = C.dragonEggs.length * 5, found = Object.keys(S.dex).length;
    h += `<div class="sec"><h4>Dragondex · ${found}/${total}</h4><div class="sub">Kept through rebirth. Each egg hides five dragons, one per rarity.</div>`;
    for (const e of C.dragonEggs) {
      h += `<div class="row" style="flex-direction:column;align-items:stretch;gap:6px"><div class="nm" style="font-size:13px">${e.name} <span class="ds">· hatches in ${mmss(e.hatchSec)}</span></div><div class="dex">${e.dragons.map((d, i) => `<canvas width="96" height="96" data-dex="${e.id}:${i}" title="${S.dex[e.id + i] ? d.name : '???'}"></canvas>`).join('')}</div></div>`;
    }
    return h + '</div>';
  }
  if (panel === 'rebirth') {
    const next = nextRebirth();
    if (!next) return `<div class="sec"><h4>Rebirth ${S.rebirths}</h4><div class="sub">You reached the top of the rebirth ladder: gold and dig power x${fmt(rbMult())}. More rebirths arrive with updates.</div></div>`;
    const need = next.depth, ok = S.maxDepth >= need, nr = S.rebirths + 1;
    let h = `<div class="sec"><h4>Rebirth ${nr} of ${RB.length}</h4><div class="sub">Deepest this run: ${S.maxDepth} m of ${need} m</div><div class="bigbar"><i style="width:${clamp(S.maxDepth / need, 0, 1) * 100}%"></i></div></div>`;
    h += `<div class="sec"><h4>You get, forever</h4>
      <div class="row"><div class="grow"><div class="nm">Gold and dig power x${fmt(rbMult())} → x${fmt(next.mult)}</div><div class="ds">You and your dragons</div></div></div>
      <div class="row"><div class="grow"><div class="nm">${gemI} +${next.gems} gems</div></div></div>
      ${next.unlock ? `<div class="row"><div class="grow"><div class="nm">Unlocks ${UNLOCK_NAMES[next.unlock]}</div></div></div>` : ''}</div>`;
    h += `<div class="sec"><h4>What happens</h4><div class="lists"><ul><li>Gold</li><li>Materials</li><li>Pickaxe</li><li>Gold upgrades</li><li>Depth (new ground)</li></ul><ul><li>Dragons</li><li>Eggs and nests</li><li>Gems and gem upgrades</li><li>Dragondex</li><li>Robux purchases</li></ul></div><div class="note" style="margin-top:4px">Left: starts over. Right: you keep.</div></div>`;
    h += `<div class="sec">${ok ? `<button class="btn" style="width:100%;justify-content:center;font-size:18px;padding:12px" data-a="${R.rbConfirm ? 'rebirth' : 'rbask'}">${R.rbConfirm ? 'Tap again to rebirth' : `Rebirth for x${fmt(next.mult)}`}</button>` : `<div class="note">Dig to ${need} m to rebirth.</div>`}</div>`;
    return h;
  }
  if (panel === 'settings') {
    return `<div class="sec"><h4>Prototype settings</h4>
      <div class="row"><div class="grow"><div class="nm">Hatch timer speed</div><div class="ds">Real targets: ${C.dragonEggs.map(e => mmss(e.hatchSec)).join(', ')}</div></div><div class="seg">${[1, 5, 30].map(v => `<button class="${S.settings.timeScale === v ? 'on' : ''}" data-a="ts:${v}">${v}x</button>`).join('')}</div></div>
      <div class="row"><div class="grow"><div class="nm">Cheats for testing</div></div><button class="btn alt" data-a="cheat:gold">+Gold</button><button class="btn alt" data-a="cheat:gems">+50 gems</button><button class="btn alt" data-a="cheat:egg">+Egg</button></div>
      <div class="row"><div class="grow"><div class="nm">Start an event</div></div>${C.events.list.map(e => `<button class="btn alt" data-a="ev:${e.id}">${e.name}</button>`).join('')}</div>
      <div class="row"><div class="grow"><div class="nm">Stats</div><div class="ds">${S.stats.blocks} blocks · ${S.stats.eggs} eggs · ${S.stats.hatched} hatched · ${S.rebirths} rebirths · best ${Math.max(S.bestDepth, S.maxDepth)} m</div></div></div>
      <div class="row"><div class="grow"><div class="nm">Reset save</div><div class="ds">Wipes this browser's progress</div></div><button class="btn danger" data-a="${R.resetConfirm ? 'reset' : 'resetask'}">${R.resetConfirm ? 'Tap again' : 'Reset'}</button></div></div>
      <div class="sec"><div class="note">Controls: tap or click a block next to open space to dig it. After you buy Hold to Dig, hold to keep digging; holding digs straight down once the block breaks. Space or Down arrow also digs down. Tap open space to walk there.</div></div>`;
  }
  return '';
}
function renderPanel() {
  if (!panel) return;
  const html = panelHtml();
  if (html === panelSig) return;
  panelSig = html;
  const body = $('sheetBody'), st = body.scrollTop;
  $('sheetTitle').textContent = { shop: 'Shop', dragons: 'Dragons', rebirth: 'Rebirth', settings: 'Settings' }[panel];
  body.innerHTML = html; body.scrollTop = st;
  body.querySelectorAll('canvas[data-dragon]').forEach(cv => { const [e, i] = cv.dataset.dragon.split(':'); const c = cv.getContext('2d'); drawDragon(c, 68, 70, 38, EGG[e].dragons[+i], 1.3); });
  body.querySelectorAll('canvas[data-dex]').forEach(cv => { const [e, i] = cv.dataset.dex.split(':'); const c = cv.getContext('2d'); drawDragon(c, 50, 54, 26, EGG[e].dragons[+i], 1.3, { silhouette: !S.dex[e + i] }); });
  body.querySelectorAll('canvas[data-pick]').forEach(cv => { const p = C.pickaxes[+cv.dataset.pick]; drawPick(cv.getContext('2d'), 48, 40, 70, p.color, -0.7); });
}
$('sheetBody').addEventListener('click', e => {
  const el = e.target.closest('[data-a]'); if (!el || el.disabled) return;
  audio();
  const [a, v] = el.dataset.a.split(':');
  if (a !== 'rbask' && a !== 'rebirth') R.rbConfirm = false;
  if (a !== 'resetask' && a !== 'reset') R.resetConfirm = false;
  if (a !== 'sellask' && a !== 'sell') R.sellConfirm = null;
  switch (a) {
    case 'craft': craftPick(); break;
    case 'reinforce': reinforcePick(); break;
    case 'up': buyUpgrade(v); break;
    case 'hold': buyHoldDig(); break;
    case 'gup': buyGemUpgrade(v); break;
    case 'nest': buyNest(); break;
    case 'eslot': buyEquipSlot(); break;
    case 'sellm': sellMats(v, true); break;
    case 'pass': simulatePurchase('pass', v); break;
    case 'prod': simulatePurchase('prod', v); break;
    case 'sel': R.selDragon = R.selDragon === +v ? null : +v; break;
    case 'eq': toggleEquip(+v); break;
    case 'sellask': R.sellConfirm = +v; break;
    case 'sell': sellDragon(+v); R.selDragon = null; R.sellConfirm = null; break;
    case 'best': equipBest(); break;
    case 'sellcommon': S.dragons.filter(d => d.i === 0 && !S.equipped.includes(d.id)).forEach(d => sellDragon(d.id, true)); SFX.coin(); break;
    case 'asc': S.settings.autoSellCommon = v === '1'; break;
    case 'rbask': R.rbConfirm = true; break;
    case 'rebirth': R.rbConfirm = false; doRebirth(); return;
    case 'ts': S.settings.timeScale = +v; break;
    case 'cheat': if (v === 'gold') S.gold += Math.max(1000, S.gold); if (v === 'gems') S.gems += 50; if (v === 'egg') findEgg(layerOf(Math.max(0, S.player.r)).egg, S.player.c + 0.5, S.player.r + 0.5); break;
    case 'ev': startEvent(v); break;
    case 'resetask': R.resetConfirm = true; break;
    case 'reset': try { localStorage.removeItem(SAVE_KEY); } catch (err) { /* ignore */ } S = newGame(); R.px = S.player.c; R.py = S.player.r; R.camY = -1; R.path = []; R.target = null; R.pets = []; R.resetConfirm = false; ensureRows(); buildNests(); closePanel(); return;
  }
  save(); renderPanel();
});
document.querySelectorAll('.navb[data-open]').forEach(b => b.addEventListener('click', () => { audio(); const n = b.dataset.open; if (panel === n) closePanel(); else openPanel(n); }));
$('sheetClose').onclick = closePanel;
$('settingsBtn').onclick = () => { audio(); panel === 'settings' ? closePanel() : openPanel('settings'); };
$('soundBtn').onclick = () => { audio(); S.settings.muted = !S.settings.muted; save(); };
$('surfaceBtn').onclick = () => { audio(); surface(); };
$('autoBtn').onclick = () => { audio(); S.settings.autoDig = !S.settings.autoDig; R.target = null; save(); };

// ---------------------------------------------------------------- reveal and skip modals
function nextReveal() {
  R.reveal = R.revealQ.shift() || null;
  $('reveal').hidden = !R.reveal; if (!R.reveal) return;
  R.reveal.t = 0; R.reveal.shown = false;
  $('revealInfo').innerHTML = ''; $('revealActs').innerHTML = '<div class="note">Tap to crack it open</div>';
}
function showRevealInfo() {
  const rv = R.reveal; if (!rv || rv.shown) return; rv.shown = true; rv.t = Math.max(rv.t, 1.9);
  const d = rv.d, def = dragonDef(d), r = RAR[d.i];
  if (!S.dragons.find(x => x.id === d.id)) { nextReveal(); return; }
  SFX.hatch(d.i);
  $('revealInfo').innerHTML = `<div class="rar" style="color:${r.color}">${r.name}${rv.isNew ? ' · New!' : ''}</div><div class="nm">${def.name}</div><div class="pw">Digs ${fmt(dragonPower(d) * petMult())} damage per second · sells for ${coinI}${fmt(dragonSell(d))}</div>`;
  const eq = S.equipped.includes(d.id);
  const weakest = equippedDragons().filter(x => x.id !== d.id).sort((a, b) => dragonPower(a) - dragonPower(b))[0];
  const better = !eq && weakest && dragonPower(d) > dragonPower(weakest);
  let acts = '';
  if (rv.first) acts = `<button class="btn" data-r="ok" style="font-size:18px;padding:10px 22px">Dig together!</button>`;
  else {
    acts = eq ? `<button class="btn" data-r="ok">Digging with you</button>` : better ? `<button class="btn" data-r="swap">Swap in for ${dragonDef(weakest).name}</button>` : `<button class="btn" data-r="ok">Keep</button>`;
    acts += `<button class="btn danger" data-r="sell">Sell ${coinI}${fmt(dragonSell(d))}</button>`;
  }
  $('revealActs').innerHTML = acts;
}
$('reveal').addEventListener('click', e => {
  const b = e.target.closest('[data-r]');
  if (!R.reveal) return;
  if (!R.reveal.shown) { showRevealInfo(); return; }
  if (!b) return;
  const d = R.reveal.d;
  if (b.dataset.r === 'sell' && d.i >= 2 && !R.reveal.sellAsk) { R.reveal.sellAsk = true; b.textContent = 'Tap again to sell'; return; }
  if (b.dataset.r === 'sell') sellDragon(d.id);
  if (b.dataset.r === 'swap') toggleEquip(d.id);
  save(); nextReveal();
});
function drawReveal(dt) {
  const rv = R.reveal; if (!rv) return;
  rv.t += dt;
  const c = $('revealCanvas').getContext('2d'), W = 480, d = rv.d, egg = EGG[d.egg], r = RAR[d.i];
  c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W, W);
  if (rv.t < 1.6 && !rv.shown) {
    const w = rv.t < 0.5 ? 0.2 : rv.t < 1.1 ? 0.5 : 1;
    drawEgg(c, W / 2, W / 2 + 10, 230, egg, rv.t, w, rv.t / 1.6);
    if (rv.t > 0.4 && !rv.c1) { rv.c1 = 1; SFX.crack(); } if (rv.t > 1.0 && !rv.c2) { rv.c2 = 1; SFX.crack(); }
    return;
  }
  if (!rv.shown) showRevealInfo();
  const k = clamp((rv.t - 1.6) / 0.35, 0, 1);
  c.save(); c.translate(W / 2, W / 2); c.rotate(rv.t * 0.4);
  for (let i = 0; i < 12; i++) { c.rotate(Math.PI / 6); c.fillStyle = i % 2 ? r.color + '55' : 'rgba(255,255,255,.12)'; c.beginPath(); c.moveTo(0, 0); c.lineTo(-30, -W); c.lineTo(30, -W); c.fill(); }
  c.restore();
  if (k < 1) { c.fillStyle = `rgba(255,255,255,${1 - k})`; c.fillRect(0, 0, W, W); }
  const sc = 0.6 + 0.4 * (1 - Math.pow(1 - k, 3)) + (k >= 1 ? Math.sin(rv.t * 3) * 0.02 : 0);
  drawDragon(c, W / 2, W / 2 + 20, 120 * sc, dragonDef(d), rv.t);
}

let skipI = -1;
function openSkip(i) {
  skipI = i; const n = S.nests[i]; if (!n) return;
  $('skip').hidden = false; renderSkip();
}
function renderSkip() {
  const n = S.nests[skipI]; if (!n || $('skip').hidden) return;
  if (nestRemaining(n) <= 0) { closeSkip(); return; }
  const g = skipCostGems(n), rb = skipCostRobux(n);
  const html = `<canvas width="200" height="200" id="skipEgg" style="width:100px;height:100px"></canvas><h3>${EGG[n.egg].name}</h3><div class="note">Hatches in ${mmss(nestRemaining(n))}. Keep digging, or hatch it now.</div>
    <div class="acts"><button class="btn" data-s="gems" ${S.gems >= g ? '' : 'disabled'}>Hatch now ${gemI}${g}</button><button class="btn robux" data-s="robux">Hatch now R$ ${rb}</button><button class="btn alt" data-s="close">Keep digging</button></div><div class="note">Robux button simulates the purchase in this prototype.</div>`;
  if ($('skipCard').dataset.sig !== html) { $('skipCard').dataset.sig = html; $('skipCard').innerHTML = html; }
  const c = $('skipEgg').getContext('2d'); c.clearRect(0, 0, 200, 200); drawEgg(c, 100, 100, 130, EGG[n.egg], R.t, 0.1);
}
function closeSkip() { $('skip').hidden = true; skipI = -1; }
$('skip').addEventListener('click', e => {
  const b = e.target.closest('[data-s]');
  if (!b) { if (e.target === $('skip')) closeSkip(); return; }
  if (b.dataset.s === 'close') closeSkip();
  else skipNest(skipI, b.dataset.s);
});

// ---------------------------------------------------------------- loop
let last = performance.now(), slow = 0;
function frame(t) {
  const dt = Math.min(0.05, (t - last) / 1000); last = t;
  R.t += dt; R.shake = Math.max(0, R.shake - dt);
  ensureRows();
  updatePlayer(dt); updatePets(dt); updateParticles(dt); updateEvents(dt); updateNests();
  R.camY = lerp(R.camY, R.py, Math.min(1, dt * 6));
  render(); drawReveal(dt);
  slow -= dt;
  if (slow <= 0) { slow = 0.1; updateHud(); updateNestsDom(); drawNavIcons(); renderPanel(); renderSkip(); }
  requestAnimationFrame(frame);
}

function start() {
  ensureRows(); syncNestCount(); resize(); buildNests(); syncPets();
  R.px = S.player.c; R.py = S.player.r; R.camY = S.player.r;
  window.addEventListener('resize', () => { resize(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
  setInterval(save, 4000);
  requestAnimationFrame(t => { last = t; frame(t); });
  window.__game = { get S() { return S; }, R, C, hatch, startEvent };
}
start();
})();
