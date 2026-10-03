// Rough pacing sim for prototype/config.js.
// Models a greedy player who taps until Hold to Dig, then holds, detours to ~2.5 blocks per meter, keeps the best dragons
// and sells the rest, and buys the cheapest useful upgrade. Approximate by design: use it to
// spot pacing cliffs, then confirm by playing the prototype.
// Usage: node tools/sim.js [rebirths=3]  (stops early at the end of the rebirth ladder)
const C = require('../prototype/config.js');

const RUNS = Number(process.argv[2] || 3);
const RB = C.rebirth.ladder;
const rbUnlocks = (n, u) => RB.slice(0, n).filter(r => r.unlock === u).length;
const BLOCKS_PER_METER = 2.5;
const MOVE_OVERHEAD = 0.12;       // seconds per block spent walking/falling
const TAP_EFFICIENCY = 0.85;      // fraction of max swing rate a player actually sustains
const TAP_ONLY_EFFICIENCY = 0.7;  // same, before Hold to Dig, when every swing is a tap
const SPECIAL_BIAS = 1.4;         // players steer toward gold veins and eggs they can see

const layerAt = d => { let L = C.layers[0]; for (const l of C.layers) if (d >= l.start) L = l; return L; };
const lvlCost = (u, lvl) => Math.ceil(u.base * Math.pow(u.growth, lvl));
const fmt = n => n < 1000 ? n.toFixed(0) : n < 1e6 ? (n / 1e3).toFixed(1) + 'K' : n < 1e9 ? (n / 1e6).toFixed(1) + 'M' : (n / 1e9).toFixed(2) + 'B';
const mmss = s => `${Math.floor(s / 60)}m${String(Math.floor(s % 60)).padStart(2, '0')}s`;

function rarityRoll(rng) {
  const tot = C.rarities.reduce((a, r) => a + r.weight, 0);
  let x = rng() * tot;
  for (const r of C.rarities) { if ((x -= r.weight) <= 0) return r; }
  return C.rarities[0];
}
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

const rng = mulberry(42);
const meta = { holdDig: false, rebirths: 0, dragons: [], gems: 0, incubators: C.incubators.start, t: 0 };

