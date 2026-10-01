# AGENTS.md

Guidance for AI coding agents working in this repo.

## Project

**Dig for Dragon Eggs** is a Roblox incremental simulator for kids. You dig down through magical layers, find dragon eggs, hatch cute dragons that help you dig, upgrade, and rebirth. The end goal is a playable, monetized Roblox game. For now we iterate on an HTML prototype.

The game's single job is to make **digging, discovering an egg, hatching a cute dragon and buying the next upgrade** feel satisfying. Judge every change against that.

## Layout

| Path | What it is |
|---|---|
| `DESIGN.md` | The design plan: mining, first session, progression, economy, rebirth, events, premium, MVP milestones, Roblox architecture. |
| `prototype/index.html` | Page markup and all CSS. |
| `prototype/config.js` | **Every number and all content**: layers, block kinds, materials, pickaxes, upgrades, eggs, dragons, rarities, nests, rebirth, events, premium catalogue. |
| `prototype/game.js` | Game logic, input, canvas rendering, UI panels. One IIFE, no modules. |
| `tools/sim.js` | Pacing sim. Reads `config.js` and prints a timeline of milestones per rebirth run. |

## Running

- **Prototype:** open `prototype/index.html` in a browser. There is no build step, no bundler and no dependencies. Progress saves to `localStorage` under the key `ddeggs.save.v1`.
- **Sim:** `node tools/sim.js 3`. The argument is how many rebirths to simulate.
- **In-game testing aids:** the ⚙ settings panel has hatch timer speed (1x, 5x, 30x), cheats (+gold, +gems, +egg), forced events and a save reset. In the browser console, `window.__game` exposes the live state `S`, runtime `R`, `C` (config), `hatch` and `startEvent`.

## Rules

### Design doc
- Every rule in `DESIGN.md` is tagged **[Agreed]** (from the original brief, settled), **[Proposed]** (a recommendation awaiting the owner's sign-off) or **[Open]** (undecided, also listed in section 10).
- Never retag something as Agreed yourself. Only the owner agrees things.
- When you add or change a mechanic, update `DESIGN.md` in the same change, and tag it Proposed unless the owner decided it.
- `config.js` is the source of truth for numbers. If the doc and the config disagree, the config wins, so fix the doc.

### Balance
- Put numbers and content in `config.js`, never hard-coded in `game.js`. The one exception is pure presentation, such as particle counts or animation timing.
- After any balance change, run `node tools/sim.js 3` and check the pacing targets in `DESIGN.md` sections 2 and 3.4. Current targets: first egg under 20 s, first hatch under 45 s, first upgrade under 90 s, second layer at 2–4 min, first rebirth at about 25 min in the sim (about 40–50 min for a real player).
- The sim is a greedy, optimistic player. Treat it as a cliff detector, not a prediction.
- If you add a mechanic that affects pacing, model it in `tools/sim.js` too.

### Keep config portable to Roblox
- `config.js` is meant to port almost 1:1 to Luau ModuleScripts. Keep it plain data: objects, arrays, numbers and strings. No functions, no computed values, no references between entries.
- Formulas (cost curves, HP scaling) belong in code, with their shape documented in the config comments.
- Keep game state in the single plain object `S` in `game.js`. It mirrors the planned Roblox player profile, so no class instances, Maps or Sets in `S`, and nothing that can't round-trip through JSON.
- Runtime-only state (animation, particles, paths, pets' positions) goes in `R`, which is never saved.
- If you change the shape of `S`, either keep old saves loading (new fields get defaults through `newGame()`) or bump `v` and the save key.

### Prototype code
- Vanilla JS and canvas only. No frameworks, no build tools, no npm dependencies in the prototype.
- External resources must come from the allowed CDNs only (Google Fonts is currently the only one used), because the prototype is also published as a claude.ai artifact.
- Match the existing style: 2-space indent, single quotes, semicolons, short helper functions, comments only where the reason isn't obvious.
- Dragons, eggs and pickaxes are drawn procedurally (`drawDragon`, `drawEgg`, `drawPick`). Add new looks there instead of adding image files.
- Landscape is the primary layout (Roblox mobile is landscape). Portrait must still work. Check both.

### Scope
- Keep dragons mechanically simple: one stat (Power). Don't add creature combat, breeding, farming, trading or elaborate crafting. The brief rules these out.
- Keep moment-to-moment controls simple (tap and hold). Put complexity in progression choices.
- Robux purchases in the prototype only simulate the purchase. Never sell eggs or random dragons directly for Robux without showing odds first (Roblox paid random items policy).

## Checking a change

There's no test suite yet. Before you call a change done:
1. Syntax-check: `node -e "new (require('vm').Script)(require('fs').readFileSync('prototype/game.js','utf8'))"`.
2. Load the page in a browser (or headless with Playwright) and confirm there are no console errors. A failed Google Fonts request in an offline sandbox is expected and harmless.
3. Play the first minute from a reset save: dig, first egg, first hatch, first Strength purchase.
4. If you touched balance, run the sim and report the milestone times.

## Commits

- One logical change per commit, with a clear imperative subject line.
- Don't commit generated files, screenshots or local saves.
