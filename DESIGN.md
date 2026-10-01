# Dig for Dragon Eggs: Design Plan

Plan for a Roblox incremental simulator, iterated first as an HTML prototype (`prototype/`).

Every rule in this doc carries one of three tags:

- **[Agreed]** comes from the brief and is settled.
- **[Proposed]** is my recommendation. It is in the prototype so we can feel it, but it needs your sign-off.
- **[Open]** is undecided and needs a call. These are collected in section 10.

All numbers live in `prototype/config.js`. `tools/sim.js` reads the same file and prints a pacing timeline. When this doc and the config disagree, the config wins.

---

## 0. Proposals that most need your sign-off

These shape everything else.

1. **Gold and Gems are currencies only. There are no "Gold" or "Gem" inventory items.** Digging a gold vein pays Gold directly, and digging a gem crystal pays Gems directly. The inventory resources are Wood, Stone and Iron, plus one new material per deeper layer (Crystal, Glowcap, Ember, Frost, Stardust). This removes the overlap the brief flagged, and "you dug gold, you got gold" needs no explanation for kids. **[Proposed]**
2. **A 2D side-view shaft, 7 blocks wide, with tap-to-dig.** In Roblox this is a real 3D avatar in a shaft, with the camera locked to a side view. **[Proposed]**
3. **Dragons have one stat, Power, which is damage per second they deal to nearby blocks on their own.** Power scales with your Strength upgrades and rebirths but not with your pickaxe, so deeper eggs are what make dragons stronger. **[Proposed]**
4. **Each layer has one egg type, and each egg type has five dragons, one per rarity.** That gives 35 dragons across 7 layers, which is a collectible Dragondex. **[Proposed]**
5. **Layers are gated by seals.** The top row of each layer needs a minimum pickaxe tier, and the pickaxe is crafted from the previous layer's materials. This is the main use of crafting. **[Proposed]**
6. **Rebirth resets the run (gold, materials, pickaxe, gold upgrades, depth) and keeps everything collected** (dragons, eggs, nests, gems, gem upgrades, Dragondex, Robux purchases). **[Proposed]**
7. **One shaft per player, side by side on a shared server.** You see neighbours digging and their dragons, and events are server-wide. **[Proposed]**

---

## 1. Mining interaction and screen layout

### The view **[Proposed]**

- The shaft is a vertical grid **7 blocks wide**, endless downward. One row equals one metre of depth.
- The camera follows the player and keeps them about a third of the way down the screen, so more ground below is visible than above. Looking down is where eggs are.
- The side walls cannot be dug. In Roblox they become glass windows into neighbouring players' shafts.
- Each layer has its own block colours, dug-out background tint and side-wall label (`30 m`). The ground gets darker with depth around a light radius centred on the player.

### Controls **[Proposed]**

| Input | Result |
|---|---|
| Tap a block next to open space | The character walks or climbs next to it (auto-path) and swings once. |
| Hold on a block | Keeps swinging. When it breaks, keeps digging **straight down**. Holding is the "lazy" mode and the one most kids will use. |
| Tap open space | Walk there. |
| Keyboard (PC) | Space or Down digs down. Click works like tap. |

- **Exposed rule:** only blocks touching open space can be targeted, so the player carves a tunnel instead of sniping blocks at random. Reach is 1 block in every direction, including diagonals.
- **Gravity:** the character falls into holes. Falling three metres after breaking a floor is part of the fun.
- **Swing rate:** 2.5 swings per second to start, upgradable. Taps are capped at the swing rate, with one buffered, so tapping fast gives no advantage over holding. This matters for fairness, mobile comfort and server rate limits.
- **Feedback on every hit:** damage number, crack stage, chip particles, hit sound. Crits (10% chance, x2) add variance. A break adds a screen-shake tick, a coin pop and a material pop.
- **Discovery hint:** blocks more than 6 rows below the player show a sparkle instead of their contents, so there is always "something down there" to dig toward. The scripted first egg is always visible.

### Screen layout (landscape first, as Roblox mobile is)

