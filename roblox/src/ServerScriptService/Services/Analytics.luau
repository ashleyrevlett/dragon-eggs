--!strict
-- Onboarding funnel (DESIGN.md section 8): spawn, first dig, first egg, first hatch, first upgrade, Stone Pick.
-- Steps are logged in order, once per profile, whenever the profile changes.
local AnalyticsService = game:GetService("AnalyticsService")

local Analytics = {}
local STEPS: { { name: string, done: (any) -> boolean } } = {
	{ name = "Spawn", done = function() return true end },
	{ name = "FirstDig", done = function(p) return p.stats.blocks > 0 end },
	{ name = "FirstEgg", done = function(p) return p.stats.eggs > 0 end },
	{ name = "FirstHatch", done = function(p) return p.stats.hatched > 0 end },
	{ name = "FirstUpgrade", done = function(p) return p.up.strength > 0 or p.up.swing > 0 or p.holdDig end },
	{ name = "StonePick", done = function(p) return p.pick >= 1 end },
}

function Analytics.init(_ctx: any) end

function Analytics.check(player: Player, p: any)
	while p.funnel < #STEPS and STEPS[p.funnel + 1].done(p) do
		p.funnel += 1
		local step = STEPS[p.funnel]
		pcall(AnalyticsService.LogOnboardingFunnelStepEvent, AnalyticsService, player, p.funnel, step.name)
	end
end

return Analytics
