--!strict
-- Server bootstrap: creates remotes, starts services, wires player lifecycle.
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local remotes = Instance.new("Folder")
remotes.Name = "Remotes"
for _, name in { "Target", "Hold", "Surface", "Shop", "Hatch", "Sell", "Equip", -- client -> server intents
	"State", "Popup", "Reveal", "Toast", "Banner", "PetTargets", "Swing" } do -- server -> client
	local ev = Instance.new("RemoteEvent")
	ev.Name = name
	ev.Parent = remotes
end
remotes.Parent = ReplicatedStorage

local Services = script.Parent:WaitForChild("Services")
local Data = require(Services.Data)
local World = require(Services.World)
local Mine = require(Services.Mine)
local Egg = require(Services.Egg)
local Shop = require(Services.Shop)
local Analytics = require(Services.Analytics)
local Guard = require(Services.Guard)

local ctx = { remotes = remotes, Data = Data, World = World, Mine = Mine, Egg = Egg, Shop = Shop, Analytics = Analytics, Guard = Guard }
for _, s in { Guard, Analytics, Data, World, Mine, Egg, Shop } do s.init(ctx) end

-- Studio-only test hook (the prototype's cheats): ServerStorage.Debug:Invoke(action, ...).
if game:GetService("RunService"):IsStudio() then
	local hook = Instance.new("BindableFunction")
	hook.Name = "Debug"
	hook.OnInvoke = function(action: string, arg: any)
		local player = Players:GetPlayers()[1]
		local p = player and Data.get(player)
		if not p then return "no player" end
		if action == "grant" then
			for k, v in arg do
				if k == "gold" then p.gold += v elseif k == "gems" then p.gems += v else p.mats[k] = (p.mats[k] or 0) + v end
			end
		elseif action == "set" then
			for k, v in arg do p[k] = v end
		elseif action == "dig" then
			Mine.debugClearColumn(player, arg) -- open the player's column down to row arg
		elseif action == "profile" then
			return game:GetService("HttpService"):JSONEncode(p)
		end
		Data.touch(player)
		return "ok"
	end
	hook.Parent = game:GetService("ServerStorage")
end

local function onJoin(player: Player)
	Data.load(player)
	World.assign(player)
	Mine.join(player)
end
Players.PlayerAdded:Connect(onJoin)
for _, p in Players:GetPlayers() do task.spawn(onJoin, p) end
Players.PlayerRemoving:Connect(function(player)
	Mine.leave(player)
	World.release(player)
	Data.release(player)
end)
