--!strict
-- The shaft: server-owned grid per player, generated from the profile seed exactly like the prototype.
-- Streams block models around the player, runs swings (with smash) and dragon damage, pays rewards.
-- Clients only send intents: a target cell (tap), holding on/off, and Surface.
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Config = require(Shared.Config)
local Grid = require(Shared.Grid)
local Rules = require(Shared.Rules)
local Rng = require(Shared.Rng)
local Models = require(Shared.Models)

local Mine = {}
local ctx: any
local COLS = Grid.COLS
local REVEAL_ROWS = 6 -- rows below the player whose contents are shown; deeper ones show a sparkle only
local WINDOW_UP, WINDOW_DOWN = 12, 18 -- rows streamed around the player
local TAP_TTL = 3 -- seconds a tap waits for the player to walk into reach

type Cell = { k: string, hp: number, max: number, m: string?, e: string?, t: number?, first: boolean? }
type State = {
	player: Player, slot: number, rows: { [number]: { [number]: Cell | false } }, genTo: number,
	models: { [number]: { [number]: Model } }, shown: { [number]: { [number]: string } },
	target: { number }?, tapAt: number, holding: boolean, cd: number, lastSwing: number,
	pr: number, pc: number, petT: number, petTargets: { [number]: { number }? },
}
local states: { [Player]: State } = {}

local function profile(st: State): any return ctx.Data.get(st.player) end

