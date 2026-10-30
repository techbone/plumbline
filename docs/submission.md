# Submission (paste-ready)

- **Project:** Plumbline
- **Track:** Indie Developer · Build for Your World
- **One line:** The contractor's video becomes the receipt.
- **Live app:** https://plumbline-ruby.vercel.app
- **Repo:** https://github.com/techbone/plumbline
- **Demo video:** TODO
- **Meta models used:** SAM 3.1 (image mode, on every still of a walk), Muse Spark 1.3 (blind visit-code read, same-site comparison, site notes)
- **Built during the hackathon:** everything; first commit 2026-10-29.

**Paragraph**

Nigerians abroad build houses back home through relatives and foremen they can't supervise, and pay in tranches on the strength of WhatsApp photos; the documented failure is years of photos of someone else's house. Plumbline turns the foreman's phone walk along a wall into a block count the owner can audit. The foreman writes a one-time code on a block and films it, then walks the wall; the phone sends a still every half second instead of a video (data is expensive), and SAM 3.1 counts the blocks in each still while the walk is still happening. When the walk ends, our stitching joins the stills into one wall so each block counts once, Muse Spark reads the code blind, compares landmarks with the last visit and writes site notes tied to frames, and the phone's GPS is checked against the site pin. The owner gets a verdict per milestone, with every block numbered on the stitched wall and every frame one click away. On a real 58-second walk on the live app it confirmed 236 blocks and verified the visit; on another, a hand-written Q read as P kept the visit from being verified, as it should. Judges can try it on any block wall: set up a site at /new, scan the QR with a phone, and walk.
