# Collect Planets (Roblox) — design benchmark profile

> Research conditions (2026-10-01): every direct page fetch was blocked by the network egress policy. That covered roblox.com, the Roblox APIs and roproxy, devforum.roblox.com, romonitorstats.com, youtube.com, dexerto.com, progameguides.com and fan wikis. All findings below come from web-search result snippets and the search engine's summaries of those pages. I could not open or check the underlying pages, and most metrics in the snippets carry no date. Treat every number here as **unverified** until someone checks it against the live experience page or RoMonitor.

## 1. Identity: which game is "Collect Planets"? (title, developer, URL/ID, launch date)

### Takeaway
A Roblox experience titled exactly **"Collect Planets"** exists, by **RockyStar Studios** (place ID 91860758705132). Its loop is very close to "Dig for Dragon Eggs": dig asteroids for orbs, hatch the orbs into planets, and the planets earn money, including offline. The only traction figure I found is about 500 CCU, which is a mid-size game and not a viral hit. If the user meant a viral 2026 planet game, the more likely candidates are **Mine a Planet** (Skydog Games) and possibly **Planet RNG** (Planet World Inc).

### Cited Findings
- The exact title "Collect Planets" exists at roblox.com/games/91860758705132/Collect-Planets — [Roblox experience page](https://www.roblox.com/games/91860758705132/Collect-Planets). One search summary printed the ID as 91860758905132, but the linked URL uses 91860758705132. The second ID is probably a typo; it is unverified.
- Developer: RockyStar Studios — [search summary citing the Roblox page / DevForum post](https://www.roblox.com/games/91860758705132/Collect-Planets)
- A DevForum hiring post exists titled "[Hiring] Thumbnail Artist for Collect Planets — $20/day — Ongoing" (topic 4894609) — [DevForum](https://devforum.roblox.com/t/hiring-thumbnail-artist-for-collect-planets-%E2%80%94-20day-%E2%80%94-ongoing/4894609)
- A YouTube gameplay video titled "I must COLLECT THE PLANETS in Roblox..." exists. I could not get the channel, date or views because the fetch was blocked — [YouTube](https://www.youtube.com/watch?v=tnCCOMEF5zQ)
- **Alternative candidate: Mine a Planet** by Skydog Games, an "idle incremental simulator" in which laser drones mine a voxel planet around the clock. It reports 6.6M visits and 184.8K favorites (undated, snippet). Several outlets were still updating its codes pages in August and September 2026 — [allthings.how / search summary](https://allthings.how/roblox-mine-a-planet-active-codes-and-how-to-get-cash-fast/); [Dexerto](https://www.dexerto.com/roblox/mine-a-planet-codes-3387729/); [Insider Gaming](https://insider-gaming.com/roblox-mine-planet-codes/); [PCGamesN](https://www.pcgamesn.com/roblox/mine-a-planet-codes)
- **Alternative candidate: Planet RNG** by Planet World Inc, released July 2026. You roll for weapons and destroy planets, and the game has 50+ planets to discover. The milestone codes "100KVISITS", "400KVISITS!" and "200CCU" suggest it is small — [planetrng.wiki / search summary](https://planetrng.wiki/); [Roblox page](https://www.roblox.com/games/107099092059259/Planet-RNG); [Pro Game Guides](https://progameguides.com/roblox/planet-rng-codes/)
- **Not a match: Find the Planets** by Solarbyte Games, released 2024-09-25. It is a "find the X" exploration game with 271 planets plus 10 event planets across 5 worlds — [Find The Planets Wiki](https://ftp.fandom.com/wiki/Find_The_Planets_Wiki)

### Inferences
- The exact title match plus the hatch/collection loop makes RockyStar's "Collect Planets" the most likely referent. It is also the best structural benchmark for dragon eggs: dig, get orb, hatch, collect planet, earn income, buy better orbs. It does not look viral, though. If the user's "viral hit" memory is accurate, they may be thinking of Mine a Planet. That game has much more press coverage (Dexerto, PCGamesN, Insider Gaming, Sportskeeda, a dozen fan wikis), which fits a breakout hit.
- I could not find a launch date for Collect Planets. The high place ID (9.18e13) is in the range Roblox assigned to experiences created around 2025, but that is an inference only.

### Gaps
- Launch date, group name/ID and universe ID for Collect Planets: not found, because the Roblox page and APIs were blocked.
- I could not ask the user which game they meant. **Confirm with the user** whether they meant Collect Planets (RockyStar) or Mine a Planet (Skydog).

## 2. Metrics: visits, favorites, CCU, chart placement

### Takeaway
For Collect Planets I found only undated, unverified figures: about 500 CCU, about 150K Robux/day, and a rating of 95.64% from 7,021 votes. I found no visit count, favorites count, peak CCU or chart placement.

### Cited Findings
- About 500 concurrent users and about 150K Robux per day in revenue. This is undated and probably self-reported in the DevForum hiring post, though the search summary did not name its source clearly — [DevForum hiring post (via search summary)](https://devforum.roblox.com/t/hiring-thumbnail-artist-for-collect-planets-%E2%80%94-20day-%E2%80%94-ongoing/4894609)
- Rating of 95.64/100 based on 7,021 ratings (undated). Platforms listed: Windows, macOS, iOS, Android, Xbox, PlayStation, Meta Quest. Modes: single player, multiplayer, co-op — [search summary of Roblox page/aggregator](https://www.roblox.com/games/91860758705132/Collect-Planets)
- For comparison, Mine a Planet: 6.6M visits and 184.8K favorites (undated) — [allthings.how via search summary](https://allthings.how/roblox-mine-a-planet-active-codes-and-how-to-get-cash-fast/)

### Inferences
- 7,021 ratings fits a game with hundreds of thousands to low millions of visits. That is my estimate only.
- 150K Robux/day at about 500 CCU would be very high monetization per player (about 300 Robux per CCU per day). If true, it suggests strong paid-hatch or gamepass conversion, but the figure is self-reported and unverified.

### Gaps
- Visits, favorites, peak CCU, Discover/chart placement, and the dates for all of them. RoMonitor Stats and Rotrends were blocked.

## 3. Core loop, feel and controls

### Takeaway
The loop is: dig up asteroids, collect orbs, hatch orbs, get new planets. Planets generate money, including offline, and money buys better orbs. Owned planets fill slots in your own solar system. It is the same skeleton as "dig, find eggs, hatch dragons".

### Cited Findings
- "Collect planets to grow your very own solar systems, dig up asteroids to get orbs, hatch the orbs to discover new planets, and earn money from your planets to afford better orbs. Planets generate money offline." (game description) — [Roblox experience page](https://www.roblox.com/games/91860758705132/Collect-Planets)
- Described as an "idle/incremental" game where players "collect and upgrade planetary slots through an orb/mutation system" — [DevForum hiring post (via search summary)](https://devforum.roblox.com/t/hiring-thumbnail-artist-for-collect-planets-%E2%80%94-20day-%E2%80%94-ongoing/4894609)
- For comparison, the Mine a Planet loop: three starter drones keep breaking ores from your planet, 24/7 including offline. Ore sells for cash, which buys drones and upgrades and upgrades the planet to raise ore quality — [Sportskeeda beginner's guide (via search summary)](https://www.sportskeeda.com/roblox-news/mine-planet-a-beginner-s-guide)

### Inferences
- The solar system works as a personal showcase base. Collected planets are physically displayed as the player's progress, the way dragons around a nest could be.

### Gaps
- Feedback and feel (VFX, sounds, number pop-ups), mobile vs PC controls, and whether digging is manual, tool-based or automated: not found.

## 4. Collection mechanics

### Takeaway
Collecting is built on planet "slots" with a blueprint/silhouette system. Undiscovered planets show as silhouettes, and a reveal animation plays when one is filled. Mutations layer multiplier tiers (Gold, Diamond, Rainbow) on top of the base collection.

### Cited Findings
- Features listed: "mutation-based scaling system with Gold, Diamond, and Rainbow tiers, a blueprint/silhouette slot system with reveal animations, a friend boost system, and 24-hour offline earnings" — [DevForum hiring post / Roblox page (via search summary)](https://devforum.roblox.com/t/hiring-thumbnail-artist-for-collect-planets-%E2%80%94-20day-%E2%80%94-ongoing/4894609)
- Hatching orbs is how you "discover new planets", and better orbs (bought with money) are the progression lever — [Roblox experience page](https://www.roblox.com/games/91860758705132/Collect-Planets)
- For comparison, Mine a Planet's Index: "new drones, mutations, and Pets are not only collection entries — Index progress can grant permanent bonuses" — [mineaplanet wiki sites (via search summary)](https://mineaplanet.wiki/wiki/items-and-rewards/); its drone gacha uses "free and unlimited rolls" — [Sportskeeda (via search summary)](https://www.sportskeeda.com/roblox-news/mine-planet-a-beginner-s-guide)

### Inferences
- The silhouette slots act as a visible index. Players can see exactly what they are missing, which creates a clear goal-gradient pull, and the reveal animation is the reward moment. For dragon eggs this maps to a nest or index wall of dragon silhouettes, with Gold, Diamond and Rainbow dragon variants as a second collection layer.

### Gaps
- Total number of planets, rarity tiers and odds, odds disclosure, completion rewards, how duplicates are handled, and the exact mutation multipliers: not found.

## 5. Progression: upgrades, rebirth, multipliers, automation

### Takeaway
Confirmed elements are offline earnings (24 hours), better orb tiers, mutation multiplier tiers and a friend boost. I found no evidence about rebirth.

### Cited Findings
- 24-hour offline earnings; mutation scaling with Gold, Diamond and Rainbow; friend boost — [DevForum hiring post (via search summary)](https://devforum.roblox.com/t/hiring-thumbnail-artist-for-collect-planets-%E2%80%94-20day-%E2%80%94-ongoing/4894609)
- For comparison, Planet RNG's rebirth "keeps all your weapons, upgrades & fleets" and costs only credits; the panel previews the stat gains (for example, rebirth 130 → 131 with a Luck jump) — [planetrng.wiki (via search summary)](https://planetrng.wiki/)
- For comparison, in Mine a Planet early priorities are drone rolls, then dock platforms (each seats one more drone), then Cargo/Speed upgrades — [Sportskeeda (via search summary)](https://www.sportskeeda.com/roblox-news/mine-planet-a-beginner-s-guide)

### Gaps
- Rebirth or prestige rules, number escalation and auto-hatch for Collect Planets: not found.

## 6. First-session pacing

### Takeaway
I found no data on first-session pacing for Collect Planets.

### Cited Findings
- None for Collect Planets. For comparison, Mine a Planet gives three starter drones immediately and unlimited free rolls — [Sportskeeda (via search summary)](https://www.sportskeeda.com/roblox-news/mine-planet-a-beginner-s-guide)

### Gaps
- Time to the first 1, 5 and 15 minutes' milestones, first upgrade, first rare and first rebirth. The next step is a hands-on playtest or YouTube review, which this environment could not do.

## 7. Monetization

### Takeaway
The only monetization data point is a claimed (unverified) revenue of about 150K Robux/day. I found no gamepass or developer-product prices.

### Cited Findings
- About 150K Robux/day — [DevForum hiring post (via search summary)](https://devforum.roblox.com/t/hiring-thumbnail-artist-for-collect-planets-%E2%80%94-20day-%E2%80%94-ongoing/4894609)
- The developer pays a thumbnail artist $20/day on an ongoing basis. That points to continuous thumbnail A/B testing for discovery — [DevForum](https://devforum.roblox.com/t/hiring-thumbnail-artist-for-collect-planets-%E2%80%94-20day-%E2%80%94-ongoing/4894609)

### Gaps
- Gamepasses, developer products, prices, premium currency, paid orbs and odds disclosure, starter packs, server boosts and limited offers. The store tab was blocked.

## 8. Live ops, codes and social

### Takeaway
The friend boost is the only confirmed social feature. I found no codes pages for Collect Planets, which also points to a small footprint (codes-site coverage usually follows popularity).

### Cited Findings
- Friend boost system — [DevForum hiring post (via search summary)](https://devforum.roblox.com/t/hiring-thumbnail-artist-for-collect-planets-%E2%80%94-20day-%E2%80%94-ongoing/4894609)
- Searching for "Collect Planets" codes returned only other games (Planet RNG, Orbs) — [Robloxden Planet RNG codes](https://robloxden.com/game-codes/planet-rng)
- For comparison, Mine a Planet ships numbered "BETA" updates (BETA 7–10, with codes UPDATE7 and UPDATE8) and has codes such as EARTH, DISCORD and DRONES. Rewards are batteries, drone packs, alien treats and time skips — [Pro Game Guides](https://progameguides.com/roblox/mine-a-planet-codes/); [search summary of codes sites](https://insider-gaming.com/roblox-mine-planet-codes/)
- For comparison, Planet RNG uses visit/CCU milestone codes (100KVISITS, 400KVISITS!, 200CCU, 5KMEMBERS!) plus daily/weekly quests, login rewards and global leaderboards — [planetrng.wiki](https://planetrng.wiki/); [Robloxden](https://robloxden.com/game-codes/planet-rng)

### Gaps
- Update cadence, events and group/Discord size for Collect Planets.

## 9. Why it succeeded

### Takeaway
I found no press coverage, analytics or creator statements explaining Collect Planets' performance. The reasons below are inferred from its feature list only.

### Cited Findings
- Its self-described feature set: hatch reveals, silhouette slots, mutation tiers, offline earnings, friend boost — [DevForum (via search summary)](https://devforum.roblox.com/t/hiring-thumbnail-artist-for-collect-planets-%E2%80%94-20day-%E2%80%94-ongoing/4894609)
- 95.64% rating (unverified, undated) — [search summary](https://www.roblox.com/games/91860758705132/Collect-Planets)

### Inferences
- Likely retention drivers: visible empty silhouette slots (a completion urge), reveal animations on hatch, mutation tiers that give duplicates value, and offline income that pulls players back daily. Investing in thumbnails points to a discovery-driven acquisition strategy.

### Gaps
- No Reddit, press or developer commentary found. Mine a Planet has far more press coverage and would make a better-documented "viral" benchmark if the user is open to swapping.
