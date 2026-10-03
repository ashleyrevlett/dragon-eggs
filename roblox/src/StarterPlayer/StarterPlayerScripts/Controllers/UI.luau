--!strict
-- All screen UI, built in code: HUD, goal pill, menus, nests, Shop and Dragons sheets, hatch reveal,
-- toasts and banners. Follows the prototype's layout: menus left, nests right, goal pill top centre.
-- Every tap target is at least 44px.
local RunService = game:GetService("RunService")
local TweenService = game:GetService("TweenService")
local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Config = require(Shared.Config)
local Rules = require(Shared.Rules)
local Models = require(Shared.Models)

local UI = {}
local hex = Color3.fromHex
local C = {
	night = hex("#160f24"), panel = hex("#231a3d"), panel2 = hex("#2f2452"), line = hex("#4a3d80"),
	fg = hex("#fff8ec"), muted = hex("#b9add6"), gold = hex("#ffd84a"), gem = hex("#62e3ff"),
	good = hex("#3aa65a"), pink = hex("#e2558f"), blue = hex("#2f9fd0"), warn = hex("#ff5d5d"),
}
local FONT = Enum.Font.FredokaOne

local function new(class: string, props: { [string]: any }, children: { Instance }?): any
	local i = Instance.new(class)
	for k, v in props do if k ~= "Parent" then (i :: any)[k] = v end end
	if children then for _, ch in children do ch.Parent = i end end
	if props.Parent then i.Parent = props.Parent end
	return i
end
local function corner(r: number): UICorner return new("UICorner", { CornerRadius = UDim.new(0, r) }) end
local function stroke(color: Color3, t: number): UIStroke return new("UIStroke", { Color = color, Thickness = t, ApplyStrokeMode = Enum.ApplyStrokeMode.Border }) end
local function label(props: { [string]: any }): TextLabel
	local base = { BackgroundTransparency = 1, Font = FONT, TextColor3 = C.fg, TextSize = 18, RichText = true, TextWrapped = true }
	for k, v in props do base[k] = v end
	return new("TextLabel", base)
end
local function button(text: string, color: Color3, props: { [string]: any }?): TextButton
	local base = { BackgroundColor3 = color, Font = FONT, Text = text, TextColor3 = C.fg, TextSize = 18, AutoButtonColor = true, RichText = true }
	for k, v in props or {} do base[k] = v end
	return new("TextButton", base, { corner(12), stroke(Color3.new(0, 0, 0), 2) })
end
local function viewport(model: Model, size: number, dist: number): ViewportFrame
	local vf = new("ViewportFrame", { BackgroundTransparency = 1, Size = UDim2.fromOffset(size, size), Ambient = Color3.fromRGB(200, 200, 210), LightColor = Color3.new(1, 1, 1) })
	local cam = new("Camera", { FieldOfView = 30, Parent = vf })
	vf.CurrentCamera = cam
	model:PivotTo(CFrame.new())
	model.Parent = vf
	cam.CFrame = CFrame.lookAt(Vector3.new(dist * 0.35, dist * 0.2, dist), Vector3.zero)
	return vf
end
local function chips(p: any, cost: { [string]: number }): string
	local out = {}
	for k, v in cost do
		local have = Rules.have(p, k)
		local name = if k == "gold" then "Gold" elseif k == "gems" then "Gems" else Config.materials[k].name
		local col = if have >= v then "#7ed957" else "#b9add6"
		table.insert(out, string.format('<font color="%s">%s %s/%s</font>', col, name, Rules.fmt(math.min(have, v)), Rules.fmt(v)))
	end
	table.sort(out)
	return table.concat(out, "   ")
end

