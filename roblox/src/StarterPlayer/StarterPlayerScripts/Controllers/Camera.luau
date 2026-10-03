--!strict
-- Side-on scriptable camera, narrow field of view for a near-flat look. Follows the player's depth and
-- keeps them about a third of the way down the screen (more ground below than above). Also keeps the
-- character on the Z plane: 3D avatar, 2D movement.
local RunService = game:GetService("RunService")
local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Grid = require(Shared.Grid)

local Camera = {}
local FOV = 35
local MIN_ROWS, MIN_COLS = 9, Grid.COLS + 1.5

function Camera.start(app: any)
	local cam = workspace.CurrentCamera
	cam.CameraType = Enum.CameraType.Scriptable
	cam.FieldOfView = FOV
	local y = 0
	RunService:BindToRenderStep("DragonEggsCamera", Enum.RenderPriority.Camera.Value + 1, function(dt)
		cam.CameraType = Enum.CameraType.Scriptable
		local char = app.player.Character
		local hrp = char and char:FindFirstChild("HumanoidRootPart") :: BasePart?
		local slot = app.slot()
		if not hrp or not slot then return end
		-- Plane lock: zero any drift off Z = 0.
		local p = hrp.Position
		if math.abs(p.Z - Grid.PLANE_Z) > 0.05 then
			hrp.CFrame = hrp.CFrame + Vector3.new(0, 0, Grid.PLANE_Z - p.Z)
		end
		local v = hrp.AssemblyLinearVelocity
		if math.abs(v.Z) > 0.01 then hrp.AssemblyLinearVelocity = Vector3.new(v.X, v.Y, 0) end
		-- Fit at least MIN_ROWS rows and MIN_COLS columns on screen.
		local vp = cam.ViewportSize
		local halfH = math.tan(math.rad(FOV / 2))
		local dist = math.max(MIN_ROWS * Grid.CELL / 2 / halfH, MIN_COLS * Grid.CELL / 2 / (halfH * vp.X / vp.Y))
		y = y + (p.Y - y) * math.min(1, dt * 6)
		-- Player sits about 40% down the screen; on short phones the HUD and goal pill take the top,
		-- so drop them to the middle.
		local below = if vp.Y < 450 then 0 else 0.1
		local lookY = y - MIN_ROWS * Grid.CELL * below
		local x = Grid.plotX(slot)
		cam.CFrame = CFrame.lookAt(Vector3.new(x, lookY, dist), Vector3.new(x, lookY, 0))
	end)
end

return Camera