```
┌──────────────────────────────────────────────────────────────┐
│ (coin) Gold   (gem) Gems      23 m · Meadow Topsoil   Event ♪ ⚙ │  HUD
├──────┬──────────────────────────────────────────────┬─────────┤
│Dragons│   [goal pill: "Craft Stone Pick  Stone 12/30"] │  NESTS  │
│ Shop  │                                              │ [egg 0:42]│
│Rebirth│           7-wide shaft, player, dragons       │ [HATCH!] │
│ AUTO  │                                              │ [+ 120g] │
│       │              toasts                          │ 2 waiting│
└──────┴──────────────────────────────────────────────┴─────────┘
```

- **Left:** the three menus from the brief (Dragons, Shop, Rebirth) plus the Auto Dig toggle once it's unlocked. Dig is not a menu. It is the screen itself. Roblox players expect menu buttons on the left, and the right side stays clear of the thumb.
- **Right:** nests (incubators), always visible, so hatching runs alongside digging. A ready egg pulses, and one tap hatches it.
- **Menus open as a side sheet over part of the shaft.** Digging and dragons keep running behind it, so a menu never pauses the game.
- **Goal pill (top centre):** this is the tutorial for the first two minutes. After that it always shows the next concrete goal and its progress (pickaxe recipe, then rebirth depth).
- **Portrait fallback** (phones held upright, small windows): HUD, shaft, a row of nests, then a bottom menu bar.

---

## 2. The first session

Target: **first egg under 20 s, first hatch under 45 s, first upgrade under 90 s, a new layer around 2–4 min.** Sim and prototype times are below. The sim is an optimistic greedy player, so expect a real kid to take 1.5–2x longer.

| Time (sim) | Beat | How it's built |
|---|---|---|
| 0:00 | Spawn on the grassy surface. Goal pill: "Tap the ground to dig. Hold to keep digging!" An arrow bounces over the block below. | Topsoil breaks in 1–2 hits. Every block pays 1 gold. |
| 0:15 | **First egg.** A glowing egg sits 4 m straight down the starting column, so holding dig reaches it. Big sparkle, chime, "You found an egg!" It flies into nest 1. | The first egg is scripted at row 4, column 4. Its timer is 8 s instead of 15 s. |
| 0:30 | **First hatch.** The nest pulses: "Tap it to hatch." The egg wobbles three times and cracks, then a dragon pops out with rays and its rarity. | The first hatch is guaranteed **Uncommon** (Puffbloom). The only button is "Dig together!" |
| 0:30 | **First helper.** Puffbloom flies down and chews on blocks next to you. Pink damage numbers make its contribution visible. | It is auto-equipped into an empty slot. |
| ~0:45 | **First purchase.** "Buy Strength in the Shop" and the Shop button pulses. Strength costs 12 gold. | Strength makes you **and** your dragons hit harder, which ties the two together. |
| 1–2 min | More eggs (about every 6–7 m, with a pity guarantee). A second egg has to wait for the nest, which shows the "2 eggs waiting" pressure that sells nest 2 (120 gold). First sell-or-keep choice. | |
| ~1:45 | **The seal at 30 m.** The goal pill switches to the recipe: "Craft the Stone Pick: Gold 200, Stone 30, Wood 15". Crafting is a big moment: banner and "x7 damage". | Teaches crafting through the one recipe that matters. |
| 2–4 min | **Pebble Caverns.** Layer banner: "New egg: Pebble Egg". Blocks are visibly tougher, and Pebble dragons are 6x stronger than Meadow ones. | Shows that deeper means better eggs. |

By the end of the first session (about 25–45 min) a player has crafted the Iron Pick, reached the Crystal Grotto, owns 2–3 nests and 3 equipped dragons, and can see the Rebirth button glowing ahead at 150 m.

---

## 3. Progression

### 3.1 Depth and layers **[Proposed]**

