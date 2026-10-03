--!strict
-- Tap or click a block to dig it (the character walks over if it's out of reach). Hold to keep digging
-- once Hold to Dig is unlocked. Keyboard: E, F or Down digs the block below. Movement stays on the
-- default controls (A/D or thumbstick, jump), which the side camera turns into left/right.
local UserInputService = game:GetService("UserInputService")
local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Grid = require(Shared.Grid)

local Input = {}
local DIG_KEYS = { [Enum.KeyCode.E] = true, [Enum.KeyCode.F] = true, [Enum.KeyCode.Down] = true, [Enum.KeyCode.ButtonA] = false }

function Input.start(app: any)
	local R = app.remotes
	local holdStart: number? = nil

	local function myCell(): (number?, number?)
		local char = app.player.Character
		local feet = char and Grid.feetOf(char)
		local slot = app.slot()
		if not feet or not slot then return nil, nil end
		return Grid.cellAtFeet(slot, feet)
	end
	app.myCell = myCell

	local function walkTo(x: number)
		local char = app.player.Character
		local hum = char and char:FindFirstChildOfClass("Humanoid")
		local hrp = char and char:FindFirstChild("HumanoidRootPart") :: BasePart?
		if hum and hrp then hum:MoveTo(Vector3.new(x, hrp.Position.Y, Grid.PLANE_Z)) end
	end

	local function pressAt(pos: Vector2)
		local cam = workspace.CurrentCamera
		local ray = cam:ViewportPointToRay(pos.X, pos.Y)
		local params = RaycastParams.new()
		params.FilterType = Enum.RaycastFilterType.Include
		local slot = app.slot()
		if not slot then return end
		local plot = workspace:FindFirstChild("Plots") and workspace.Plots:FindFirstChild("Plot" .. slot)
		if not plot then return end
		params.FilterDescendantsInstances = { plot.Blocks }
		local hit = workspace:Raycast(ray.Origin, ray.Direction * 1000, params)
		local body = hit and hit.Instance.Parent and (hit.Instance.Parent :: Model).PrimaryPart
		if body and body:GetAttribute("R") ~= nil then
			local r, c = body:GetAttribute("R") :: number, body:GetAttribute("C") :: number
			R.Target:FireServer(r, c)
			local pr, pc = myCell()
			if pr and pc and math.abs(c - pc) > 1 then walkTo(body.Position.X - math.sign(c - pc) * Grid.CELL) end
		else
			-- Open space: walk there along the plane.
			local t = (Grid.PLANE_Z - ray.Origin.Z) / ray.Direction.Z
			if t > 0 then walkTo((ray.Origin + ray.Direction * t).X) end
		end
	end

	local function digBelow()
		local r, c = myCell()
		if r and c then R.Target:FireServer(r + 1, c) end
	end

	local function startHold()
		holdStart = os.clock()
		R.Hold:FireServer(true)
	end
	local function endHold()
		holdStart = nil
		R.Hold:FireServer(false)
	end

	UserInputService.InputBegan:Connect(function(input, processed)
		if processed then return end
		local t = input.UserInputType
		if t == Enum.UserInputType.MouseButton1 or t == Enum.UserInputType.Touch then
			pressAt(Vector2.new(input.Position.X, input.Position.Y))
			startHold()
		elseif input.KeyCode and DIG_KEYS[input.KeyCode] then
			digBelow()
			startHold()
		end
	end)
	UserInputService.InputEnded:Connect(function(input)
		local t = input.UserInputType
		if t == Enum.UserInputType.MouseButton1 or t == Enum.UserInputType.Touch or (input.KeyCode and DIG_KEYS[input.KeyCode]) then
			endHold()
		end
	end)

	-- Before Hold to Dig, holding does nothing extra: nudge kids to tap instead.
	local lastNudge = 0
	game:GetService("RunService").Heartbeat:Connect(function()
		local p = app.profile
		if holdStart and p and not p.holdDig and os.clock() - holdStart > 0.9 and os.clock() - lastNudge > 4 then
			lastNudge = os.clock()
			local r, c = myCell()
			if r and app.popup then app.popup(r - 1, c, "Tap, tap, tap!", "#ffd84a", 0.9) end
		end
	end)
end

return Input