-- ------------------------------------------------------------ generation (same as the prototype's genRow)
local function mkCell(kind: string, r: number, extra: { [string]: any }?): Cell
	local hp = Rules.cellHp(kind, r)
	local cell: any = { k = kind, hp = hp, max = hp }
	if extra then for k, v in extra do cell[k] = v end end
	return cell
end

local function genRow(p: any, r: number): { [number]: Cell | false }
	local L = Rules.layerOf(r)
	local rng = Rng.mulberry(Rng.hash2(p.seed, r))
	local row: { [number]: Cell | false } = {}
	if L.sealTier > 0 and r == L.start then
		for c = 0, COLS - 1 do row[c] = mkCell("seal", r, { t = L.sealTier }) end
		return row
	end
	local keys, tot = {}, 0
	for k, w in L.weights do table.insert(keys, k); tot += w end
	table.sort(keys) -- stable order (JS object order isn't available in Luau)
	local hasEgg = false
	for c = 0, COLS - 1 do
		if not p.firstEggPlaced and r == Config.eggs.firstEggRow and c == 3 then
			row[c] = mkCell("egg", r, { e = L.egg, first = true }); p.firstEggPlaced = true; hasEgg = true
		elseif r > 1 and rng() < Rules.eggChance(p) then
			row[c] = mkCell("egg", r, { e = L.egg }); hasEgg = true
		else
			local x, key = rng() * tot, "base"
			for _, k in keys do x -= L.weights[k]; if x <= 0 then key = k; break end end
			if Config.materials[key] then row[c] = mkCell("vein", r, { m = key })
			else row[c] = mkCell(key, r) end
		end
	end
	if hasEgg then p.rowsSinceEgg = 0
	else
		p.rowsSinceEgg += 1
		if p.rowsSinceEgg >= Config.eggs.pityRows and r > 2 then
			row[math.floor(rng() * COLS)] = mkCell("egg", r, { e = L.egg }); p.rowsSinceEgg = 0
		end
	end
	return row
end

local function ensureRows(st: State)
	local p = profile(st)
	while st.genTo < st.pr + WINDOW_DOWN + 2 do
		st.genTo += 1
		st.rows[st.genTo] = genRow(p, st.genTo)
	end
end

local function cellAt(st: State, r: number, c: number): Cell?
	if r < 0 or c < 0 or c >= COLS then return nil end
	local row = st.rows[r]
	return row and row[c] or nil
end
local function isOpen(st: State, r: number, c: number): boolean
	return c >= 0 and c < COLS and (r < 0 or cellAt(st, r, c) == nil)
end
local function exposed(st: State, r: number, c: number): boolean
	return cellAt(st, r, c) ~= nil and (isOpen(st, r - 1, c) or isOpen(st, r + 1, c) or isOpen(st, r, c - 1) or isOpen(st, r, c + 1))
end
local function sealLocked(p: any, cell: Cell?): boolean
	return cell ~= nil and cell.k == "seal" and p.pick < (cell.t :: number)
end

-- ------------------------------------------------------------ streaming block models
local function shownKind(st: State, r: number, cell: Cell): string
	if r <= st.pr + REVEAL_ROWS or cell.first then return cell.k end
	return "hidden"
end

local function renderCell(st: State, r: number, c: number)
	local cell = cellAt(st, r, c)
	st.models[r] = st.models[r] or {}
	st.shown[r] = st.shown[r] or {}
	local old = st.models[r][c]
	if not cell then
		if old then old:Destroy(); st.models[r][c] = nil; st.shown[r][c] = nil end
		return
	end
	local kind = shownKind(st, r, cell)
	local stage = math.floor((1 - cell.hp / cell.max) * 3) / 3
	local sig = kind .. stage
	if old and st.shown[r][c] == sig then return end
	if old then old:Destroy() end
	local extra = if kind == "hidden" then { c = c } else { c = c, m = cell.m, e = cell.e, t = cell.t }
	local m = Models.block(kind, r, extra, stage)
	m.Name = r .. "_" .. c
	m:PivotTo(CFrame.new(Grid.cellPos(st.slot, r, c)))
	local body = m.PrimaryPart :: BasePart
	body:SetAttribute("R", r)
	body:SetAttribute("C", c)
	m.Parent = ctx.World.blocksFolder(st.slot)
	st.models[r][c] = m
	st.shown[r][c] = sig
end

local function renderWindow(st: State)
	local lo, hi = st.pr - WINDOW_UP, st.pr + WINDOW_DOWN
	for r, row in st.models do
		if r < lo or r > hi then
			for _, m in row do m:Destroy() end
			st.models[r] = nil
			st.shown[r] = nil
		end
	end
	for r = math.max(0, lo), hi do
		for c = 0, COLS - 1 do renderCell(st, r, c) end
	end
end

-- ------------------------------------------------------------ rewards
local function popup(st: State, r: number, c: number, text: string, color: string, size: number?)
	ctx.remotes.Popup:FireClient(st.player, r, c, text, color, size or 1)
end

-- Returns the gold paid. quiet: skip the per-block gold popup (a smash shows one total).
local function breakCell(st: State, r: number, c: number, byPet: boolean, quiet: boolean): number
	local p = profile(st)
	local cell = cellAt(st, r, c)
	if not cell then return 0 end
	st.rows[r][c] = false
	p.stats.blocks += 1
	local L = Rules.layerOf(r)
	local coin = math.ceil(L.coin * Rules.scaleAt(r) * Rules.goldMult(p))
	if cell.k == "gold" then coin *= Config.blockKinds.gold.coinMult end
	if cell.k == "vein" then
		local a, b = Config.blockKinds.vein.amount[1], Config.blockKinds.vein.amount[2]
		local n = math.random(a, b)
		p.mats[cell.m :: string] = (p.mats[cell.m :: string] or 0) + n
		popup(st, r, c, "+" .. n .. " " .. Config.materials[cell.m :: string].name, Config.materials[cell.m :: string].color, 0.8)
	elseif cell.k == "gem" then
		local g = Config.blockKinds.gem.gems + math.floor((Rules.layerIdx(r) - 1) / 2)
		p.gems += g
		popup(st, r, c, "+" .. g .. " gem" .. (if g > 1 then "s" else ""), "#62e3ff", 1.1)
	end
	p.gold += coin
	if not quiet then popup(st, r, c, "+" .. Rules.fmt(coin), "#ffd84a", 1) end
	if cell.k == "egg" then ctx.Egg.found(st.player, cell.e, cell.first == true) end
	if st.target and st.target[1] == r and st.target[2] == c then st.target = nil end
	if p.tut == 0 and p.stats.blocks >= 3 then p.tut = 1 end
	renderCell(st, r, c)
	ctx.Data.touch(st.player)
	return coin
end

-- ------------------------------------------------------------ swinging
local function playerCell(st: State): (number?, number?)
	local char = st.player.Character
	local feet = char and Grid.feetOf(char)
	if not feet then return nil end
	return Grid.cellAtFeet(st.slot, feet)
end

local function inReach(st: State, r: number, c: number): boolean
	-- One extra block of slack covers the client being slightly ahead of the server's copy of its position.
	return math.max(math.abs(r - st.pr), math.abs(c - st.pc)) <= Config.player.reach + 1 and exposed(st, r, c)
end

local function swing(st: State)
	local p = profile(st)
	local r, c = st.target[1], st.target[2]
	local cell = cellAt(st, r, c) :: Cell
	st.cd = 1 / Rules.swingRate(p)
	st.lastSwing = os.clock()
	ctx.remotes.Swing:FireClient(st.player, r, c)
	local tool = st.player.Character and st.player.Character:FindFirstChildOfClass("Tool")
	if tool then
		local anim = Instance.new("StringValue")
		anim.Name = "toolanim"
		anim.Value = "Slash"
		anim.Parent = tool
		game:GetService("Debris"):AddItem(anim, 0.3)
	end
	if sealLocked(p, cell) then
		popup(st, r, c, "Needs " .. Config.pickaxes[(cell.t :: number) + 1].name, "#ffb3b3", 1)
		st.target = nil
		st.holding = false
		return
	end
	local dmg = Rules.hitDamage(p)
	local crit = math.random() < 0.1
	if crit then dmg *= 2 end
	popup(st, r, c, (if crit then "CRIT " else "") .. Rules.fmt(dmg), if crit then "#ffcf4a" else "#ffffff", if crit then 1.1 else 0.85)
	-- Smash: leftover damage carries into the next block in the same direction. Eggs and seals end it.
	local dr, dc = math.sign(r - st.pr), math.sign(c - st.pc)
	local left, n, gold, rr, cc = dmg, 0, 0, r, c
	local cur: Cell? = cell
	while cur do
		local hp = cur.hp
		cur.hp -= left
		if cur.hp > 0 then renderCell(st, rr, cc); break end
		left -= hp
		n += 1
		local stop = cur.k == "egg" or cur.k == "seal"
		gold += breakCell(st, rr, cc, false, true)
		rr += dr
		cc += dc
		cur = cellAt(st, rr, cc)
		if stop or n >= Config.player.smashMaxBlocks or left <= 0 or (dr == 0 and dc == 0) or (cur and cur.k == "seal") then break end
	end
	if n > 0 then
		popup(st, r, c, (if n > 1 then "SMASH x" .. n .. "  +" else "+") .. Rules.fmt(gold), "#ffd84a", if n > 1 then 1.3 else 1)
	end
end

-- ------------------------------------------------------------ dragons
local function tickPets(st: State, dt: number)
	local p = profile(st)
	local digging = os.clock() - st.lastSwing < Config.player.dragonsDigForSec
	local mult = Rules.petMult(p)
	local taken: { [string]: boolean } = {}
	local out = {}
	for i, id in p.equipped do
		local d
		for _, x in p.dragons do if x.id == id then d = x; break end end
		local tgt = st.petTargets[i]
		if not digging or not d then tgt = nil end
		if tgt and (not cellAt(st, tgt[1], tgt[2]) or math.max(math.abs(tgt[1] - st.pr), math.abs(tgt[2] - st.pc)) > 3) then tgt = nil end
		if digging and d and not tgt then
			local cand = {}
			for r = st.pr - 1, st.pr + 2 do
				for c = st.pc - 2, st.pc + 2 do
					local cell = cellAt(st, r, c)
					if cell and cell.k ~= "seal" and exposed(st, r, c) and not taken[r .. "," .. c] then table.insert(cand, { r, c }) end
				end
			end
			if #cand > 0 then tgt = cand[math.random(1, #cand)] end
		end
		st.petTargets[i] = tgt
		if tgt and d then
			taken[tgt[1] .. "," .. tgt[2]] = true
			local cell = cellAt(st, tgt[1], tgt[2]) :: Cell
			cell.hp -= Rules.dragonPower(d) * mult * dt
			if cell.hp <= 0 then breakCell(st, tgt[1], tgt[2], true, false) else renderCell(st, tgt[1], tgt[2]) end
		end
		out[i] = tgt or false
	end
	ctx.remotes.PetTargets:FireClient(st.player, out)
end

-- ------------------------------------------------------------ per-frame update
local function update(st: State, dt: number)
	local p = profile(st)
	if not p then return end
	local r, c = playerCell(st)
	if r then
		local moved = r ~= st.pr
		st.pr, st.pc = r, c
		if r > p.maxDepth then p.maxDepth = r; ctx.Data.touch(st.player) end
		if moved then ensureRows(st); renderWindow(st) end
	end
	if st.target and not cellAt(st, st.target[1], st.target[2]) then st.target = nil end
	local hold = st.holding and p.holdDig
	if not st.target and hold then
		local below = cellAt(st, st.pr + 1, st.pc)
		if below and not sealLocked(p, below) then st.target = { st.pr + 1, st.pc } end
	end
	if st.tapAt > 0 and os.clock() - st.tapAt > TAP_TTL then st.tapAt = 0 end
	st.cd -= dt
	if st.target and st.cd <= 0 and (hold or st.tapAt > 0) and inReach(st, st.target[1], st.target[2]) then
		st.tapAt = 0
		swing(st)
	end
	st.petT += dt
	if st.petT >= 0.25 then tickPets(st, st.petT); st.petT = 0 end
end

-- ------------------------------------------------------------ lifecycle and intents
local function spawnAtSurface(st: State, char: Model)
	-- Highest spot the player can stand on, nearest the middle (the Surface button and spawn share this).
	local best
	for c = 0, COLS - 1 do
		local r = 0
		while r <= st.genTo and not cellAt(st, r, c) do r += 1 end
		local score = r * 10 + math.abs(c - 3)
		if not best or score < best.score then best = { r = r - 1, c = c, score = score } end
	end
	local pos = Grid.cellPos(st.slot, best.r, best.c)
	char:PivotTo(CFrame.new(pos + Vector3.new(0, 1, 0)) * CFrame.Angles(0, math.rad(90), 0))
	local hrp = char:FindFirstChild("HumanoidRootPart") :: BasePart?
	if hrp then hrp.AssemblyLinearVelocity = Vector3.zero end
	st.pr, st.pc = best.r, best.c
	ensureRows(st)
	renderWindow(st)
end

local function giveTool(player: Player)
	local char = player.Character
	local p = ctx.Data.get(player)
	if not char or not p then return end
	for _, t in char:GetChildren() do if t:IsA("Tool") then t:Destroy() end end
	for _, t in player.Backpack:GetChildren() do t:Destroy() end
	local tool = Models.pickTool(p.pick)
	tool.Parent = player.Backpack
	local hum = char:FindFirstChildOfClass("Humanoid")
	if hum then hum:EquipTool(tool) end
end
Mine.giveTool = giveTool

function Mine.init(c: any)
	ctx = c
	local R = ctx.remotes
	R.Target.OnServerEvent:Connect(function(player, r, c2)
		local st = states[player]
		if not st or typeof(r) ~= "number" or typeof(c2) ~= "number" then return end
		r, c2 = math.floor(r), math.floor(c2)
		if not exposed(st, r, c2) then return end
		st.target = { r, c2 }
		st.tapAt = os.clock()
	end)
	R.Hold.OnServerEvent:Connect(function(player, on)
		local st = states[player]
		if st then st.holding = on == true end
	end)
	R.Surface.OnServerEvent:Connect(function(player)
		local st = states[player]
		if st and player.Character then spawnAtSurface(st, player.Character) end
	end)
	RunService.Heartbeat:Connect(function(dt)
		for _, st in states do
			local ok, err = pcall(update, st, dt)
			if not ok then warn("[Mine] " .. tostring(err)) end
		end
	end)
end

function Mine.join(player: Player)
	local st: State = {
		player = player, slot = ctx.World.slot(player), rows = {}, genTo = -1, models = {}, shown = {},
		target = nil, tapAt = 0, holding = false, cd = 0, lastSwing = -99, pr = -1, pc = 3, petT = 0, petTargets = {},
	}
	states[player] = st
	ensureRows(st)
	local function onChar(char: Model)
		local hum = char:WaitForChild("Humanoid") :: Humanoid
		hum.UseJumpPower = false
		hum.JumpHeight = Grid.CELL + 1.6 -- one block up, so you can climb a staircase you dug
		char:WaitForChild("HumanoidRootPart")
		task.wait()
		spawnAtSurface(st, char)
		giveTool(player)
	end
	player.CharacterAdded:Connect(onChar)
	if player.Character then task.spawn(onChar, player.Character) end
end

-- Studio testing: clear the player's column from where they stand down to row toRow (seals are left in place).
function Mine.debugClearColumn(player: Player, toRow: number)
	local st = states[player]
	if not st then return end
	st.pr = toRow
	ensureRows(st)
	for r = 0, toRow - 1 do
		local cell = cellAt(st, r, st.pc)
		if cell and cell.k ~= "seal" then st.rows[r][st.pc] = false end
	end
	renderWindow(st)
end

function Mine.leave(player: Player)
	states[player] = nil
end

return Mine