function UI.start(app: any)
	local R = app.remotes
	local gui = new("ScreenGui", { Name = "DragonEggsUI", ResetOnSpawn = false, IgnoreGuiInset = false, ZIndexBehavior = Enum.ZIndexBehavior.Sibling,
		Parent = app.player:WaitForChild("PlayerGui") })

	-- HUD -----------------------------------------------------------------------------------------
	local hud = new("Frame", { BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0, 52), Parent = gui })
	local function pill(x: number, color: Color3): TextLabel
		local f = new("Frame", { BackgroundColor3 = C.panel, Position = UDim2.fromOffset(x, 8), Size = UDim2.fromOffset(120, 38), Parent = hud }, { corner(19), stroke(C.line, 2) })
		new("Frame", { BackgroundColor3 = color, Position = UDim2.fromOffset(8, 9), Size = UDim2.fromOffset(20, 20), Parent = f }, { corner(10) })
		return label({ Position = UDim2.fromOffset(34, 0), Size = UDim2.new(1, -40, 1, 0), TextXAlignment = Enum.TextXAlignment.Left, TextSize = 20, Parent = f })
	end
	local goldL = pill(10, C.gold)
	local gemL = pill(138, C.gem)
	local depthL = label({ AnchorPoint = Vector2.new(0.5, 0), Position = UDim2.new(0.5, 0, 0, 6), Size = UDim2.fromOffset(360, 40), TextSize = 22, Parent = hud })

	-- Goal pill -----------------------------------------------------------------------------------
	local goal = new("Frame", { AnchorPoint = Vector2.new(0.5, 0), Position = UDim2.new(0.5, 0, 0, 54), Size = UDim2.fromOffset(460, 0), AutomaticSize = Enum.AutomaticSize.Y,
		BackgroundColor3 = C.panel, BackgroundTransparency = 0.05, Parent = gui }, { corner(16), stroke(C.line, 2), new("UIPadding", { PaddingTop = UDim.new(0, 6), PaddingBottom = UDim.new(0, 6), PaddingLeft = UDim.new(0, 12), PaddingRight = UDim.new(0, 12) }) })
	local goalL = label({ Size = UDim2.new(1, 0, 0, 0), AutomaticSize = Enum.AutomaticSize.Y, TextSize = 18, Parent = goal })

	-- Menu column (left) ----------------------------------------------------------------------------
	local menu = new("Frame", { BackgroundTransparency = 1, Position = UDim2.fromOffset(10, 60), Size = UDim2.fromOffset(84, 300), Parent = gui },
		{ new("UIListLayout", { Padding = UDim.new(0, 10), SortOrder = Enum.SortOrder.LayoutOrder }) })
	local dragonsB = button("Dragons", C.pink, { Name = "DragonsButton", LayoutOrder = 1, Size = UDim2.fromOffset(84, 64), Parent = menu })
	local shopB = button("Shop", C.good, { Name = "ShopButton", LayoutOrder = 2, Size = UDim2.fromOffset(84, 64), Parent = menu })
	local surfaceB = button("▲\nSurface", C.blue, { Name = "SurfaceButton", LayoutOrder = 3, Size = UDim2.fromOffset(84, 64), Visible = false, Parent = menu })
	local shopDot = new("Frame", { BackgroundColor3 = C.warn, Size = UDim2.fromOffset(18, 18), Position = UDim2.new(1, -10, 0, -8), Visible = false, Parent = shopB }, { corner(9) })

	-- Nests (right) ---------------------------------------------------------------------------------
	local nests = new("Frame", { AnchorPoint = Vector2.new(1, 0), BackgroundTransparency = 1, Position = UDim2.new(1, -10, 0, 60), Size = UDim2.fromOffset(96, 420), Parent = gui },
		{ new("UIListLayout", { Padding = UDim.new(0, 8), HorizontalAlignment = Enum.HorizontalAlignment.Center, SortOrder = Enum.SortOrder.LayoutOrder }) })
	local nestsLabel = label({ Text = "NESTS", LayoutOrder = 0, Size = UDim2.fromOffset(96, 18), TextSize = 14, TextColor3 = C.muted, Parent = nests })

	-- Toasts and banner -----------------------------------------------------------------------------
	local toasts = new("Frame", { AnchorPoint = Vector2.new(0.5, 1), BackgroundTransparency = 1, Position = UDim2.new(0.5, 0, 1, -20), Size = UDim2.fromOffset(460, 200), Parent = gui },
		{ new("UIListLayout", { Padding = UDim.new(0, 6), VerticalAlignment = Enum.VerticalAlignment.Bottom, HorizontalAlignment = Enum.HorizontalAlignment.Center }) })
	local function toast(text: string, kind: string)
		local col = if kind == "bad" then C.warn elseif kind == "gold" then hex("#b8860b") elseif kind == "egg" then hex("#7a5cff") else C.panel
		local t = label({ Text = text, Size = UDim2.fromOffset(0, 36), AutomaticSize = Enum.AutomaticSize.X, BackgroundTransparency = 0.05, BackgroundColor3 = col, TextSize = 18, TextWrapped = false, Parent = toasts })
		corner(14).Parent = t
		new("UIPadding", { PaddingLeft = UDim.new(0, 14), PaddingRight = UDim.new(0, 14), Parent = t })
		task.delay(2.6, function() t:Destroy() end)
	end
	R.Toast.OnClientEvent:Connect(toast)

	local bannerF = new("Frame", { AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.fromScale(0.5, 0.3), Size = UDim2.fromOffset(520, 110), BackgroundTransparency = 1, Visible = false, Parent = gui })
	local bannerT = label({ Size = UDim2.new(1, 0, 0, 64), TextSize = 52, TextStrokeTransparency = 0.3, Parent = bannerF })
	local bannerS = label({ Position = UDim2.fromOffset(0, 64), Size = UDim2.new(1, 0, 0, 36), TextSize = 22, TextStrokeTransparency = 0.4, Parent = bannerF })
	local bannerId = 0
	local function banner(title: string, sub: string, color: string)
		bannerId += 1
		local id = bannerId
		bannerT.Text, bannerS.Text, bannerT.TextColor3 = title, sub, hex(color)
		bannerF.Visible = true
		task.delay(2.2, function() if bannerId == id then bannerF.Visible = false end end)
	end
	R.Banner.OnClientEvent:Connect(banner)

	-- Sheet (Shop / Dragons) ------------------------------------------------------------------------
	local sheet = new("Frame", { Name = "Sheet", Active = true, AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.fromScale(0.5, 0.55), Size = UDim2.new(0.62, 0, 0.8, -40), BackgroundColor3 = C.panel, Visible = false, Parent = gui },
		{ corner(18), stroke(C.line, 3), new("UISizeConstraint", { MaxSize = Vector2.new(620, 2000), MinSize = Vector2.new(300, 200) }) })
	local sheetTitle = label({ Position = UDim2.fromOffset(16, 6), Size = UDim2.new(1, -80, 0, 44), TextSize = 26, TextXAlignment = Enum.TextXAlignment.Left, Parent = sheet })
	local closeB = button("X", C.panel2, { Name = "CloseButton", AnchorPoint = Vector2.new(1, 0), Position = UDim2.new(1, -8, 0, 6), Size = UDim2.fromOffset(44, 44), Parent = sheet })
	local body = new("ScrollingFrame", { Position = UDim2.fromOffset(12, 56), Size = UDim2.new(1, -24, 1, -66), BackgroundTransparency = 1, BorderSizePixel = 0,
		AutomaticCanvasSize = Enum.AutomaticSize.Y, CanvasSize = UDim2.new(), ScrollBarThickness = 6, Parent = sheet },
		{ new("UIListLayout", { Padding = UDim.new(0, 8), SortOrder = Enum.SortOrder.LayoutOrder }) })
	local panel: string? = nil
	local sellConfirm: number? = nil

	local function row(order: number, title: string, desc: string, btnText: string?, enabled: boolean, onClick: (() -> ())?, extra: Instance?, name: string?): Frame
		local f = new("Frame", { LayoutOrder = order, BackgroundColor3 = C.panel2, Size = UDim2.new(1, -8, 0, 0), AutomaticSize = Enum.AutomaticSize.Y, Parent = body },
			{ corner(12), new("UIPadding", { PaddingTop = UDim.new(0, 8), PaddingBottom = UDim.new(0, 8), PaddingLeft = UDim.new(0, 10), PaddingRight = UDim.new(0, 10) }) })
		local left = if extra then 76 else 0
		if extra then extra.Parent = f; (extra :: any).Position = UDim2.fromOffset(0, 0) end
		label({ Text = title, Position = UDim2.fromOffset(left, 0), Size = UDim2.new(1, -left - 150, 0, 24), TextXAlignment = Enum.TextXAlignment.Left, TextSize = 19, Parent = f })
		label({ Text = desc, Position = UDim2.fromOffset(left, 24), Size = UDim2.new(1, -left - 150, 0, 0), AutomaticSize = Enum.AutomaticSize.Y, TextXAlignment = Enum.TextXAlignment.Left, TextSize = 15, TextColor3 = C.muted, Parent = f })
		if btnText then
			local b = button(btnText, if enabled then C.good else C.line, { Name = name or "RowButton", AnchorPoint = Vector2.new(1, 0), Position = UDim2.new(1, 0, 0, 0), Size = UDim2.fromOffset(140, 48), TextSize = 16, Parent = f })
			b.Active = enabled
			b.AutoButtonColor = enabled
			if onClick then b.Activated:Connect(function() if enabled then onClick() end end) end
		end
		new("Frame", { BackgroundTransparency = 1, Size = UDim2.fromOffset(1, 50), Parent = f })
		return f
	end
	local function costText(cost: { [string]: number }): string
		local parts = {}
		for k, v in cost do table.insert(parts, Rules.fmt(v) .. " " .. (if k == "gold" then "gold" elseif k == "gems" then "gems" else Config.materials[k].name)) end
		table.sort(parts)
		return table.concat(parts, ", ")
	end

	local function renderShop(p: any)
		local o = 0
		local function nx() o += 1; return o end
		local cur = Config.pickaxes[p.pick + 1]
		row(nx(), cur.name .. (if p.reinforce > 0 then string.format(" (reinforced %d/%d)", p.reinforce, #Config.reinforce.costFrac) else ""),
			Rules.fmt(Rules.hitDamage(p)) .. " damage per hit · " .. string.format("%.1f", Rules.swingRate(p)) .. " swings/s", nil, false)
		local rc = Rules.reinforceCost(p)
		if rc then
			row(nx(), "Reinforce", "x" .. Config.reinforce.dmgMult .. " damage\n" .. chips(p, rc), "Reinforce", Rules.canAfford(p, rc), function() R.Shop:FireServer("reinforce") end, nil, "Reinforce")
		end
		local nextPick = Config.pickaxes[p.pick + 2]
		if nextPick and p.pick < 2 then
			row(nx(), nextPick.name, "x" .. Rules.fmt(nextPick.dmg / cur.dmg) .. " damage. Breaks the " .. Config.layers[p.pick + 2].name .. " seal\n" .. chips(p, nextPick.cost),
				"Craft", Rules.canAfford(p, nextPick.cost), function() R.Shop:FireServer("craft") end, nil, "Craft")
		end
		row(nx(), Config.holdDig.name .. (if p.holdDig then "  ✓" else ""), Config.holdDig.desc .. ". Kept through rebirth.",
			if p.holdDig then nil else costText(Config.holdDig.cost), Rules.canAfford(p, Config.holdDig.cost), function() R.Shop:FireServer("hold") end, nil, "HoldDig")
		for _, k in { "strength", "swing" } do
			local u = Config.upgrades[k]
			local cost = Rules.lvlCost(u, p.up[k])
			local maxed = p.up[k] >= u.max
			row(nx(), u.name .. "  Lv " .. p.up[k], u.desc, if maxed then nil else costText({ gold = cost }), p.gold >= cost, function() R.Shop:FireServer("up", k) end, nil, "Up_" .. k)
		end
		local nb = Config.incubators.buy[p.nestBought + 1]
		if nb and p.nestBought < 2 then
			row(nx(), "Nest " .. (#p.nests + 1), "Hatch one more egg at a time", costText(nb), Rules.canAfford(p, nb), function() R.Shop:FireServer("nest") end, nil, "Nest")
		end
	end

	local function renderDragons(p: any)
		local o = 0
		local eq = {}
		for _, id in p.equipped do eq[id] = true end
		label({ LayoutOrder = 0, Text = string.format("Digging with you: %d/%d. Dragons dig nearby blocks while you dig.", #p.equipped, Rules.equipCap(p)),
			Size = UDim2.new(1, -8, 0, 40), TextSize = 16, TextColor3 = C.muted, TextXAlignment = Enum.TextXAlignment.Left, Parent = body })
		local list = table.clone(p.dragons)
		table.sort(list, function(a, b) return Rules.dragonPower(a) > Rules.dragonPower(b) end)
		for _, d in list do
			o += 1
			local def = Rules.dragonDef(d)
			local rar = Config.rarities[d.i + 1]
			local vf = viewport(Models.dragon(def, 2), 64, 7)
			local f = row(o, string.format('%s  <font color="%s">%s</font>', def.name, rar.color, rar.name),
				Rules.fmt(Rules.dragonPower(d) * Rules.petMult(p)) .. " dig power" .. (if eq[d.id] then " · digging" else ""), nil, false, nil, vf)
			local equipB = button(if eq[d.id] then "Unequip" else "Equip", if eq[d.id] then C.line else C.blue,
				{ AnchorPoint = Vector2.new(1, 0), Position = UDim2.new(1, -110, 0, 0), Size = UDim2.fromOffset(100, 48), TextSize = 16, Parent = f })
			equipB.Activated:Connect(function() R.Equip:FireServer(d.id) end)
			local rare = d.i >= 2
			local confirming = sellConfirm == d.id
			local sellB = button(if confirming then "Sure?" else "Sell " .. Rules.fmt(Rules.dragonSell(p, d)), if confirming then C.warn else hex("#b8860b"),
				{ AnchorPoint = Vector2.new(1, 0), Position = UDim2.new(1, 0, 0, 0), Size = UDim2.fromOffset(100, 48), TextSize = 16, Parent = f })
			sellB.Activated:Connect(function()
				-- Two taps to sell anything Rare or better.
				if rare and sellConfirm ~= d.id then sellConfirm = d.id; UI.refresh() return end
				sellConfirm = nil
				R.Sell:FireServer(d.id)
			end)
		end
		if #list == 0 then label({ LayoutOrder = 1, Text = "Hatch an egg to get your first dragon.", Size = UDim2.new(1, -8, 0, 40), TextColor3 = C.muted, Parent = body }) end
	end

	function UI.refresh()
		if not panel or not app.profile then return end
		for _, ch in body:GetChildren() do if not ch:IsA("UIListLayout") then ch:Destroy() end end
		sheetTitle.Text = if panel == "shop" then "Shop" else "Dragons"
		if panel == "shop" then renderShop(app.profile) else renderDragons(app.profile) end
	end
	local function open(name: string)
		if panel == name then panel = nil; sheet.Visible = false return end
		panel = name
		sellConfirm = nil
		sheet.Visible = true
		UI.refresh()
	end
	shopB.Activated:Connect(function() open("shop") end)
	dragonsB.Activated:Connect(function() open("dragons") end)
	closeB.Activated:Connect(function() panel = nil; sheet.Visible = false end)
	surfaceB.Activated:Connect(function() R.Surface:FireServer() end)

	-- Hatch reveal ----------------------------------------------------------------------------------
	local reveal = new("Frame", { Name = "Reveal", Active = true, Size = UDim2.fromScale(1, 1), BackgroundColor3 = Color3.new(0.04, 0.02, 0.08), BackgroundTransparency = 0.3, Visible = false, ZIndex = 10, Parent = gui })
	local card = new("Frame", { AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.fromScale(0.5, 0.5), Size = UDim2.fromOffset(340, 400), BackgroundColor3 = C.panel, ZIndex = 10, Parent = reveal }, { corner(22), stroke(C.line, 3) })
	local revealQ: { any } = {}
	local spinning: ViewportFrame? = nil
	local function showNext()
		for _, ch in card:GetChildren() do if not ch:IsA("UICorner") and not ch:IsA("UIStroke") then ch:Destroy() end end
		local item = table.remove(revealQ, 1)
		if not item then reveal.Visible = false; spinning = nil return end
		local d, isNew, first = item[1], item[2], item[3]
		local def = Rules.dragonDef(d)
		local rar = Config.rarities[d.i + 1]
		reveal.Visible = true
		local vf = viewport(Models.dragon(def, 3), 220, 9)
		vf.AnchorPoint = Vector2.new(0.5, 0)
		vf.Position = UDim2.new(0.5, 0, 0, 16)
		vf.ZIndex = 11
		vf.Parent = card
		spinning = vf
		label({ Text = (if isNew then '<font color="#ffd84a">NEW! </font>' else "") .. def.name, Position = UDim2.fromOffset(0, 236), Size = UDim2.new(1, 0, 0, 40), TextSize = 32, ZIndex = 11, Parent = card })
		label({ Text = rar.name .. " · " .. Rules.fmt(Rules.dragonPower(d)) .. " power", TextColor3 = hex(rar.color), Position = UDim2.fromOffset(0, 276), Size = UDim2.new(1, 0, 0, 28), TextSize = 20, ZIndex = 11, Parent = card })
		local function done() showNext() end
		if first then
			local b = button("Dig together!", C.good, { Name = "KeepButton", AnchorPoint = Vector2.new(0.5, 0), Position = UDim2.new(0.5, 0, 0, 326), Size = UDim2.fromOffset(220, 54), TextSize = 22, ZIndex = 11, Parent = card })
			b.Activated:Connect(done)
		else
			local keep = button("Keep", C.good, { Name = "KeepButton", Position = UDim2.fromOffset(20, 326), Size = UDim2.fromOffset(140, 54), TextSize = 22, ZIndex = 11, Parent = card })
			keep.Activated:Connect(done)
			local sellB = button("Sell " .. Rules.fmt(Rules.dragonSell(app.profile, d)), hex("#b8860b"), { Name = "SellButton", Position = UDim2.fromOffset(180, 326), Size = UDim2.fromOffset(140, 54), TextSize = 20, ZIndex = 11, Parent = card })
			sellB.Activated:Connect(function() R.Sell:FireServer(d.id); showNext() end)
		end
	end
	R.Reveal.OnClientEvent:Connect(function(d, isNew, first)
		table.insert(revealQ, { d, isNew, first })
		if not reveal.Visible then showNext() end
	end)

	-- Nest buttons ----------------------------------------------------------------------------------
	local nestButtons: { TextButton } = {}
	-- Short phones: smaller nests and no heading, so the column clears Roblox's jump button.
	local short = workspace.CurrentCamera.ViewportSize.Y < 450
	local nestH = if short then 64 else 96
	nestsLabel.Visible = not short
	if short then goalL.TextSize = 15 end
	local buyNestB = button("+ Nest", C.panel2, { Name = "BuyNestButton", Size = UDim2.fromOffset(88, 56), TextSize = 16, LayoutOrder = 100, Parent = nests })
	buyNestB.Activated:Connect(function() R.Shop:FireServer("nest") end)
	local function buildNests(p: any)
		while #nestButtons < #p.nests do
			local i = #nestButtons + 1
			local b = button("", C.panel2, { Name = "Nest" .. i, Size = UDim2.fromOffset(88, nestH), LayoutOrder = i, TextSize = 16, TextYAlignment = Enum.TextYAlignment.Bottom, Parent = nests })
			new("UIPadding", { PaddingBottom = UDim.new(0, 6), Parent = b })
			b.Activated:Connect(function() R.Hatch:FireServer(i) end)
			nestButtons[i] = b
		end
	end
	local nestEggs: { [number]: string } = {}

	-- Goal pill text (port of the prototype's goalHtml) ---------------------------------------------
	local function goalText(p: any): string
		local ready = false
		for _, n in p.nests do if n and app.serverNow() >= n.start + n.dur then ready = true end end
		if p.tut == 0 then return if p.holdDig then "Tap the ground to dig. <b>Hold</b> to keep digging!" else "<b>Tap</b> the ground to dig!" end
		if p.tut == 1 then return "Something is glowing down there. <b>Dig to the egg!</b>" end
		if p.tut <= 3 then return if ready then "Your egg is ready! <b>Tap the nest</b> to hatch." else "Your egg is warming up in a <b>nest</b>. Keep digging!" end
		if p.tut == 4 then
			local c = Rules.lvlCost(Config.upgrades.strength, p.up.strength)
			return if p.gold >= c then "Your dragon digs with you! Open the <b>Shop</b> and buy <b>Strength</b>." else "Your dragon digs with you! Collect gold for an upgrade."
		end
		if not p.holdDig then
			return (if Rules.canAfford(p, Config.holdDig.cost) then "Tired of tapping? Buy <b>Hold to Dig</b> in the Shop!" else "Tired of tapping? Save up for <b>Hold to Dig</b>.") .. "\n" .. chips(p, Config.holdDig.cost)
		end
		local rc = Rules.reinforceCost(p)
		if rc and p.pick < 2 then
			return string.format("Reinforce your <b>%s</b> (%d/%d) for x%s damage\n%s", Config.pickaxes[p.pick + 1].name, p.reinforce + 1, #Config.reinforce.costFrac, tostring(Config.reinforce.dmgMult), chips(p, rc))
		end
		local nextPick = Config.pickaxes[p.pick + 2]
		if nextPick and p.pick < 2 then return string.format("Craft the <b>%s</b> to break into %s\n%s", nextPick.name, Config.layers[p.pick + 2].name, chips(p, nextPick.cost)) end
		return "You reached the bottom of this test build. <b>Keep digging the Crystal Grotto!</b>"
	end

	-- Refresh loop: HUD every frame (cheap), sheet when the profile changes. ------------------------
	local lastLayer = 1
	app.onProfile(function(p)
		buildNests(p)
		local nb = Config.incubators.buy[p.nestBought + 1]
		buyNestB.Visible = nb ~= nil and p.nestBought < 2
		if nb then buyNestB.Text = "+ Nest\n" .. costText(nb) end
		if panel then UI.refresh() end
		local nextPick = Config.pickaxes[p.pick + 2]
		local rc = Rules.reinforceCost(p)
		shopDot.Visible = (nextPick ~= nil and p.pick < 2 and Rules.canAfford(p, nextPick.cost)) or (rc ~= nil and Rules.canAfford(p, rc)) or (not p.holdDig and Rules.canAfford(p, Config.holdDig.cost))
	end)
	RunService.Heartbeat:Connect(function()
		local p = app.profile
		if not p then return end
		goldL.Text = Rules.fmt(p.gold)
		gemL.Text = Rules.fmt(p.gems)
		local r = app.myCell and app.myCell() or -1
		local depth = math.max(0, (r or -1) + 1)
		local li = Rules.layerIdx(depth)
		depthL.Text = string.format('%d m  <font color="#b9add6" size="16">%s</font>', depth, Config.layers[li].name)
		if li ~= lastLayer then
			lastLayer = li
			banner(Config.layers[li].name, "New egg: " .. Rules.EGG[Config.layers[li].egg].name, Config.layers[li].colors.accent)
		end
		surfaceB.Visible = (r or -1) >= Config.player.surfaceButtonDepth
		local g = goalText(p)
		if goalL.Text ~= g then goalL.Text = g end
		for i, b in nestButtons do
			local n = p.nests[i]
			if not n then
				b.Text = "empty"
				if nestEggs[i] then nestEggs[i] = nil; local vf = b:FindFirstChildOfClass("ViewportFrame"); if vf then vf:Destroy() end end
			else
				if nestEggs[i] ~= n.egg then
					local old = b:FindFirstChildOfClass("ViewportFrame"); if old then old:Destroy() end
					local vf = viewport(Models.egg(n.egg, 2), 60, 6)
					vf.AnchorPoint = Vector2.new(0.5, 0)
					vf.Position = UDim2.new(0.5, 0, 0, 4)
					vf.Parent = b
					nestEggs[i] = n.egg
				end
				local left = n.start + n.dur - app.serverNow()
				b.Text = if left <= 0 then '<font color="#ffd84a">HATCH!</font>' else Rules.mmss(left)
				b.BackgroundColor3 = if left <= 0 then hex("#5d4a8a") else C.panel2
			end
		end
		if spinning then
			local cam = spinning.CurrentCamera :: Camera
			local t = os.clock()
			local a = math.sin(t * 1.2) * 0.7 -- sway side to side, always facing the viewer
			cam.CFrame = CFrame.lookAt(Vector3.new(math.sin(a) * 10, 2.5, math.cos(a) * 10), Vector3.new(0, 0.8, 0))
		end
	end)
end

return UI
