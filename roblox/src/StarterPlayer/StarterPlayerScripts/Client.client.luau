--!strict
-- Client bootstrap. The client renders and sends intents; the server owns every number.
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local StarterGui = game:GetService("StarterGui")

local player = Players.LocalPlayer
local remotes = ReplicatedStorage:WaitForChild("Remotes")
local Controllers = script.Parent:WaitForChild("Controllers")

pcall(function() StarterGui:SetCoreGuiEnabled(Enum.CoreGuiType.Backpack, false) end)

-- Shared client state. profile is the server's latest copy; never edited here.
local app = {
	player = player,
	remotes = remotes,
	profile = nil :: any,
	timeOffset = 0, -- server time minus local tick, for nest timers
	listeners = {} :: { (any) -> () },
}
function app.slot(): number? return player:GetAttribute("Slot") :: number? end
function app.serverNow(): number return os.clock() + app.timeOffset end
function app.onProfile(fn: (any) -> ()) table.insert(app.listeners, fn) end

remotes.State.OnClientEvent:Connect(function(profile, serverNow)
	app.profile = profile
	app.timeOffset = serverNow - os.clock()
	for _, fn in app.listeners do task.spawn(fn, profile) end
end)

for _, name in { "Camera", "Input", "Fx", "Pets", "UI" } do
	require(Controllers:WaitForChild(name)).start(app)
end
