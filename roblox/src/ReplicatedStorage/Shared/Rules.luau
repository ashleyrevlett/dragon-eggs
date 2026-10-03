--!strict
-- Derived stats and prices, ported from the prototype's game.js. Pure functions of a profile, shared by
-- the server (authority) and the client (display only).
local Config = require(script.Parent.Config)

local Rules = {}
type P = any

local LAYERS = Config.layers
Rules.EGG = {} :: { [string]: any }
for _, e in Config.dragonEggs do Rules.EGG[e.id] = e end

function Rules.layerIdx(r: number): number -- 1-based index into Config.layers
	local i = 1
	for k, L in LAYERS do if math.max(0, r) >= L.start then i = k end end
	return i
end
function Rules.layerOf(r: number): any return LAYERS[Rules.layerIdx(r)] end
function Rules.scaleAt(r: number): number
	local L = Rules.layerOf(r)
	return 1 + L.growth * math.max(0, r - L.start)
end
function Rules.cellHp(kind: string, r: number): number
	return math.ceil(Rules.layerOf(r).hp * Rules.scaleAt(r) * Config.blockKinds[kind].hpMult)
end

function Rules.lvlCost(u: any, l: number): number return math.ceil(u.base * u.growth ^ l) end
function Rules.rbMult(p: P): number
	local RB = Config.rebirth.ladder
	return if p.rebirths > 0 then RB[math.min(p.rebirths, #RB)].mult else 1
end
function Rules.strMult(p: P): number return Config.upgrades.strength.per ^ p.up.strength end
function Rules.goldMult(p: P): number
	return Rules.rbMult(p) * (1 + Config.gemUpgrades.goldBoost.per * p.gemUp.goldBoost) * (if p.passes.doubleGold then 2 else 1)
end
function Rules.reinforceMult(p: P): number return Config.reinforce.dmgMult ^ p.reinforce end
function Rules.hitDamage(p: P): number
	return Config.pickaxes[p.pick + 1].dmg * Rules.reinforceMult(p) * Rules.strMult(p) * Rules.rbMult(p)
end
function Rules.reinforceCost(p: P): { [string]: number }?
	local frac = Config.reinforce.costFrac[p.reinforce + 1]
	if not frac then return nil end
	local nextPick = Config.pickaxes[p.pick + 2]
	local base = (nextPick or Config.pickaxes[p.pick + 1]).cost
	local f = frac * (if nextPick then 1 else 4)
	local out = {}
	for k, v in base do out[k] = math.ceil(v * f) end
	return out
end
function Rules.swingRate(p: P): number return Config.player.baseSwingsPerSec + Config.upgrades.swing.per * p.up.swing end
function Rules.petMult(p: P): number
	return Rules.strMult(p) * Rules.rbMult(p) * (1 + Config.gemUpgrades.petPower.per * p.gemUp.petPower)
end
function Rules.dragonDef(d: any): any return Rules.EGG[d.egg].dragons[d.i + 1] end
function Rules.dragonPower(d: any): number return Rules.EGG[d.egg].power * Config.rarities[d.i + 1].power end
function Rules.dragonSell(p: P, d: any): number
	return math.ceil(Rules.EGG[d.egg].sell * Config.rarities[d.i + 1].sell * Rules.goldMult(p))
end
local function rbUnlocks(p: P, u: string): number
	local n = 0
	for i = 1, math.min(p.rebirths, #Config.rebirth.ladder) do if Config.rebirth.ladder[i].unlock == u then n += 1 end end
	return n
end
function Rules.nestCap(p: P): number
	return Config.incubators.start + p.nestBought + (if p.passes.extraIncub then 2 else 0) + rbUnlocks(p, "nest")
end
function Rules.equipCap(p: P): number return Config.equip.start + p.equipBought + rbUnlocks(p, "equipSlot") end
function Rules.eggChance(p: P): number return Config.eggs.base * (1 + Config.upgrades.eggLuck.per * p.up.eggLuck) end
function Rules.hatchSpeedMult(p: P): number return 1 + Config.upgrades.hatchSpeed.per * p.up.hatchSpeed end

function Rules.have(p: P, k: string): number
	return if k == "gold" then p.gold elseif k == "gems" then p.gems else (p.mats[k] or 0)
end
function Rules.canAfford(p: P, cost: { [string]: number }): boolean
	for k, v in cost do if Rules.have(p, k) < v then return false end end
	return true
end
function Rules.pay(p: P, cost: { [string]: number })
	for k, v in cost do
		if k == "gold" then p.gold -= v elseif k == "gems" then p.gems -= v else p.mats[k] = (p.mats[k] or 0) - v end
	end
end

local SUF = { "", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc" }
function Rules.fmt(n: number): string
	if n ~= n or n == math.huge then return "∞" end
	if n < 1000 then
		if n < 10 and n % 1 ~= 0 then return (string.format("%.1f", n):gsub("%.0$", "")) end
		return tostring(math.floor(n))
	end
	local i = 1
	while n >= 1000 and i < #SUF do n /= 1000; i += 1 end
	local s = if n < 10 then string.format("%.2f", n) elseif n < 100 then string.format("%.1f", n) else tostring(math.floor(n))
	s = s:gsub("(%.%d-)0+$", "%1"):gsub("%.$", "")
	return s .. SUF[i]
end
function Rules.mmss(s: number): string
	s = math.max(0, math.ceil(s))
	local h, m, x = math.floor(s / 3600), math.floor(s % 3600 / 60), s % 60
	return if h > 0 then string.format("%d:%02d:%02d", h, m, x) else string.format("%d:%02d", m, x)
end

return Rules