| # | Layer | Starts | Seal needs | Block HP at top | Gold/block | New material | Egg |
|---|---|---|---|---|---|---|---|
| 1 | Meadow Topsoil | 0 m | – | 2 | 1 | Wood, Stone | Meadow |
| 2 | Pebble Caverns | 30 m | Stone Pick | 110 | 7 | Iron | Pebble |
| 3 | Crystal Grotto | 75 m | Iron Pick | 1.3K | 50 | Crystal | Crystal |
| 4 | Glowshroom Hollow | 130 m | Crystal Pick | 15K | 350 | Glowcap | Spore |
| 5 | Magma Depths | 195 m | Glowcap Pick | 170K | 2.5K | Ember | Ember |
| 6 | Frozen Core | 270 m | Ember Pick | 1.9M | 18K | Frost | Frost |
| 7 | Starfall Abyss | 355 m | Frost Pick | 21M | 130K | Stardust | Cosmic |

- Within a layer, HP and gold rise 3% per metre (5% in the endless Abyss). Between layers they jump about 10x (Meadow to Caverns is a bigger step, on purpose, because the Stone Pick is x7). Pickaxe tiers are about 7x, so each new layer also needs Strength levels. That is the steady gold sink.
- Layers get thicker as you go (30, 45, 55, 65, 75, 85 m), so each one lasts longer.
- Block mix per layer: about 52% plain, about 35% material veins, 8% gold veins (x8 gold), 0.6–2% gem crystals, plus eggs.

### 3.2 Equipment **[Proposed]**

Equipment is deliberately small: **one pickaxe** (crafted tiers) plus **four gold upgrades**.

| Pickaxe | Damage | Recipe |
|---|---|---|
| Twig | 1 | starting tool |
| Stone | 7 | 200 gold, 30 Stone, 15 Wood |
| Iron | 50 | 6K gold, 40 Iron, 80 Stone |
| Crystal | 350 | 100K gold, 40 Crystal, 60 Iron |
| Glowcap | 2.5K | 1.5M gold, 40 Glowcap, 60 Crystal |
| Ember | 17.5K | 23M gold, 40 Ember, 60 Glowcap |
| Frost | 122K | 360M gold, 40 Frost, 60 Ember |
| Starfall | 860K | 5.6B gold, 40 Stardust, 60 Frost |

| Gold upgrade | Effect per level | Cost |
|---|---|---|
| Strength | x1.12 damage, for you and your dragons | 12 x 1.38^level (no cap) |
| Swing Speed | +0.3 swings/s | 25 x 1.9^level (max 10) |
| Egg Sense | +12% egg chance in new ground | 40 x 1.8^level (max 15) |
| Warm Nests | eggs hatch 10% faster | 60 x 2^level (max 10) |

Strength is the "always something to buy" upgrade, and its exponential cost against exponential income is what produces ridiculous numbers. Numbers display with suffixes (K, M, B, T, Qa, Qi, …).

**[Open]** Do we want cosmetic pickaxe skins (Robux or event rewards)? They are cheap to build and kids love them, but they are out of MVP.

### 3.3 Eggs and dragons **[Agreed: found by digging, timed, skippable, sell or keep, pets help dig] [Proposed: everything below]**

**Egg discovery**
- Eggs are visible blocks inside the earth (2x HP, glowing), so you can see one and decide to dig toward it.
- Base chance is 1.2% per generated block, raised by Egg Sense. There is a pity rule: if 7 rows pass without an egg, one is forced. In practice that is an egg about every 5–7 m.
- The egg type is always the layer's egg. Deeper means better.

**Eggs → dragons**

| Egg | Hatch time (real) | Base power | Base sell |
|---|---|---|---|
| Meadow | 15 s | 0.8 | 20 |
| Pebble | 1 min | 5 | 150 |
| Crystal | 3 min | 35 | 1.1K |
| Spore | 7 min | 250 | 8K |
| Ember | 15 min | 1.75K | 60K |
| Frost | 30 min | 12K | 420K |
| Cosmic | 60 min | 85K | 3M |

| Rarity | Odds | Power x | Sell x |
|---|---|---|---|
| Common | 60% | 1 | 1 |
| Uncommon | 25% | 1.6 | 2 |
| Rare | 10% | 2.6 | 5 |
| Epic | 4.5% | 4.5 | 15 |
| Legendary | 0.5% | 10 | 60 |

Each egg has 5 named dragons, one per rarity (Meadow: Sprig, Puffbloom, Mossy, Clover, Sunpetal; full list in the config). Odds are always shown in-game. That is good practice and a Roblox requirement if anything random is ever sold for Robux.

