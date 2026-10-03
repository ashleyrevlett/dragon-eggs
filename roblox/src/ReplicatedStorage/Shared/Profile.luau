--!strict
-- The saved player profile. Mirrors the prototype's S object (plain data only, JSON-safe).
-- Arrays are 1-based; pick and rarity indexes stay 0-based like the prototype (see Config.luau header).
local Config = require(script.Parent.Config)

local Profile = {}

function Profile.new(): any
	local nests = {}
	for _ = 1, Config.incubators.start do table.insert(nests, false) end
	return {
		v = 1,
		seed = math.random(1, 2 ^ 31 - 1),
		gold = 0, gems = 0, mats = {}, pick = 0, reinforce = 0, holdDig = false,
		up = { strength = 0, swing = 0, eggLuck = 0, hatchSpeed = 0 },
		gemUp = { goldBoost = 0, petPower = 0, hatchLuck = 0, autoHatch = 0 },
		nests = nests, nestBought = 0, basket = {},
		dragons = {}, equipped = {}, equipBought = 0, dex = {},
		rebirths = 0, maxDepth = 0, bestDepth = 0,
		firstEggPlaced = false, rowsSinceEgg = 0,
		tut = 0, passes = {}, funnel = 0,
		stats = { blocks = 0, eggs = 0, hatched = 0, sold = 0 }, nextId = 1,
	}
end

return Profile
