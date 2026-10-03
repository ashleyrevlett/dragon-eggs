--!strict
-- Every purchase, priced from shared config on the server. The client only names what it wants.
local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Config = require(Shared.Config)
local Rules = require(Shared.Rules)

local Shop = {}
local ctx: any
local M1_UPGRADES = { strength = true, swing = true } -- Egg Sense and Warm Nests arrive in M2

local function banner(player: Player, title: string, sub: string, color: string)
	ctx.remotes.Banner:FireClient(player, title, sub, color)
end

local actions: { [string]: (Player, any, string?) -> () } = {
	up = function(player, p, k)
		local u = k and M1_UPGRADES[k] and Config.upgrades[k]
		if not u or p.up[k] >= u.max then return end
		local cost = Rules.lvlCost(u, p.up[k])
		if p.gold < cost then return end
		p.gold -= cost
		p.up[k] += 1
		if k == "strength" and p.tut == 4 then p.tut = 5 end
	end,
	hold = function(player, p)
		if p.holdDig or not Rules.canAfford(p, Config.holdDig.cost) then return end
		Rules.pay(p, Config.holdDig.cost)
		p.holdDig = true
		banner(player, "Hold to Dig!", "Hold on the ground to keep digging", "#ffd84a")
	end,
	craft = function(player, p)
		local nextPick = Config.pickaxes[p.pick + 2]
		if not nextPick or p.pick >= 2 or not Rules.canAfford(p, nextPick.cost) then return end -- M1: pickaxes 1-3
		Rules.pay(p, nextPick.cost)
		p.pick += 1
		p.reinforce = 0
		if p.tut == 5 then p.tut = 6 end
		banner(player, nextPick.name .. "!", "x" .. Rules.fmt(nextPick.dmg / Config.pickaxes[p.pick].dmg) .. " dig damage", nextPick.color)
		ctx.Mine.giveTool(player)
	end,
	reinforce = function(player, p)
		local cost = Rules.reinforceCost(p)
		if not cost or not Rules.canAfford(p, cost) then return end
		Rules.pay(p, cost)
		p.reinforce += 1
		banner(player, "Reinforced!", Config.pickaxes[p.pick + 1].name .. " x" .. Rules.fmt(Rules.reinforceMult(p)) .. " damage", Config.pickaxes[p.pick + 1].color)
	end,
	nest = function(player, p)
		local cost = Config.incubators.buy[p.nestBought + 1]
		if not cost or p.nestBought >= 2 or not Rules.canAfford(p, cost) then return end -- M1: nests 1-3
		Rules.pay(p, cost)
		p.nestBought += 1
		ctx.Egg.syncNests(p)
		ctx.Egg.refill(player, p)
	end,
}

function Shop.init(c: any)
	ctx = c
	ctx.remotes.Shop.OnServerEvent:Connect(function(player, action, arg)
		local p = ctx.Data.get(player)
		local fn = typeof(action) == "string" and actions[action]
		if not p or not fn or not ctx.Guard.allow(player, "Shop", 8) then return end
		fn(player, p, if typeof(arg) == "string" then arg else nil)
		ctx.Data.touch(player)
	end)
end

return Shop
