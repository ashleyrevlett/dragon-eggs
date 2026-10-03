--!strict
-- Static world: one plot (shaft) per player slot, glass walls between plots, layer-coloured back walls,
-- and a little surface scene. Blocks themselves are streamed by Mine.
local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Config = require(Shared.Config)
local Grid = require(Shared.Grid)

local World = {}
local CELL, COLS = Grid.CELL, Grid.COLS
local MAX_SLOTS = 12
local slots: { [number]: Player } = {}
local slotOf: { [Player]: number } = {}
local root: Folder

local function part(parent: Instance, props: { [string]: any }): Part
	local p = Instance.new("Part")
	p.Anchored = true
	p.TopSurface = Enum.SurfaceType.Smooth
	p.BottomSurface = Enum.SurfaceType.Smooth
	for k, v in props do (p :: any)[k] = v end
	p.Parent = parent
	return p
end

local function buildPlot(slot: number)
	local f = Instance.new("Folder")
	f.Name = "Plot" .. slot
	local x0 = Grid.plotX(slot)
	local w = COLS * CELL
	local depth = Grid.MAX_ROWS * CELL
	-- Glass walls on both sides, rising a few blocks above ground so players stay in their own plot.
	for _, side in { -1, 1 } do
		part(f, { Name = "Wall", Size = Vector3.new(CELL, depth + CELL * 4, CELL * 2),
			Position = Vector3.new(x0 + side * (w + CELL) / 2, (CELL * 4 - depth) / 2, -CELL / 2),
			Material = Enum.Material.Glass, Transparency = 0.6, Color = Color3.fromHex("#bfe3ff"), CastShadow = false })
	end
	-- Back wall per layer, tinted with the layer's dug-out colour.
	for i, L in Config.layers do
		local nextStart = if Config.layers[i + 1] then Config.layers[i + 1].start else Grid.MAX_ROWS
		local h = (nextStart - L.start) * CELL
		part(f, { Name = "Back_" .. L.id, Size = Vector3.new(w, h, CELL),
			Position = Vector3.new(x0, -L.start * CELL - h / 2, -CELL), Color = Color3.fromHex(L.colors.bg), Material = Enum.Material.Ground })
	end
	-- Surface: grass lip behind the shaft and a hill backdrop.
	part(f, { Name = "Grass", Size = Vector3.new(w, 1, CELL * 3), Position = Vector3.new(x0, -0.5, -CELL * 2.5),
		Color = Color3.fromHex("#6cc24a"), Material = Enum.Material.Grass })
	part(f, { Name = "Hill", Shape = Enum.PartType.Cylinder, Size = Vector3.new(CELL, w * 1.6, w * 1.6),
		CFrame = CFrame.new(x0, -w * 0.55, -CELL * 6) * CFrame.Angles(0, math.rad(90), 0), Color = Color3.fromHex("#7ed957"), Material = Enum.Material.Grass })
	local blocks = Instance.new("Folder")
	blocks.Name = "Blocks"
	blocks.Parent = f
	f.Parent = root
end

function World.init(_ctx: any)
	-- The template baseplate and spawn would cover the shafts.
	for _, name in { "Baseplate", "SpawnLocation" } do
		local inst = workspace:FindFirstChild(name)
		if inst then inst:Destroy() end
	end
	root = Instance.new("Folder")
	root.Name = "Plots"
	root.Parent = workspace
	for slot = 0, MAX_SLOTS - 1 do buildPlot(slot) end
	local lighting = game:GetService("Lighting")
	lighting.Ambient = Color3.fromRGB(70, 60, 90)
	lighting.OutdoorAmbient = Color3.fromRGB(140, 130, 160)
end

function World.assign(player: Player): number
	for slot = 0, MAX_SLOTS - 1 do
		if not slots[slot] then
			slots[slot] = player
			slotOf[player] = slot
			player:SetAttribute("Slot", slot)
			return slot
		end
	end
	error("server full")
end
function World.slot(player: Player): number? return slotOf[player] end
function World.blocksFolder(slot: number): Folder return (root :: any)["Plot" .. slot].Blocks end
function World.release(player: Player)
	local slot = slotOf[player]
	if slot then
		World.blocksFolder(slot):ClearAllChildren()
		slots[slot] = nil
		slotOf[player] = nil
	end
end

return World
