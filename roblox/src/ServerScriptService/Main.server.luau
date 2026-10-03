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

local ctx = { remotes = remotes, Data = Data, World = World, Mine = Mine, Egg = Egg, Shop = Shop }
for _, s in { Data, World, Mine, Egg, Shop } do s.init(ctx) end

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
