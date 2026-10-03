--!strict
-- Player profiles. M1 keeps them in memory; ProfileStore saving lands once the place is published.
-- Any change marks the profile dirty, and dirty profiles are pushed to their owner at most 10 times a second.
local RunService = game:GetService("RunService")
local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Profile = require(Shared.Profile)

local Data = {}
local profiles: { [Player]: any } = {}
local dirty: { [Player]: boolean } = {}
local ctx: any

function Data.init(c: any)
	ctx = c
	local acc = 0
	RunService.Heartbeat:Connect(function(dt)
		acc += dt
		if acc < 0.1 then return end
		acc = 0
		for player in dirty do
			local p = profiles[player]
			if p then
				ctx.Analytics.check(player, p)
				ctx.remotes.State:FireClient(player, p, workspace:GetServerTimeNow())
			end
		end
		table.clear(dirty)
	end)
end

function Data.load(player: Player): any
	local p = Profile.new()
	profiles[player] = p
	dirty[player] = true
	return p
end
function Data.get(player: Player): any return profiles[player] end
function Data.touch(player: Player) dirty[player] = true end
function Data.release(player: Player)
	profiles[player] = nil
	dirty[player] = nil
end

return Data
