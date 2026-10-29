# AGENTS.md

Plumbline: construction progress verification for owners who can't be on site. Read `ARCHITECTURE.md` first. Hackathon entry for the Meta Global AI Developer Hackathon. Deadline: Wed Nov 4, 2026, 9:00 PM ET.

## Rules

- All Meta API calls go through `src/lib/meta/`. The app and the scripts share that code. No mocks of Meta calls in the product path.
- The phone sends JPEG stills, never video. The server recomputes everything from stored frames and counts; it never trusts counts sent by the client.
- No database. State is write-once objects via `src/lib/storage.ts` (Vercel Blob in production, `./data` locally). Projects live in `src/lib/projects.ts`.
- Deterministic logic (area cross-check, hashing, verdict rules) lives in `src/lib/verify/` as pure functions with unit tests.
- The UI never says "verified" unless the stored report says so (`result.verdict.status`).
- Commits: short lowercase conventional one-liners (`feat: add elevation upload`). No co-author or generated-by lines.
- Every surprise from the Meta API gets an entry in `docs/build-log.md`.

## Meta API gotchas

- Base URL `https://api.meta.ai/v1`, env `MODEL_API_KEY`, OpenAI SDK with explicit `baseURL`/`apiKey`.
- SAM 3.1: `POST /v1/responses`, model `sam-3.1`, content `[input_text noun phrase, input_image|input_video]`. Output is special-token text, one line per frame; parse with `@meta-sam/parser` (`parseImageStream` / `parseVideoStream`, ESM only, root imports only). Check `result.outcome.status` and `result.diagnostics`.
- SAM video: max 16 tracked objects per frame, ≤15,000 frames, MP4/MOV H.264/H.265 only (no WebM, so browser `MediaRecorder` WebM must be transcoded). Remux with `-movflags +faststart`. Billed per frame, min 50.
- `include_confidence: "true"` in metadata adds `c` to each record.
- Muse Voice Transcribe has no Yoruba/Hausa/Igbo/Pidgin. Use English for the spoken code only.
- Muse Spark 1.3 audio is degraded; use 1.2 if sending audio to Spark.

## Design rules

The aim is a tool that looks like it came from a serious product team: calm, dense where it matters, nothing that reads as AI-generated.

- **Type:** headings in Archivo (600/700, tracking -0.02em on large sizes). Body in Inter. Counts, codes, hashes and IDs in IBM Plex Mono with `font-variant-numeric: tabular-nums`. Scale: 12 / 14 / 16 / 20 / 28 / 40.
- **Colour:** warm concrete neutrals plus one accent, as CSS variables in `globals.css`.
  - light: `--bg #F6F5F2`, `--surface #FFFFFF`, `--line #E4E1DA`, `--text #1C1B19`, `--muted #6B675F`
  - dark: `--bg #121211`, `--surface #1B1A18`, `--line #2C2A27`, `--text #EDEBE6`, `--muted #9A958B`
  - accent (hi-vis): `--accent #E8590C`. State colours: `--ok #2F7D4F`, `--warn #B7791F`, `--bad #C2412D`. Only the accent and state colours carry hue.
- **Shape:** radius 6px on controls, 10px on cards. Borders over shadows; at most one soft shadow on overlays.
- **Layout:** 4px spacing scale, 12-column grid, max width 1200px. Tables for counts, not cards.
- **Icons:** Lucide only, 16px, stroke 1.75, muted colour.
- **Don't:** gradients, glow, glassmorphism, emoji, sparkle icons, "AI-powered" badges, the centred hero with three feature cards, filler copy ("seamless", "unlock").
- **States:** every async view has empty, loading (named step), error and done states.
- **Mask overlays:** instance masks drawn at 35% accent fill with a 1px outline and a mono index label. Never rainbow palettes.
- **Copy:** plain and specific, written for an owner checking their money ("1,742 blocks counted, 58 short of the lintel milestone").
