--!strict
-- Shaft geometry. Each player owns a 7-wide shaft ("plot"); plots sit side by side along X with a glass
-- wall between them. Everything moves on the Z = 0 plane. Row r, column c (both 0-based, like the prototype).
local Config = require(script.Parent.Config)

local Grid = {}

Grid.CELL = 7 -- studs per block; tall enough for any avatar to stand in a one-block tunnel
Grid.COLS = Config.grid.cols
Grid.PITCH = (Grid.COLS + 1) * Grid.CELL -- plot width plus one wall
Grid.PLANE_Z = 0
Grid.MAX_ROWS = 600 -- how deep the side walls go

function Grid.plotX(slot: number): number
	return slot * Grid.PITCH
end

function Grid.cellPos(slot: number, r: number, c: number): Vector3
	return Vector3.new(Grid.plotX(slot) + (c - (Grid.COLS - 1) / 2) * Grid.CELL, -(r + 0.5) * Grid.CELL, Grid.PLANE_Z)
end

-- The cell a character stands in, from its feet position. Standing on top of row r + 1 means cell r.
function Grid.cellAtFeet(slot: number, feet: Vector3): (number, number)
	local c = math.floor((feet.X - Grid.plotX(slot)) / Grid.CELL + Grid.COLS / 2)
	local r = math.floor((-feet.Y + Grid.CELL * 0.5) / Grid.CELL) - 1
	return r, c
end

function Grid.feetOf(character: Model): Vector3?
	local hrp = character:FindFirstChild("HumanoidRootPart") :: BasePart?
	local hum = character:FindFirstChildOfClass("Humanoid")
	if not hrp or not hum then return nil end
	return hrp.Position - Vector3.new(0, hum.HipHeight + hrp.Size.Y / 2, 0)
end

return Grid
