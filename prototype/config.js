// Dig for Dragon Eggs: balance and content config.
// Single source of truth for the prototype and the pacing sim (tools/sim.js).
// Shaped so each table ports directly to a Luau ModuleScript in the Roblox build.
(function (root) {
  const CONFIG = {
    version: 1,

    // Prototype-only knob: multiplies how fast hatch timers run. Real targets live in eggs[].hatchSec.
    timeScale: 1,

    grid: { cols: 7 },

    player: {
      baseSwingsPerSec: 2.5,
      reach: 1,              // Chebyshev distance from the player's cell
      moveCellsPerSec: 9,
    },

    // Every broken block pays coin = layer.coin * (1 + layer.growth * metersIntoLayer).
    // Block HP = layer.hp * (1 + layer.growth * metersIntoLayer) * kind.hpMult.
    // weights: relative chance of each block kind when a row is generated.
    layers: [
      { id: 'meadow',  name: 'Meadow Topsoil',    start: 0,   hp: 2,      coin: 1,     growth: 0.03, egg: 'meadow',  sealTier: 0,
        colors: { a: '#9a6638', b: '#b07a45', dark: '#5d3a1c', bg: '#3b2414', accent: '#7ed957' },
        weights: { base: 52, stone: 22, wood: 15, gold: 8, gem: 0.6 } },
      { id: 'caverns', name: 'Pebble Caverns',    start: 30,  hp: 110,    coin: 7,     growth: 0.03, egg: 'pebble',  sealTier: 1,
        colors: { a: '#8a8f99', b: '#9da3ad', dark: '#4a4e57', bg: '#272a31', accent: '#c9d1dc' },
        weights: { base: 50, stone: 26, iron: 14, gold: 8, gem: 0.8 } },
      { id: 'grotto',  name: 'Crystal Grotto',    start: 75,  hp: 1300,   coin: 50,    growth: 0.03, egg: 'crystal', sealTier: 2,
        colors: { a: '#5c5397', b: '#6d63ad', dark: '#332d5e', bg: '#1d1938', accent: '#b8a6ff' },
        weights: { base: 50, iron: 12, crystal: 18, gold: 8, gem: 2 } },
      { id: 'hollow',  name: 'Glowshroom Hollow', start: 130, hp: 15000,  coin: 350,   growth: 0.03, egg: 'spore',   sealTier: 3,
        colors: { a: '#2f6f5e', b: '#3b826f', dark: '#163b32', bg: '#0e231e', accent: '#7cf5c9' },
        weights: { base: 52, crystal: 8, glowcap: 20, gold: 8, gem: 1.2 } },
      { id: 'magma',   name: 'Magma Depths',      start: 195, hp: 1.7e5,  coin: 2500,  growth: 0.03, egg: 'ember',   sealTier: 4,
        colors: { a: '#7a2f22', b: '#94402b', dark: '#3d130c', bg: '#220905', accent: '#ff8a3d' },
        weights: { base: 52, glowcap: 6, ember: 20, gold: 8, gem: 1.4 } },
      { id: 'frost',   name: 'Frozen Core',       start: 270, hp: 1.9e6,  coin: 18000, growth: 0.03, egg: 'frost',   sealTier: 5,
        colors: { a: '#6aa6c9', b: '#86bcdb', dark: '#2f5c78', bg: '#132a3a', accent: '#e3f6ff' },
        weights: { base: 52, ember: 6, frost: 20, gold: 8, gem: 1.6 } },
      { id: 'abyss',   name: 'Starfall Abyss',    start: 355, hp: 2.1e7,  coin: 130000, growth: 0.05,  egg: 'cosmic',  sealTier: 6,
        colors: { a: '#2a2257', b: '#352b6b', dark: '#120e2a', bg: '#07051a', accent: '#ffd76a' },
        weights: { base: 52, frost: 6, stardust: 20, gold: 8, gem: 2 } },
    ],

    // Block kinds. Materials (stone, wood, ...) are veins of that material.
    blockKinds: {
      base:  { hpMult: 1 },
      vein:  { hpMult: 1.4, amount: [1, 2] },
      gold:  { hpMult: 1.6, coinMult: 8 },
      gem:   { hpMult: 2.5, gems: 1 },
      egg:   { hpMult: 2 },
      seal:  { hpMult: 3 },
    },

    // Gold and Gems are currencies only. Digging a gold vein or gem crystal pays currency directly.
    // Materials are inventory items: used in pickaxe recipes, extras sell for gold.
    materials: {
      wood:     { name: 'Wood',      color: '#c48a4a', sell: 2 },
      stone:    { name: 'Stone',     color: '#a7adb7', sell: 1 },
      iron:     { name: 'Iron',      color: '#d9c6b0', sell: 8 },
      crystal:  { name: 'Crystal',   color: '#c5a8ff', sell: 40 },
      glowcap:  { name: 'Glowcap',   color: '#7cf5c9', sell: 220 },
      ember:    { name: 'Ember',     color: '#ff8a3d', sell: 1200 },
      frost:    { name: 'Frost',     color: '#bfeaff', sell: 7000 },
      stardust: { name: 'Stardust',  color: '#ffd76a', sell: 42000 },
    },

    // Crafted in the Shop. Tier N is required to break the seal at the top of layer N.
    pickaxes: [
      { name: 'Twig Pick',     dmg: 1,      color: '#c48a4a', cost: {} },
      { name: 'Stone Pick',    dmg: 7,      color: '#a7adb7', cost: { gold: 200,     stone: 30,  wood: 15 } },
      { name: 'Iron Pick',     dmg: 50,     color: '#d9c6b0', cost: { gold: 6000,    iron: 40,   stone: 80 } },
      { name: 'Crystal Pick',  dmg: 350,    color: '#c5a8ff', cost: { gold: 1e5,     crystal: 40, iron: 60 } },
      { name: 'Glowcap Pick',  dmg: 2500,   color: '#7cf5c9', cost: { gold: 1.5e6,   glowcap: 40, crystal: 60 } },
      { name: 'Ember Pick',    dmg: 17500,  color: '#ff8a3d', cost: { gold: 2.3e7,   ember: 40,  glowcap: 60 } },
      { name: 'Frost Pick',    dmg: 122000, color: '#bfeaff', cost: { gold: 3.6e8,   frost: 40,  ember: 60 } },
      { name: 'Starfall Pick', dmg: 860000, color: '#ffd76a', cost: { gold: 5.6e9,   stardust: 40, frost: 60 } },
    ],

    // Gold upgrades. cost(level) = base * growth^level. All reset on rebirth.
    upgrades: {
      strength:   { name: 'Strength',    desc: 'Dig damage x1.12 (you and dragons)',     base: 12,  growth: 1.38, max: 200, per: 1.12 },
      swing:      { name: 'Swing Speed', desc: '+0.3 swings per second while holding', base: 25,  growth: 1.9,  max: 10,  per: 0.3 },
      eggLuck:    { name: 'Egg Sense',   desc: '+12% egg chance in new ground',      base: 40,  growth: 1.8,  max: 15,  per: 0.12 },
      hatchSpeed: { name: 'Warm Nests',  desc: 'Eggs hatch 10% faster',              base: 60,  growth: 2.0,  max: 10,  per: 0.10 },
    },

    eggs: {
      base: 0.012,           // chance per generated cell, before luck
      pityRows: 7,           // force an egg if this many rows pass with none
      firstEggRow: 4,        // scripted first egg, directly in the starting column's path
      basketCap: 12,
    },

    incubators: {
      start: 1,
      // Slot purchases in order. Gold early so the first upgrade loop teaches hatching, gems later.
      buy: [ { gold: 120 }, { gold: 2500 }, { gems: 25 }, { gems: 60 }, { gems: 140 } ],
    },

    equip: {
      start: 3,
      buy: [ { gems: 30 }, { gems: 80 }, { gems: 200 } ],
      storageCap: 40,
    },

    rarities: [
      { id: 'common',    name: 'Common',    weight: 60,  power: 1,   sell: 1,  color: '#b8c2cc' },
      { id: 'uncommon',  name: 'Uncommon',  weight: 25,  power: 1.6, sell: 2,  color: '#6ee07a' },
      { id: 'rare',      name: 'Rare',      weight: 10,  power: 2.6, sell: 5,  color: '#5bb8ff' },
      { id: 'epic',      name: 'Epic',      weight: 4.5, power: 4.5, sell: 15, color: '#c77dff' },
      { id: 'legendary', name: 'Legendary', weight: 0.5, power: 10,  sell: 60, color: '#ffc93c' },
    ],

    // power = damage per second the dragon deals to nearby blocks. Scales with Strength, rebirth and
    // gem multipliers (not pickaxe tier), so a dragon from egg tier N stays useful until roughly layer N+1.
    // hatchSec = target real-game timer. The prototype divides it by timeScale.
    dragonEggs: [
      { id: 'meadow',  name: 'Meadow Egg',  hatchSec: 15,   power: 0.8,   sell: 20,    shell: '#bfe8a0', spots: '#6cbf4a',
        dragons: [
          { name: 'Sprig',     body: '#8fdc6a', belly: '#e9ffd0', wing: '#5fb845', feature: 'leaf' },
          { name: 'Puffbloom', body: '#ffb3d1', belly: '#fff0f6', wing: '#ff7fb0', feature: 'flower' },
          { name: 'Mossy',     body: '#6fbf8a', belly: '#d8f5df', wing: '#3e8f5c', feature: 'leaf' },
          { name: 'Clover',    body: '#4fd08b', belly: '#e8ffe9', wing: '#2a9e62', feature: 'clover' },
          { name: 'Sunpetal',  body: '#ffd84a', belly: '#fff7c9', wing: '#ffa928', feature: 'sun' } ] },
      { id: 'pebble',  name: 'Pebble Egg',  hatchSec: 60,   power: 5,     sell: 150,    shell: '#c9ced6', spots: '#7d838e',
        dragons: [
          { name: 'Pebbles',    body: '#a9b0bb', belly: '#e6e9ee', wing: '#7a818c', feature: 'horns' },
          { name: 'Rocky',      body: '#c09a76', belly: '#f1e2d2', wing: '#8f6a48', feature: 'horns' },
          { name: 'Gravelwing', body: '#8e9bb0', belly: '#dfe6f1', wing: '#5d6b82', feature: 'spikes' },
          { name: 'Geode',      body: '#9c7cd6', belly: '#efe4ff', wing: '#6a4fb0', feature: 'gem' },
          { name: 'Obsidia',    body: '#3a3f4b', belly: '#9aa3b5', wing: '#1f2229', feature: 'gem' } ] },
      { id: 'crystal', name: 'Crystal Egg', hatchSec: 180,  power: 35,    sell: 1100,   shell: '#dcd2ff', spots: '#9b84ff',
        dragons: [
          { name: 'Shardy',   body: '#b9a8ff', belly: '#f1edff', wing: '#8a74f0', feature: 'crystal' },
          { name: 'Glimmer',  body: '#9fe6ff', belly: '#efffff', wing: '#5cc4f0', feature: 'crystal' },
          { name: 'Prisma',   body: '#ffa8e6', belly: '#fff0fb', wing: '#e070c4', feature: 'crystal' },
          { name: 'Amethyst', body: '#9b5de5', belly: '#eadcff', wing: '#6930c3', feature: 'crystal' },
          { name: 'Diamonda', body: '#e8fbff', belly: '#ffffff', wing: '#9ad8f2', feature: 'crown' } ] },
      { id: 'spore',   name: 'Spore Egg',   hatchSec: 420,  power: 250,   sell: 8000,  shell: '#b9f5dc', spots: '#39b38a',
        dragons: [
          { name: 'Puffcap',    body: '#f08a8a', belly: '#ffe8e8', wing: '#c45c5c', feature: 'mushroom' },
          { name: 'Glowshroom', body: '#7cf5c9', belly: '#e4fff5', wing: '#33c497', feature: 'mushroom' },
          { name: 'Morel',      body: '#c7a17a', belly: '#f6e7d6', wing: '#94704c', feature: 'mushroom' },
          { name: 'Lumina',     body: '#a0f0ff', belly: '#f0fdff', wing: '#4fc3e0', feature: 'antenna' },
          { name: 'Mycelia',    body: '#d6a6ff', belly: '#f8eeff', wing: '#a066e0', feature: 'crown' } ] },
      { id: 'ember',   name: 'Ember Egg',   hatchSec: 900,  power: 1750,  sell: 6e4, shell: '#ffc39b', spots: '#ff6a2b',
        dragons: [
          { name: 'Cinder',   body: '#ff8a5c', belly: '#ffe5d6', wing: '#e0532a', feature: 'flame' },
          { name: 'Ashling',  body: '#8a7d7a', belly: '#e7dfdc', wing: '#5c514e', feature: 'flame' },
          { name: 'Blaze',    body: '#ffb02e', belly: '#fff2c9', wing: '#ff7a00', feature: 'flame' },
          { name: 'Magmaw',   body: '#d93d2b', belly: '#ffd3c4', wing: '#a11d10', feature: 'horns' },
          { name: 'Inferna',  body: '#ff4f7b', belly: '#ffe0ea', wing: '#d1144a', feature: 'crown' } ] },
      { id: 'frost',   name: 'Frost Egg',   hatchSec: 1800, power: 12000, sell: 4.2e5, shell: '#e6f7ff', spots: '#7fc8f0',
        dragons: [
          { name: 'Flurry',   body: '#cfeeff', belly: '#ffffff', wing: '#8fd0f5', feature: 'snow' },
          { name: 'Icicle',   body: '#8fd0f5', belly: '#eefaff', wing: '#4fa5d9', feature: 'spikes' },
          { name: 'Snowpuff', body: '#ffffff', belly: '#eef6ff', wing: '#c5dcf0', feature: 'snow' },
          { name: 'Glacia',   body: '#6fb7e0', belly: '#e1f4ff', wing: '#2f7fb3', feature: 'crystal' },
          { name: 'Aurora',   body: '#9ff0d0', belly: '#f0fff8', wing: '#c79bff', feature: 'crown' } ] },
      { id: 'cosmic',  name: 'Cosmic Egg',  hatchSec: 3600, power: 85000, sell: 3e6, shell: '#3b2f7a', spots: '#ffd76a',
        dragons: [
          { name: 'Nova',     body: '#ffe27a', belly: '#fffbe6', wing: '#ffb938', feature: 'star' },
          { name: 'Comet',    body: '#7ab8ff', belly: '#eaf4ff', wing: '#3f7fe0', feature: 'star' },
          { name: 'Nebula',   body: '#c38bff', belly: '#f5ebff', wing: '#ff7fd8', feature: 'star' },
          { name: 'Eclipse',  body: '#2d2550', belly: '#8f86c9', wing: '#ffd76a', feature: 'moon' },
          { name: 'Galaxia',  body: '#5b3fd6', belly: '#e6defc', wing: '#ff9fe6', feature: 'crown' } ] },
    ],

    // Skip a hatch timer. Gems: 1 per started 30 s remaining. Robux: priced by bracket (dev products).
    skip: {
      gemsPerSec: 1 / 30,
      robux: [ { maxSec: 60, price: 5 }, { maxSec: 600, price: 15 }, { maxSec: 1800, price: 35 }, { maxSec: Infinity, price: 75 } ],
    },

    rebirth: {
      depthBase: 150,        // first rebirth unlocks at 150 m (inside Glowshroom Hollow)
      depthStep: 50,         // each later rebirth needs 50 m more
      depthCap: 450,
      goldMultPer: 0.5,      // permanent: gold x(1 + 0.5 * rebirths)
      dmgMultPer: 0.5,       // permanent: dig damage and dragon power x(1 + 0.5 * rebirths)
      gemsBase: 15, gemsPer: 5,
      unlocks: { 1: 'autoDig', 2: 'equipSlot', 3: 'autoHatch' },
    },

    // Gem upgrades persist through rebirth.
    gemUpgrades: {
      goldBoost:  { name: 'Gold Rush',   desc: '+10% gold from everything',  base: 5,  growth: 1.5, max: 25, per: 0.10 },
      petPower:   { name: 'Dragon Snacks', desc: '+10% dragon dig power',    base: 5,  growth: 1.5, max: 25, per: 0.10 },
      hatchLuck:  { name: 'Lucky Nests', desc: 'Rarer dragons hatch more often', base: 8,  growth: 1.6, max: 15, per: 0.08 },
      autoHatch:  { name: 'Auto-Hatch',  desc: 'Ready eggs hatch on their own',  base: 40, growth: 1,   max: 1 },
    },

    events: {
      everySec: 150,
      durationSec: 45,
      list: [
        { id: 'goldRush',  name: 'Golden Hour',  desc: 'All gold x2', goldMult: 2 },
        { id: 'eggShower', name: 'Egg Shower',   desc: 'Any block can drop an egg', eggOnBreak: 0.05 },
        { id: 'dragonFrenzy', name: 'Dragon Frenzy', desc: 'Dragons dig x3 faster', petMult: 3 },
      ],
    },

    // Placeholders for the Roblox store. The prototype simulates these purchases.
    premium: {
      gamepasses: [
        { id: 'doubleGold',  name: '2x Gold',         robux: 199, desc: 'Double gold forever' },
        { id: 'extraIncub',  name: '+2 Incubators',   robux: 249, desc: 'Two more nests, forever' },
        { id: 'autoDigPass', name: 'Auto Dig',        robux: 149, desc: 'Auto Dig before your first rebirth' },
        { id: 'luckyHatch',  name: 'Lucky Hatcher',   robux: 299, desc: 'Rare dragons x1.5 more often' },
      ],
      products: [
        { id: 'gems100', name: '100 Gems', robux: 99, gems: 100 },
        { id: 'gems550', name: '550 Gems', robux: 449, gems: 550 },
        { id: 'serverLuck', name: 'Server Egg Shower', robux: 49, desc: 'Starts an Egg Shower for the whole server' },
      ],
    },
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = CONFIG;
  else root.CONFIG = CONFIG;
})(typeof window !== 'undefined' ? window : globalThis);
