--!strict
-- Eggs, nests and dragons: finding eggs, nest timers (absolute server time, so they survive rejoin once
-- saving lands), hatching with rarity rolls, sell or keep, equip.
local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Config = require(Shared.Config)
local Rules = require(Shared.Rules)

local Egg = {}
local ctx: any
local FIRST_EGG_SEC = 8 -- the scripted first egg hatches fast so the first dragon arrives in the first minute

local function now(): number return workspace:GetServerTimeNow() end

local function placeEgg(player: Player, p: any, i: number, eggId: string)
	local sec = if p.stats.hatched == 0 and p.stats.eggs <= 1 then FIRST_EGG_SEC else Rules.EGG[eggId].hatchSec
	p.nests[i] = { egg = eggId, start = now(), dur = sec / Rules.hatchSpeedMult(p) / Config.timeScale }
end

local function refill(player: Player, p: any)
	for i = 1, #p.nests do
		if not p.nests[i] and #p.basket > 0 then placeEgg(player, p, i, table.remove(p.basket, 1)) end
	end
end
Egg.refill = refill

function Egg.syncNests(p: any)
	while #p.nests < Rules.nestCap(p) do table.insert(p.nests, false) end
end

function Egg.found(player: Player, eggId: string, first: boolean)
	local p = ctx.Data.get(player)
	p.stats.eggs += 1
	local name = Rules.EGG[eggId].name
	ctx.remotes.Toast:FireClient(player, if first then "You found an egg!" else name .. "!", "egg")
	local free = table.find(p.nests, false)
	if free then placeEgg(player, p, free, eggId)
	elseif #p.basket < Config.eggs.basketCap then
		table.insert(p.basket, eggId)
		ctx.remotes.Toast:FireClient(player, name .. " is waiting for a free nest", "")
	else
		local g = math.ceil(Rules.EGG[eggId].sell * 0.3 * Rules.goldMult(p))
		p.gold += g
		ctx.remotes.Toast:FireClient(player, "Egg basket full. Sold the egg for " .. Rules.fmt(g) .. " gold", "bad")
	end
	if p.tut <= 1 then p.tut = 2 end
	ctx.Data.touch(player)
end

local function rollRarity(p: any): number
	local luck = (1 + Config.gemUpgrades.hatchLuck.per * p.gemUp.hatchLuck) * (if p.passes.luckyHatch then 1.5 else 1)
	local w, tot = {}, 0
	for i, r in Config.rarities do w[i] = if i == 1 then r.weight else r.weight * luck; tot += w[i] end
	local x = math.random() * tot
	for i = 1, #w do x -= w[i]; if x <= 0 then return i - 1 end end
	return 0
end

local function hatch(player: Player, i: number)
	local p = ctx.Data.get(player)
	local n = p and p.nests[i]
	if not n or now() < n.start + n.dur then return end
	if #p.dragons >= Config.equip.storageCap then
		ctx.remotes.Toast:FireClient(player, "Dragon storage is full. Sell a dragon to hatch more.", "bad")
		return
	end
	local first = p.stats.hatched == 0
	local ri = if first then 1 else rollRarity(p) -- the first hatch is always Uncommon
	local d = { id = p.nextId, egg = n.egg, i = ri }
	p.nextId += 1
	p.nests[i] = false
	p.stats.hatched += 1
	local key = n.egg .. ri
	local isNew = not p.dex[key]
	p.dex[key] = 1
	table.insert(p.dragons, d)
	if #p.equipped < Rules.equipCap(p) then table.insert(p.equipped, d.id) end
	refill(player, p)
	if p.tut <= 3 then p.tut = 4 end
	ctx.remotes.Reveal:FireClient(player, d, isNew, first)
	ctx.Data.touch(player)
end

local function sell(player: Player, id: number)
	local p = ctx.Data.get(player)
	for k, d in p.dragons do
		if d.id == id then
			local g = Rules.dragonSell(p, d)
			table.remove(p.dragons, k)
			local e = table.find(p.equipped, id)
			if e then table.remove(p.equipped, e) end
			p.gold += g
			p.stats.sold += 1
			ctx.remotes.Toast:FireClient(player, "Sold " .. Rules.dragonDef(d).name .. " for " .. Rules.fmt(g) .. " gold", "gold")
			ctx.Data.touch(player)
			return
		end
	end
end

local function toggleEquip(player: Player, id: number)
	local p = ctx.Data.get(player)
	local d
	for _, x in p.dragons do if x.id == id then d = x end end
	if not d then return end
	local e = table.find(p.equipped, id)
	if e then table.remove(p.equipped, e)
	elseif #p.equipped < Rules.equipCap(p) then table.insert(p.equipped, id)
	else
		-- Swap out the weakest equipped dragon.
		local weakest, wp = 1, math.huge
		for k, eid in p.equipped do
			for _, x in p.dragons do
				if x.id == eid and Rules.dragonPower(x) < wp then weakest, wp = k, Rules.dragonPower(x) end
			end
		end
		p.equipped[weakest] = id
	end
	ctx.Data.touch(player)
end

function Egg.init(c: any)
	ctx = c
	local R = ctx.remotes
	local function guarded(name: string, perSec: number, fn: (Player, number) -> ())
		R[name].OnServerEvent:Connect(function(player, n)
			if typeof(n) == "number" and ctx.Guard.allow(player, name, perSec) then fn(player, math.floor(n)) end
		end)
	end
	guarded("Hatch", 6, hatch)
	guarded("Sell", 8, sell)
	guarded("Equip", 8, toggleEquip)
end

return Egg
