--!strict
-- Same generators as the prototype (mulberry32 and hash2), so a seed digs the same shaft in both builds.
local Rng = {}

local band, bxor, bor, rshift, lshift = bit32.band, bit32.bxor, bit32.bor, bit32.rshift, bit32.lshift

local function imul(a: number, b: number): number
	local ah, al = rshift(a, 16), band(a, 0xffff)
	local bh, bl = rshift(b, 16), band(b, 0xffff)
	return band(al * bl + lshift(band(ah * bl + al * bh, 0xffff), 16), 0xffffffff)
end

function Rng.mulberry(seed: number): () -> number
	local a = band(seed, 0xffffffff)
	return function()
		a = band(a + 0x6D2B79F5, 0xffffffff)
		local t = imul(bxor(a, rshift(a, 15)), bor(1, a))
		t = bxor(band(t + imul(bxor(t, rshift(t, 7)), bor(61, t)), 0xffffffff), t)
		return bxor(t, rshift(t, 14)) / 4294967296
	end
end

function Rng.hash2(a: number, b: number): number
	return bxor(imul(bxor(band(a, 0xffffffff), 0x9E3779B9), 0x85EBCA6B), imul(band(b + 0x632BE5AB, 0xffffffff), 0xC2B2AE35))
end

return Rng
