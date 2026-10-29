# Build log

Dead ends, surprises from the Meta API, the path chosen, and the test that guards it.

## 2026-10-29 — SAM video tracks at most 16 objects per frame

- **Surprise:** the SAM 3.1 docs cap video tracking at 16 objects per frame. A single wall face has hundreds of blocks.
- **Path chosen:** count walls from guided elevation stills in image mode (no published instance cap), and use video tracking only for sparse objects: columns, openings, block stacks.
- **Guard:** TODO, a spike result in `docs/evidence/` showing the instance count on a real elevation.

## 2026-10-29 — Muse Voice Transcribe has no Nigerian languages

- **Surprise:** the 25 supported languages don't include Yoruba, Hausa, Igbo or Pidgin.
- **Path chosen:** the spoken visit code is English only; we don't pitch narration translation.
