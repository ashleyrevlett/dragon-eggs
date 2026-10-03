-- Pulls roblox/src into the open Studio place. Run in Studio's command bar (or via the Studio MCP).
-- Needs the repo served locally:  python3 -m http.server 8765 --bind 127.0.0.1   (from the repo root)
-- and the manifest built:         node tools/roblox_build.js
-- HTTP is switched on only for the length of this run, then restored.
local HttpService = game:GetService("HttpService")
local BASE = "http://127.0.0.1:8765"
local was = HttpService.HttpEnabled
HttpService.HttpEnabled = true
local keep = {}
local ok, err = pcall(function()
	local manifest = HttpService:JSONDecode(HttpService:GetAsync(BASE .. "/roblox/build/manifest.json", true))
	for _, e in manifest do
		local parent: Instance = game:GetService(e.path[1])
		for i = 2, #e.path - 1 do
			parent = parent:FindFirstChild(e.path[i]) or error("missing parent " .. table.concat(e.path, "/"))
		end
		local name = e.path[#e.path]
		local inst = parent:FindFirstChild(name)
		if inst and inst.ClassName ~= e.className then inst:Destroy(); inst = nil end
		if not inst then
			inst = Instance.new(e.className)
			inst.Name = name
			inst.Parent = parent
		end
		inst:SetAttribute("Synced", true)
		keep[inst] = true
		if e.url then
			local src = HttpService:GetAsync(BASE .. e.url, true)
			if inst.Source ~= src then inst.Source = src end
		end
	end
	-- Remove synced instances whose files were deleted.
	for _, root in { "ReplicatedStorage", "ServerScriptService", "StarterPlayer" } do
		for _, d in game:GetService(root):GetDescendants() do
			if d:GetAttribute("Synced") and not keep[d] then d:Destroy() end
		end
	end
	print(("[sync] %d entries synced"):format(#manifest))
end)
HttpService.HttpEnabled = was
if not ok then error(err) end
-- Parse-check every synced script so syntax errors show up now, not mid-playtest.
local problems = {}
for inst in keep do
	if inst:IsA("LuaSourceContainer") then
		local _, perr = loadstring((inst :: any).Source)
		if perr then table.insert(problems, inst:GetFullName() .. ": " .. perr) end
	end
end
if #problems > 0 then error("[sync] parse errors:\n" .. table.concat(problems, "\n")) end
return "[sync] ok, no parse errors"
