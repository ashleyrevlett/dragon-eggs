--!strict
-- Equipped dragons float around the player, and fly to the blocks the server says they're chewing.
-- Damage is server-side; this is only their animation.
local RunService = game:GetService("RunService")
local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Grid = require(Shared.Grid)
local Rules = require(Shared.Rules)
local Models = require(Shared.Models)

local Pets = {}
local HOME = { Vector3.new(-4, 3, 2), Vector3.new(4, 3, 2), Vector3.new(-6, 0.5, 2), Vector3.new(6, 0.5, 2), Vector3.new(0, 6, 2), Vector3.new(-3, 6.5, 2) }

function Pets.start(app: any)
	local folder = Instance.new("Folder")
	folder.Name = "Pets"
	folder.Parent = workspace
	local pets: { [number]: { id: number, model: Model, pos: Vector3, t: number } } = {}
	local targets: { any } = {}

	app.onProfile(function(p)
		local want = {}
		for i, id in p.equipped do want[i] = id end
		for i = #pets, 1, -1 do
			if pets[i].id ~= want[i] then pets[i].model:Destroy(); table.remove(pets, i) end
		end
		for i, id in want do
			if not pets[i] or pets[i].id ~= id then
				local d
				for _, x in p.dragons do if x.id == id then d = x end end
				if d then
					local m = Models.dragon(Rules.dragonDef(d), 2.6)
					for _, part in m:GetDescendants() do if part:IsA("BasePart") then part.CanQuery = false end end
					m.Parent = folder
					local char = app.player.Character
					local hrp = char and char:FindFirstChild("HumanoidRootPart") :: BasePart?
					pets[i] = { id = id, model = m, pos = if hrp then hrp.Position else Vector3.zero, t = math.random() * 10 }
				end
			end
		end
	end)
	app.remotes.PetTargets.OnClientEvent:Connect(function(list) targets = list end)

	RunService.RenderStepped:Connect(function(dt)
		local char = app.player.Character
		local hrp = char and char:FindFirstChild("HumanoidRootPart") :: BasePart?
		local slot = app.slot()
		if not hrp or not slot then return end
		for i, pet in pets do
			pet.t += dt
			local tgt = targets[i]
			local goal, chewing
			if tgt then
				local cell = Grid.cellPos(slot, tgt[1], tgt[2])
				local toPlayer = (hrp.Position - cell)
				toPlayer = Vector3.new(toPlayer.X, toPlayer.Y, 0)
				goal = cell + (if toPlayer.Magnitude > 0.1 then toPlayer.Unit else Vector3.yAxis) * Grid.CELL * 0.62 + Vector3.new(0, 0, 2.5)
				chewing = true
			else
				goal = hrp.Position + HOME[(i - 1) % #HOME + 1] + Vector3.new(0, math.sin(pet.t * 2) * 0.4, 0)
			end
			pet.pos = pet.pos:Lerp(goal, math.min(1, dt * 6))
			local face = if goal.X < pet.pos.X - 0.05 then -1 else 1
			local wobble = if chewing then math.sin(pet.t * 25) * 0.15 else 0
			pet.model:PivotTo(CFrame.new(pet.pos) * CFrame.Angles(wobble, math.rad(face * 60), 0))
		end
	end)
end

return Pets
