# Dragon Eggs

A Roblox incremental simulator, prototyped in HTML first.

- `DESIGN.md`: the design plan (mining, first session, progression, economy, rebirth, events, premium, MVP and Roblox architecture). Each rule is tagged Agreed, Proposed or Open.
- `prototype/`: playable prototype. Open `prototype/index.html` in a browser; there is no build step. Every push to `main` deploys it to https://ashleyrevlett.github.io/dragon-eggs/.
  - `config.js`: every number and all content (layers, eggs, dragons, prices). Shaped to port to Luau tables.
  - `game.js`: game logic and canvas rendering.
- `tools/sim.js`: pacing sim that reads the same config. Run `node tools/sim.js 3` after changing numbers.
- `AGENTS.md`: instructions for AI coding agents (`CLAUDE.md` points Claude Code to it).
- `research/benchmarks.md`: benchmark research on comparable Roblox games, with recommendations for our design. Raw notes are in `research/notes/`.
