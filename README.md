# Plumbline

### The contractor's video becomes the receipt.

Plumbline is for Nigerians abroad who are building a house back home. The foreman records a two-minute guided visit and Plumbline turns it into counts you can audit: SAM 3.1 segments and numbers every block, column and opening, and Muse Spark checks the result against the bill of quantities and the previous visit. A milestone is marked verified only after every check on the visit passes.

**Watch the demo** (TODO) · **Live app** (TODO) · **Verify it yourself** · **[Architecture](ARCHITECTURE.md)** · **Run it locally**

## Demo

TODO, 3-minute video.

## Verify it yourself in 60 seconds

```sh
npm install
npm test          # 4 passing
cp .env.example .env.local   # add MODEL_API_KEY
npm run spike -- path/to/wall.jpg
```

## The problem

TODO

## What it does

See the capability map in [ARCHITECTURE.md](ARCHITECTURE.md#capability-map).

## The hard problem

TODO

## What's real vs simplified

TODO

## Run it locally

| Variable | Required | Description |
|---|---|---|
| `MODEL_API_KEY` | yes | Meta Model API key |
| `DATA_DIR` | no | SQLite and media directory, default `./data` |
| `APP_URL` | no | Base URL for foreman capture links |

## Disclosure

Built for the Meta Global AI Developer Hackathon (Indie Developer track). First commit: 2026-10-29. Scaffolded with `create-next-app`.
