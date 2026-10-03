--!strict
-- Procedural 3D models built from Parts: blocks, eggs, dragons and the pickaxe. Placeholder art in the
-- prototype's style (soft, rounded, bright) until real meshes replace them. Front faces point at +Z (camera).
local Config = require(script.Parent.Config)
local Grid = require(script.Parent.Grid)
local Rules = require(script.Parent.Rules)

local Models = {}
local CELL = Grid.CELL
local hex = Color3.fromHex

local LAYER_MATERIAL = { Enum.Material.Ground, Enum.Material.Slate, Enum.Material.Rock, Enum.Material.Rock,
	Enum.Material.Basalt, Enum.Material.Glacier, Enum.Material.Rock }

local function part(props: { [string]: any }): Part
	local p = Instance.new("Part")
	p.Anchored = true
	p.CanCollide = false
	p.CastShadow = false
	p.TopSurface = Enum.SurfaceType.Smooth
	p.BottomSurface = Enum.SurfaceType.Smooth
	for k, v in props do (p :: any)[k] = v end
	return p
end
local function ball(parent: Instance, size: Vector3, cf: CFrame, color: Color3, material: Enum.Material?): Part
	-- A Block part with a sphere mesh stretches to the part's size, giving ellipsoids (Ball parts stay round).
	local b = part({ Size = Vector3.new(math.max(size.X, 0.05), math.max(size.Y, 0.05), math.max(size.Z, 0.05)), Color = color,
		Material = material or Enum.Material.SmoothPlastic })
	local m = Instance.new("SpecialMesh")
	m.MeshType = Enum.MeshType.Sphere
	m.Parent = b
	b.CFrame = cf
	b.Parent = parent
	return b
end

