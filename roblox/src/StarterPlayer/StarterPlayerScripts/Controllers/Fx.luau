--!strict
-- Feedback: floating numbers over cells, hit chips and sounds. Presentation only.
local TweenService = game:GetService("TweenService")
local SoundService = game:GetService("SoundService")
local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Grid = require(Shared.Grid)

local Fx = {}

local function sound(id: string, vol: number, speed: number?)
	local s = Instance.new("Sound")
	s.SoundId = id
	s.Volume = vol
	s.PlaybackSpeed = speed or 1
	s.Parent = SoundService
	s:Play()
	s.Ended:Once(function() s:Destroy() end)
end
Fx.sound = sound

function Fx.start(app: any)
	local R = app.remotes
	local folder = Instance.new("Folder")
	folder.Name = "Fx"
	folder.Parent = workspace

	local function cellFront(r: number, c: number): Vector3?
		local slot = app.slot()
		if not slot then return nil end
		return Grid.cellPos(slot, r, c) + Vector3.new(0, 0, Grid.CELL / 2 + 0.5)
	end

	function app.popup(r: number, c: number, text: string, color: string, size: number)
		local pos = cellFront(r, c)
		if not pos then return end
		local anchor = Instance.new("Part")
		anchor.Anchored, anchor.CanCollide, anchor.CanQuery, anchor.Transparency = true, false, false, 1
		anchor.Size = Vector3.one * 0.1
		anchor.Position = pos + Vector3.new((math.random() - 0.5) * 2, 0, 0)
		anchor.Parent = folder
		local gui = Instance.new("BillboardGui")
		gui.Size = UDim2.fromOffset(240, 48)
		gui.AlwaysOnTop = true
		gui.LightInfluence = 0
		gui.Parent = anchor
		local label = Instance.new("TextLabel")
		label.BackgroundTransparency = 1
		label.Size = UDim2.fromScale(1, 1)
		label.Font = Enum.Font.FredokaOne
		label.Text = text
		label.TextColor3 = Color3.fromHex(color)
		label.TextSize = math.floor(26 * size)
		label.TextStrokeTransparency = 0.2
		label.Parent = gui
		TweenService:Create(anchor, TweenInfo.new(0.9, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), { Position = anchor.Position + Vector3.new(0, Grid.CELL * 0.6, 0) }):Play()
		TweenService:Create(label, TweenInfo.new(0.9, Enum.EasingStyle.Quad, Enum.EasingDirection.In), { TextTransparency = 1, TextStrokeTransparency = 1 }):Play()
		game:GetService("Debris"):AddItem(anchor, 1)
	end

	R.Popup.OnClientEvent:Connect(function(r, c, text, color, size)
		app.popup(r, c, text, color, size)
		if string.find(text, "^%+") and color == "#ffd84a" then sound("rbxasset://sounds/electronicpingshort.wav", 0.25, 1.6) end
		if string.find(text, "SMASH") then sound("rbxasset://sounds/collide.wav", 0.8, 0.7) end
	end)

	R.Swing.OnClientEvent:Connect(function(r, c)
		sound("rbxasset://sounds/swordslash.wav", 0.35, 0.8 + math.random() * 0.2)
		local pos = cellFront(r, c)
		if not pos then return end
		for _ = 1, 4 do
			local chip = Instance.new("Part")
			chip.Size = Vector3.one * 0.5
			chip.CanCollide, chip.CanQuery = false, false
			chip.Color = Color3.fromRGB(150, 110, 70)
			chip.Position = pos + Vector3.new((math.random() - 0.5) * 2, (math.random() - 0.5) * 2, 0)
			chip.AssemblyLinearVelocity = Vector3.new((math.random() - 0.5) * 30, 15 + math.random() * 15, 4)
			chip.Parent = folder
			game:GetService("Debris"):AddItem(chip, 0.6)
		end
	end)
end

return Fx
