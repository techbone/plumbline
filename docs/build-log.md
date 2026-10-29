# Build log

Dead ends, surprises from the Meta API, the path chosen, and the test that guards it.

## 2026-10-29 — SAM video tracks at most 16 objects per frame

- **Surprise:** the SAM 3.1 docs cap video tracking at 16 objects per frame. A single wall face has hundreds of blocks.
- **Path chosen:** count walls from guided elevation stills in image mode (no published instance cap), and use video tracking only for sparse objects: columns, openings, block stacks.
- **Guard:** `docs/evidence/spike/*.json`, SAM instance counts on four real fence photos.

## 2026-10-29 — Muse Voice Transcribe has no Nigerian languages

- **Surprise:** the 25 supported languages don't include Yoruba, Hausa, Igbo or Pidgin.
- **Path chosen:** the spoken visit code is English only; we don't pitch narration translation.

## 2026-10-29 — SAM spike on a real block wall: individual blocks separate, with two failure modes

- **Result:** prompt `"concrete block"` on an unpainted staggered-bond fence gives one mask per block face, including partial blocks at the edges. Close-up (34 masks): every visible face masked, 34 of 34. Front (92 masks) and shade (57) are mostly clean, but not complete. Cost is about $0.001 per image.
- **Failure 1, undercount:** SAM skips some blocks that look different from their neighbours. In the front shot about six cool-grey blocks have no mask. In the shade shot the whole stained bottom course (about 6 blocks) is missing. In the angle shot most of the shaded left bay is missing.
- **Failure 2, perspective:** on the angled shot the median block area means little because near and far blocks differ in size, so the area cross-check disagrees by 35%. Elevation stills must be shot straight on.
- **Cross-check:** it flags all four photos (17–35% off, tolerance is 12%). That is correct for the shade photo (undercount) and the angle photo. For the front photo it is probably too strict: `MORTAR_FACTOR = 1.08` assumes 10–12 mm joints, but this wall has 20+ mm joints, and SAM masks sit slightly inside the block edge.
- **Next:** calibrate the factor on a hand-counted wall, add a straight-on check (reject when the wall's top edge isn't level), and prompt SAM a second time for the "dark/grey block" case.
- **Counting rule (used for every hand count):** one count per block face at least half visible, including cut and partial blocks at edges and pillars. Exclude the buried or stained foundation course and anything behind grass.
- **Fixed on the way:** the overlay `viewBox` was `0 0 0 0` because the size regex required `|>` right after `h=`, and `include_confidence` adds a field there.