**Hatching**
- **Nests** (incubators): 1 to start. Buy nest 2 for 120 gold and nest 3 for 2.5K gold, then nests 4–6 for gems (25, 60, 140). A Robux pass adds +2.
- Eggs auto-fill free nests. Extras wait in an **egg basket** (12 max). Beyond that, an egg sells for 30% of its value with a "basket full" message.
- **Timers run on real time and keep going while you're offline.** Coming back to a nest of ready eggs is the return hook.
- **What hatching upgrades improve:** Warm Nests (speed), nest count, Lucky Nests (a gem upgrade that makes rarer dragons more likely), Auto-Hatch (gem unlock or rebirth 3).
- **Skip:** gems (1 gem per 30 s remaining) or Robux, priced by time bracket (5 / 15 / 35 / 75 R$).

**Helpers**
- **Equipped slots:** 3 to start, 4th at rebirth 2, up to 3 more for gems. **[Open]** Should we also sell a +slot gamepass?
- **Power = damage per second.** Each equipped dragon flies to an exposed block near you and chews on it. Pink damage numbers show what it's doing.
- Pet damage = Power x Strength multiplier x rebirth multiplier x gem upgrades x events. A Common from a layer's egg starts at about 30% of the player's own damage per second in that layer. A Legendary roughly triples it. Three good dragons out-dig the player, which is what makes Auto Dig (below) feel earned.

**Sell or keep**
- Sell value is set so that **selling 3–5 Commons is about one upgrade** in the layer they came from, which is a real choice early on. Later, Commons from earlier eggs become sell fodder.
- Dragon storage: 40, with mass actions ("Equip best", "Sell all unequipped Commons", and auto-sell Commons when Auto-Hatch is on).
- Duplicates are fine. Every hatch also fills in the **Dragondex**. **[Proposed for later]** "Merge 5 duplicates into a Golden version (x2.5 power)" is the most common pet-sim duplicate sink, and it stays within "no breeding" because it's a one-button upgrade.

### 3.4 Rebirth **[Agreed: rebirth exists] [Proposed: rules]**

- Unlocks on reaching **150 m** (inside Glowshroom Hollow). Each later rebirth needs **+50 m**, capped at 450 m.
- Each rebirth gives, permanently: **gold x(1 + 0.5 x rebirths)**, **dig power x(1 + 0.5 x rebirths)** for you and your dragons, and **15 + 5 x rebirth number gems**.
- Milestone unlocks: rebirth 1 gives **Auto Dig**, rebirth 2 gives **+1 dragon slot**, rebirth 3 gives **Auto-Hatch**.
- Every run regenerates the world from a new seed.

Sim pacing (greedy player): rebirth 1 at about 25 min, rebirth 2 about 17 min later, rebirth 3 about 12 min after that. Expect real players to take about 1.5–2x longer, so the first rebirth lands in roughly a first or second session. **[Open]** The sim shows a dead stretch of about 8 minutes in Pebble Caverns with no milestone. Playtests should check whether eggs and Strength buys fill it, or whether it needs a mid-layer goal such as a "vein rush" pocket.

---

## 4. Economy: sources and sinks

| Currency or resource | Sources | Sinks |
|---|---|---|
| **Gold** | Every block (layer gold rate), gold veins (x8), selling dragons, selling materials, selling eggs when the basket is full | Strength and other gold upgrades, pickaxe recipes, nests 2–3 |
| **Gems** | Gem crystals in the ground (1 to start, +1 every two layers), rebirth reward, Robux packs. Later: daily login, Dragondex milestones, events, quests | Nests 4–6, dragon slots 4–6, gem upgrades (Gold Rush, Dragon Snacks, Lucky Nests, Auto-Hatch), hatch skips |
| **Robux** | Player purchase | Gamepasses, gem packs, hatch skips, server events (section 6) |
| **Materials** (Wood, Stone, Iron, Crystal, Glowcap, Ember, Frost, Stardust) | Veins of that material | Pickaxe recipes. Spares sell for gold. The Shop sell button keeps what the next two pickaxes need, so kids can't sell their recipe by accident. |

