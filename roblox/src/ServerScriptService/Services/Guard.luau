--!strict
-- Per-player, per-remote rate limits. Requests over the limit are dropped silently.
local Guard = {}
local buckets: { [Player]: { [string]: { tokens: number, at: number } } } = {}

function Guard.init(_ctx: any)
	game:GetService("Players").PlayerRemoving:Connect(function(p) buckets[p] = nil end)
end

function Guard.allow(player: Player, name: string, perSec: number): boolean
	local mine = buckets[player] or {}
	buckets[player] = mine
	local b = mine[name] or { tokens = perSec, at = os.clock() }
	mine[name] = b
	local now = os.clock()
	b.tokens = math.min(perSec, b.tokens + (now - b.at) * perSec)
	b.at = now
	if b.tokens < 1 then return false end
	b.tokens -= 1
	return true
end

return Guard