-- Egg: an ellipsoid shell with spots. Returns a Model whose pivot is the egg's centre.
function Models.egg(eggId: string, height: number): Model
	local e = Rules.EGG[eggId]
	local m = Instance.new("Model")
	m.Name = "Egg"
	local shell = ball(m, Vector3.new(height * 0.78, height, height * 0.78), CFrame.new(), hex(e.shell))
	shell.Name = "Shell"
	local rng = Random.new(#eggId * 7)
	for i = 1, 6 do
		local a = i / 6 * math.pi * 2
		local y = rng:NextNumber(-0.3, 0.3) * height
		local rr = height * 0.39 * math.sqrt(1 - (y / (height * 0.5)) ^ 2)
		ball(m, Vector3.one * height * 0.16, CFrame.new(math.cos(a) * rr, y, math.sin(a) * rr), hex(e.spots))
	end
	m.PrimaryPart = shell
	return m
end

-- Block for cell (r, c). kind: base | vein | gold | gem | egg | seal | hidden. extra: m (material), e (egg id), t (seal tier).
function Models.block(kind: string, r: number, extra: any, damage: number): Model
	local li = Rules.layerIdx(r)
	local L = Config.layers[li]
	local m = Instance.new("Model")
	local body = part({
		Name = "Body",
		Size = Vector3.new(CELL, CELL, CELL),
		CanCollide = true,
		Material = LAYER_MATERIAL[li],
		Color = (if (r + (extra.c or 0)) % 2 == 0 then hex(L.colors.a) else hex(L.colors.b)):Lerp(hex(L.colors.dark), damage * 0.6),
	})
	body.Parent = m
	m.PrimaryPart = body
	local front = CELL / 2
	local function dots(color: Color3, material: Enum.Material, n: number, size: number)
		local rng = Random.new(r * 31 + (extra.c or 0))
		for i = 1, n do
			local p = Vector3.new(rng:NextNumber(-0.3, 0.3) * CELL, rng:NextNumber(-0.3, 0.3) * CELL, front)
			ball(m, Vector3.new(size, size, size * 0.6), CFrame.new(p), color, material)
		end
	end
	if kind == "vein" then
		dots(hex(Config.materials[extra.m].color), Enum.Material.Pebble, 4, CELL * 0.22)
	elseif kind == "gold" then
		dots(hex("#ffd84a"), Enum.Material.Foil, 4, CELL * 0.2)
	elseif kind == "gem" then
		local g = part({ Size = Vector3.one * CELL * 0.32, Color = hex("#62e3ff"), Material = Enum.Material.Neon,
			CFrame = CFrame.new(0, 0, front) * CFrame.Angles(0, 0, math.rad(45)) })
		g.Parent = m
	elseif kind == "egg" then
		local egg = Models.egg(extra.e, CELL * 0.62)
		egg:PivotTo(CFrame.new(0, 0, front - CELL * 0.12))
		egg.Parent = m
		local light = Instance.new("PointLight")
		light.Color = hex("#fff6b0")
		light.Range = CELL * 2
		light.Brightness = 1.5
		light.Parent = body
	elseif kind == "seal" then
		body.Material = Enum.Material.Slate
		body.Color = hex(L.colors.dark)
		for i = -1, 1 do
			local bar = part({ Size = Vector3.new(CELL * 0.1, CELL * 0.8, 0.3), Color = hex(L.colors.accent),
				Material = Enum.Material.Neon, CFrame = CFrame.new(i * CELL * 0.28, 0, front) })
			bar.Parent = m
		end
	elseif kind == "hidden" then
		local rng = Random.new(r * 17 + (extra.c or 0))
		if rng:NextNumber() < 0.35 then
			local s = part({ Size = Vector3.one * 0.5, Color = Color3.new(1, 1, 1), Material = Enum.Material.Neon,
				CFrame = CFrame.new(rng:NextNumber(-0.3, 0.3) * CELL, rng:NextNumber(-0.3, 0.3) * CELL, front) * CFrame.Angles(0, 0, math.rad(45)), Transparency = 0.3 })
			s.Parent = m
		end
	end
	return m
end

-- Dragon: chubby body, big head, little wings and a feature on top. Pivot at the body's centre.
function Models.dragon(def: any, size: number): Model
	local m = Instance.new("Model")
	m.Name = def.name
	local body, belly, wing = hex(def.body), hex(def.belly), hex(def.wing)
	local s = size
	local torso = ball(m, Vector3.new(s, s * 0.9, s * 0.95), CFrame.new(), body)
	torso.Name = "Body"
	ball(m, Vector3.new(s * 0.7, s * 0.6, s * 0.4), CFrame.new(0, -s * 0.08, s * 0.32), belly)
	local headCf = CFrame.new(0, s * 0.62, s * 0.18)
	ball(m, Vector3.new(s * 0.85, s * 0.75, s * 0.8), headCf, body)
	ball(m, Vector3.new(s * 0.5, s * 0.32, s * 0.3), headCf * CFrame.new(0, -s * 0.12, s * 0.33), belly)
	for _, x in { -1, 1 } do
		ball(m, Vector3.new(s * 0.2, s * 0.24, s * 0.12), headCf * CFrame.new(x * s * 0.2, s * 0.06, s * 0.36), Color3.fromRGB(30, 22, 40))
		ball(m, Vector3.new(s * 0.07, s * 0.08, s * 0.05), headCf * CFrame.new(x * s * 0.17, s * 0.11, s * 0.42), Color3.new(1, 1, 1))
		local w = part({ Size = Vector3.new(s * 0.08, s * 0.55, s * 0.5), Color = wing, Material = Enum.Material.SmoothPlastic,
			CFrame = CFrame.new(x * s * 0.5, s * 0.25, -s * 0.15) * CFrame.Angles(0, 0, x * math.rad(-35)) })
		local wm = Instance.new("SpecialMesh")
		wm.MeshType = Enum.MeshType.Wedge
		wm.Parent = w
		w.Name = "Wing"
		w.Parent = m
		ball(m, Vector3.new(s * 0.22, s * 0.28, s * 0.22), CFrame.new(x * s * 0.28, -s * 0.42, s * 0.12), body)
	end
	ball(m, Vector3.new(s * 0.22, s * 0.22, s * 0.6), CFrame.new(0, -s * 0.2, -s * 0.55), body)
	local f = def.feature
	local topCf = headCf * CFrame.new(0, s * 0.42, 0)
	if f == "horns" or f == "spikes" or f == "crystal" or f == "gem" or f == "flame" then
		for _, x in { -1, 1 } do
			local h = part({ Size = Vector3.new(s * 0.12, s * 0.3, s * 0.12), Color = if f == "crystal" or f == "gem" then hex("#e8fbff") else wing,
				Material = if f == "crystal" or f == "gem" or f == "flame" then Enum.Material.Neon else Enum.Material.SmoothPlastic,
				CFrame = topCf * CFrame.new(x * s * 0.2, 0, 0) * CFrame.Angles(0, 0, x * math.rad(-15)) })
			h.Parent = m
		end
	elseif f == "crown" or f == "star" or f == "sun" then
		local c = part({ Size = Vector3.new(s * 0.4, s * 0.16, s * 0.4), Color = hex("#ffd84a"), Material = Enum.Material.Neon, CFrame = topCf })
		c.Parent = m
	else -- leaf, flower, clover, mushroom, antenna, snow, moon
		ball(m, Vector3.new(s * 0.35, s * 0.18, s * 0.3), topCf, wing)
	end
	m.PrimaryPart = torso
	return m
end

-- The pickaxe tool. Handle is the grip; the head is coloured by tier.
function Models.pickTool(tier: number): Tool
	local def = Config.pickaxes[tier + 1]
	local tool = Instance.new("Tool")
	tool.Name = def.name
	tool.CanBeDropped = false
	tool.RequiresHandle = true
	tool.GripPos = Vector3.new(0, -0.9, 0)
	local handle = part({ Name = "Handle", Anchored = false, Size = Vector3.new(0.35, 3.2, 0.35), Color = hex("#8a5a2b"), Material = Enum.Material.Wood })
	handle.Parent = tool
	local head = part({ Name = "Head", Anchored = false, Size = Vector3.new(0.4, 0.5, 2.6), Color = hex(def.color), Material = Enum.Material.Metal })
	head.CFrame = handle.CFrame * CFrame.new(0, 1.5, 0)
	head.Parent = tool
	local weld = Instance.new("WeldConstraint")
	weld.Part0 = handle
	weld.Part1 = head
	weld.Parent = handle
	return tool
end

return Models