Balance assumptions:
- Gold income per layer rises about 7x. Strength costs rise 1.38x per level and give 1.12x damage, so roughly 5–6 Strength levels per layer keep pace.
- Each pickaxe costs a few hundred blocks' worth of gold from the layer before it (Stone Pick about 150 Meadow blocks, Iron Pick about 450 Caverns blocks), so players also buy Strength and sell spares along the way.
- Gems are scarce on purpose (about 1 per 150 blocks early), so a gem purchase is a considered choice. Nothing essential sits behind gems before the first rebirth.

---

## 5. What resets and what persists on rebirth **[Proposed]**

| Resets (the run) | Persists (the collection) |
|---|---|
| Gold | Dragons, equipped team |
| Materials | Eggs in nests and the basket (timers keep running) |
| Pickaxe (back to Twig) | Nest count, dragon slots |
| Gold upgrades (Strength, Swing, Egg Sense, Warm Nests) | Gems and gem upgrades |
| Depth (new seed, back to the surface) | Dragondex |
| | Rebirth count and its multipliers and unlocks |
| | Robux purchases, settings |

Why keep the eggs: losing an unhatched Legendary-chance egg feels bad to kids, and the eggs were earned. To stop players hoarding deep eggs before rebirthing, the basket is capped at 12.

---

## 6. Automation, server events and premium

### Automation **[Agreed: eventual auto mode] [Proposed: unlock order]**

| Feature | Unlock | Notes |
|---|---|---|
| Hold to dig | Start | Already a light form of automation |
| Auto-fill nests | Start | Fewer menu chores for kids |
| Auto-equip into an empty slot | Start | |
| **Auto Dig** | Rebirth 1, or the Auto Dig gamepass | The character picks targets, preferring eggs, then gems, then gold, then down. It digs at the normal swing rate, so it never beats active play. |
| **Auto-Hatch** | Rebirth 3, or 40 gems | Ready eggs hatch with a toast instead of the reveal. Optional auto-sell for Commons. |
| Offline digging | Later | Equipped dragons dig at 10% while you're away, up to 2 h, collected on return. |

### Server events **[Agreed: real-time, buffs or brief minigames] [Proposed: designs]**

Every about 2.5 min in the prototype (about 15 min in the live game), a 45 s event starts for everyone in the server, with a HUD banner and countdown:

| Event | Effect | Kind |
|---|---|---|
| Golden Hour | All gold x2. Golden tint. | Buff |
| Egg Shower | Any block can drop an egg (5%). Eggs fall in the background. | Buff |
| Dragon Frenzy | Dragons dig x3. | Buff |
| **Later:** Wild Dragon | A giant friendly dragon flies through every shaft. Everyone taps it for 30 s and gets eggs based on taps. | Minigame |
| **Later:** Treasure Vein | A glowing vein appears in every shaft. The first to break it gets a bonus, and everyone gets a share. | Minigame |

A purchasable **Server Egg Shower** (49 R$) triggers an Egg Shower for everyone, with "Thanks @name!" in chat. It's social, everyone benefits, and it's a proven pattern in Roblox simulators.

### Premium **[Agreed: Robux for skips and premium] [Proposed: catalogue, placeholder prices]**

| Item | Type | Price (placeholder) |
|---|---|---|
| 2x Gold | Gamepass | 199 R$ |
| +2 Nests | Gamepass | 249 R$ |
| Auto Dig (early) | Gamepass | 149 R$ |
| Lucky Hatcher (rarer dragons x1.5) | Gamepass | 299 R$ |
| Hatch now | Dev product, price by time left | 5 / 15 / 35 / 75 R$ |
| Gem packs | Dev product | 99 R$ for 100, 449 R$ for 550 |
| Server Egg Shower | Dev product | 49 R$ |

Guardrails:
- Never sell eggs or random dragons directly for Robux in MVP. If we add it later, show odds before purchase and respect `PolicyService` `ArePaidRandomItemsRestricted` for each player.
- No purchase prompts in the first five minutes, and never a prompt in the middle of a tap.
- Everything sold for Robux is also reachable by play (except the pure multipliers), so free players never hit a wall.