for (let run = 0; run <= RUNS; run++) {
  const s = { d: 0, gold: 0, mats: {}, pick: 0, reinforce: 0, up: { strength: 0, swing: 0, eggLuck: 0, hatchSpeed: 0 }, eggs: [], incub: [], incubBought: meta.incubators - C.incubators.start };
  if (!RB[meta.rebirths]) break;
  const rbMult = meta.rebirths ? RB[meta.rebirths - 1].mult : 1;
  const goldMult = rbMult;
  const target = RB[meta.rebirths].depth;
  const log = [];
  let blocksSinceEgg = 0, firstEgg = run === 0, t0 = meta.t, lastLayer = -1;
  const milestone = (msg) => log.push(`  ${mmss(meta.t - t0).padStart(7)}  ${msg}`);

  while (s.d < target && meta.t - t0 < 4 * 3600) {
    const L = layerAt(s.d);
    const li = C.layers.indexOf(L);
    if (li !== lastLayer) { milestone(`reach ${L.name} (${L.start} m)`); lastLayer = li; }
    const nextL = C.layers[li + 1];
    const blocked = nextL && s.d + 1 >= nextL.start && s.pick < nextL.sealTier;

    // Damage and income for one block at this depth.
    const into = s.d - L.start;
    const scale = 1 + L.growth * into;
    const w = L.weights; const wt = Object.values(w).reduce((a, b) => a + b, 0);
    const pGold = Math.min(0.5, w.gold / wt * SPECIAL_BIAS);
    const avgHpMult = (w.base * 1 + (wt - w.base - w.gold - w.gem) * C.blockKinds.vein.hpMult + w.gold * C.blockKinds.gold.hpMult + w.gem * C.blockKinds.gem.hpMult) / wt;
    const hp = L.hp * scale * avgHpMult;
    const swings = (C.player.baseSwingsPerSec + s.up.swing * C.upgrades.swing.per) * (meta.holdDig ? TAP_EFFICIENCY : TAP_ONLY_EFFICIENCY);
    const hit = C.pickaxes[s.pick].dmg * Math.pow(C.reinforce.dmgMult, s.reinforce) * Math.pow(C.upgrades.strength.per, s.up.strength) * rbMult;
    const equipped = meta.dragons.slice().sort((a, b) => b.power - a.power).slice(0, C.equip.start + rbUnlocks(meta.rebirths, 'equipSlot'));
    const petDps = equipped.reduce((a, d) => a + d.power, 0) * Math.pow(C.upgrades.strength.per, s.up.strength) * rbMult;
    // Smash: one swing breaks up to smashMaxBlocks blocks when a hit is worth several blocks' HP.
    // Never faster than one swing per block, times the blocks a swing can smash.
    const perSwing = Math.max(1, Math.min(C.player.smashMaxBlocks, Math.floor(hit / hp)));
    const blocksPerSec = Math.min(swings * perSwing, (hit * swings + petDps) / hp);
    const dt = 1 / blocksPerSec + MOVE_OVERHEAD;
    meta.t += dt;
    s.gold += L.coin * scale * (1 + pGold * (C.blockKinds.gold.coinMult - 1)) * goldMult;
    for (const [m, mw] of Object.entries(w)) if (C.materials[m]) s.mats[m] = (s.mats[m] || 0) + (mw / wt) * 1.5;
    meta.gems += (w.gem / wt);

    // Eggs.
    blocksSinceEgg++;
    const eggP = C.eggs.base * (1 + s.up.eggLuck * C.upgrades.eggLuck.per) * SPECIAL_BIAS;
    if ((firstEgg && s.d >= C.eggs.firstEggRow) || rng() < eggP || blocksSinceEgg > C.eggs.pityRows * BLOCKS_PER_METER) {
      if (firstEgg) milestone('first egg');
      firstEgg = false; blocksSinceEgg = 0; s.eggs.push(L.egg);
    }
    // Incubate and hatch.
    s.incub = s.incub.filter(e => {
      if (meta.t < e.done) return true;
      const egg = C.dragonEggs.find(x => x.id === e.egg);
      const r = rarityRoll(rng);
      const d = { power: egg.power * r.power, sell: egg.sell * r.sell, egg: egg.id, rarity: r.id };
      if (!meta.firstHatch) { meta.firstHatch = true; milestone(`first hatch (${r.name} ${egg.name})`); }
      meta.dragons.push(d);
      meta.dragons.sort((a, b) => b.power - a.power);
      const keep = C.equip.start + 2;
      while (meta.dragons.length > keep) s.gold += meta.dragons.pop().sell * goldMult;
      return false;
    });
    while (s.eggs.length && s.incub.length < meta.incubators) {
      const id = s.eggs.shift(); const egg = C.dragonEggs.find(x => x.id === id);
      s.incub.push({ egg: egg.id, done: meta.t + egg.hatchSec / (1 + s.up.hatchSpeed * C.upgrades.hatchSpeed.per) });
    }
    s.eggs = s.eggs.slice(0, C.eggs.basketCap);

    // Shopping: reinforce, then the next pick, then the cheapest useful gold purchase.
    const rf = C.reinforce.costFrac[s.reinforce];
    if (rf !== undefined) {
      const base = (C.pickaxes[s.pick + 1] || C.pickaxes[s.pick]).cost, f = rf * (C.pickaxes[s.pick + 1] ? 1 : 4);
      const rc = Object.fromEntries(Object.entries(base).map(([k, v]) => [k, Math.ceil(v * f)]));
      if (Object.entries(rc).every(([k, v]) => (k === 'gold' ? s.gold : (s.mats[k] || 0)) >= v)) {
        for (const [k, v] of Object.entries(rc)) { if (k === 'gold') s.gold -= v; else s.mats[k] -= v; }
        s.reinforce++; milestone(`reinforce ${C.pickaxes[s.pick].name} ${s.reinforce}`);
      }
    }
    const np = C.pickaxes[s.pick + 1];
    if (np && Object.entries(np.cost).every(([k, v]) => (k === 'gold' ? s.gold : (s.mats[k] || 0)) >= v)) {
      for (const [k, v] of Object.entries(np.cost)) { if (k === 'gold') s.gold -= v; else s.mats[k] -= v; }
      s.pick++; s.reinforce = 0; milestone(`craft ${np.name}`);
    }
    const options = [];
    for (const [k, u] of Object.entries(C.upgrades)) if (s.up[k] < u.max) options.push({ cost: lvlCost(u, s.up[k]), buy: () => s.up[k]++, name: k });
    if (!meta.holdDig) options.push({ cost: C.holdDig.cost.gold, buy: () => { meta.holdDig = true; milestone('buy Hold to Dig'); }, name: 'holdDig' });
    const ib = C.incubators.buy[s.incubBought];
    if (ib && ib.gold) options.push({ cost: ib.gold, buy: () => { s.incubBought++; meta.incubators++; milestone(`buy incubator #${meta.incubators}`); }, name: 'incubator' });
    options.sort((a, b) => a.cost - b.cost);
    // Save for the next pick when it is close.
    const saving = np && np.cost.gold && s.gold < np.cost.gold && Object.entries(np.cost).every(([k, v]) => k === 'gold' || (s.mats[k] || 0) >= v);
    if (!saving && options[0] && s.gold >= options[0].cost) { s.gold -= options[0].cost; options[0].buy(); }
    // Sell surplus materials (keep what the next two picks need).
    for (const m of Object.keys(s.mats)) {
      const need = [1, 2].reduce((a, k) => a + ((C.pickaxes[s.pick + k] || { cost: {} }).cost[m] || 0), 0);
      if (s.mats[m] > need + 20) { s.gold += (s.mats[m] - need) * C.materials[m].sell * goldMult; s.mats[m] = need; }
    }
    if (!blocked) s.d += 1 / BLOCKS_PER_METER;
  }
  const best = meta.dragons[0];
  milestone(`REBIRTH ${meta.rebirths + 1} at ${target} m · pick ${C.pickaxes[s.pick].name} · str ${s.up.strength} · best dragon ${best ? fmt(best.power) + ' power' : '-'} · gems ${meta.gems.toFixed(0)}`);
  console.log(`Run ${run + 1} (rebirths so far: ${meta.rebirths}, total time ${mmss(meta.t)})`);
  console.log(log.join('\n'));
  meta.rebirths++;
  meta.gems += RB[meta.rebirths - 1].gems;
  meta.incubators += RB[meta.rebirths - 1].unlock === 'nest' ? 1 : 0;
}