---

## 7. MVP and later

### M0: HTML prototype (this repo, now)

Proves the core feeling: dig, discover an egg, hatch a cute dragon, buy the next upgrade.

Included: 7 layers, 35 dragons, seals and pickaxe crafting, 4 gold upgrades, nests with skip, sell or keep, Dragondex, rebirth, gem upgrades, Auto Dig, Auto-Hatch, 3 events, simulated Robux store, saves in the browser, settings with timer speed and cheats for testing.

**Playtest questions** (watch 5–8 kids aged 7–12 for 10 minutes each):
1. Do they find and hatch the first egg without help?
2. Do they say "aww" or name the dragon? Does the reveal land?
3. Do they understand that the dragon is helping?
4. Do they choose to sell or keep on their own, and why?
5. Is the Stone Pick seal clear, or does it read as a bug?
6. Hold or tap: which do they use?
7. At 10 minutes, do they want to continue?

### M1: Roblox vertical slice (about 4–6 weeks)

Single shaft per player, layers 1–3, 3 eggs and 15 dragons, Strength and Swing Speed, pickaxes 1–3, nests 1–3, sell or keep, ProfileStore saves, one dev product (Hatch now) and one gamepass (2x Gold) wired end to end, and analytics funnel events. **Exit criteria:** the onboarding funnel (spawn, first dig, first egg, first hatch, first upgrade, Stone Pick) shows 70% or more of players reaching the Stone Pick in internal playtests, and a crash-free 30-minute session.

### M2: Soft launch

All 7 layers, rebirth, gem upgrades, Auto Dig and Auto-Hatch, 3 buff events, Dragondex, daily reward, global leaderboards (deepest, rebirths, Dragondex), full store, settings, and mobile, PC and console input passes.

### M3: Live ops (in priority order)

Weekly limited egg, Golden merge, Wild Dragon minigame, quests and achievements, codes, offline digging, seasonal layer skins, group join reward, pickaxe skins. **Not planned:** trading (scams and moderation load), dragon combat, breeding, farming, deep crafting.

---

## 8. Roblox implementation architecture

### Toolchain
Rojo for files and Git, Wally for packages, Luau with `--!strict`, StyLua and Selene, TestEZ or Jest-Lua for unit tests on pure modules. `config.js` ports to `ReplicatedStorage/Shared/Config/*.luau` tables with the same shape, so we keep one source of truth during the port.

### World and camera
- **Plots:** each server has about 8–12 shafts side by side under a shared surface hub (spawn, leaderboards, rebirth statue, event stage). Glass side walls let you see neighbours.
- **Grid:** a logical 7-wide grid per player, owned by the server. The client renders a window of about ±30 rows with pooled Parts or MeshParts (one per cell) and recycles them as the camera moves. There is no terrain voxel editing.
- **Avatar:** the real Roblox character, moved along a fixed plane (Z locked). Movement is grid pathing (BFS, as in the prototype) plus `Humanoid:MoveTo` per cell, with gravity from the physics engine.
- **Camera:** `Scriptable`, side-on, low field of view (about 30–40) for a near-flat look, following the player's Y with smoothing.
- **Input:** `UserInputService` tap or click, then a raycast to a cell, then a target request. Gamepad: the stick moves and the A button digs the block in front or below.

### Server authority
Rewards are server-authoritative, with client prediction for feel.

```
Client                               Server (MineService)
tap cell ──── RequestTarget(r,c) ──▶ validate: cell exposed, within reach of the server-side player cell
hold      ──── SetSwinging(true) ──▶ server ticks swings at swingRate (server clock), applies damage
predict crack/particles locally      on break: roll drops, add gold/mats/gems/eggs, update profile
◀── CellUpdate(r,c,hp|broken) ────── replicate to owner (and neighbours for the visuals)
◀── RewardPopup(kind, amount) ────── client shows the "+12" text when it arrives
```

- The client never sends damage, rewards, depth or timers. It only sends intent (target, swinging, buy X, hatch slot N).
- The server rate-limits every remote and drops impossible requests (wrong plot, out of reach, faster than the swing rate).
- **Generation happens on the server** from a per-run seed. The client receives the contents of revealed cells only, so exploiters can't scan for eggs.
- Dragons' damage runs in the server tick (aggregate damage per second applied to chosen cells), and the client animates the dragons toward those cells.
- **Timers** are stored as absolute `os.time()` end times in the profile, so hatching continues offline. Clients display them using `workspace:GetServerTimeNow()`.

### Services (server) and controllers (client)

| Server | Responsibility |
|---|---|
| DataService | ProfileStore session-locked profiles, schema version and migrations, autosave, `BindToClose` |
| MineService | Grid generation, swings, pet ticks, drops, depth, seals |
| EggService | Nests, basket, hatching, rarity rolls, skips |
| DragonService | Inventory, equip, sell, Dragondex |
| ShopService | Upgrades, crafting, material selling, all price checks |
| RebirthService | Eligibility, reset and keep, unlocks |
| EventService | Server event schedule and purchased events |
| MonetizationService | Gamepass ownership cache, `ProcessReceipt` |
| AnalyticsService wrapper | Funnel, economy and progression events |

Client controllers: Mine (render and input), Camera, Pets (visuals), UI (React-Luau or Fusion), Audio.

### Persistence
- **ProfileStore** (session locking) with one profile per player. The schema mirrors the prototype's `S` object: currencies, mats, pick, up, gemUp, nests (with absolute end times), basket, dragons (id, egg, rarity), equipped, dex, rebirths, maxDepth, passes cache, settings, stats, plus `processedReceipts`.
- **The world is not saved**, only `seed`, `maxDepth` and the player's current row. On rejoin, regenerate the run from the seed and start the player at the surface of their deepest layer (a "lift"). This saves DataStore space and avoids storing dug cells. **[Open]** Is "lift to your deepest layer start" acceptable, or must the exact tunnel persist?
- Autosave every 60 s, on leave, and on `BindToClose`.

### Purchases
- **Dev products:** `MarketplaceService.ProcessReceipt` on the server. It is idempotent: check `profile.processedReceipts[PurchaseId]`, grant, record, save, and only then return `PurchaseGranted`. If the profile isn't loaded, return `NotProcessedYet`. "Hatch now" targets a specific nest index stored in a pending-purchase map when the prompt opens. If that nest is empty when the receipt arrives, grant equivalent gems instead.
- **Gamepasses:** `UserOwnsGamePassAsync` on join, cached in the profile, and updated on `PromptGamePassPurchaseFinished`. Effects are always read from the server cache.
- Every price comes from shared config on the server. Never trust a client-sent price.

### Analytics (from day one)
`AnalyticsService:LogOnboardingFunnelStepEvent` for the first-session funnel above. `LogEconomyEvent` for every gold, gem and Robux source and sink. `LogProgressionEvent` for layers and rebirths. Custom events for egg found, hatch (with rarity), sell or keep, and event participation.

---

## 9. Prototype notes

- Run: open `prototype/index.html` in a browser. There is no build step. Progress saves in the browser.
- Tune: edit `prototype/config.js`, then run `node tools/sim.js 3` to see the pacing timeline before playing.
- The **⚙ settings** button has hatch timer speed (1x, 5x, 30x), cheats (+gold, +gems, +egg), forced events and a save reset.
- Robux buttons only simulate purchases.

---

## 10. Open questions

1. Accept "Gold and Gems are currencies only" (section 0, item 1)?
2. Rebirth at 150 m and the reset and keep table (section 5): too generous, or too harsh?
3. Keep eggs and nests through rebirth?
4. Should the first hatch be guaranteed Uncommon (current), or always a fixed signature dragon?
5. Are 7 layers and 35 dragons right for launch, or 5 layers and 25 dragons with faster live-ops additions?
6. Live event cadence: every 15 min, or tied to real-world clock times ("Golden Hour at :00")?
7. The rejoin "lift" instead of saving the tunnel (section 8, Persistence)?
8. Art direction for Roblox: blocky low-poly to match Roblox, or soft rounded "toy" shapes like the prototype's dragons?
9. Robux price points and which gamepasses ship at soft launch.
