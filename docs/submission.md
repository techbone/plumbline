# Submission (paste-ready)

- **Project:** Plumbline
- **Track:** Indie Developer · Build for Your World
- **One line:** The contractor's video becomes the receipt.
- **Live app:** https://plumbline-ruby.vercel.app
- **Repo:** https://github.com/techbone/plumbline
- **Demo video:** https://youtu.be/xlCYNuYCelE (2:56)
- **Meta models used:** SAM 3.1 (image mode, on every still of a walk), Muse Spark 1.3 (blind visit-code read, same-site comparison, site notes)
- **Built during the hackathon:** everything; first commit 2026-10-29.

**Project description (as submitted)**

Plumbline lets someone abroad check building progress at home before sending the next payment.

Nigerians abroad build houses through relatives and foremen they can't supervise, and pay in stages on the strength of WhatsApp photos. There are documented cases of people being sent photos of someone else's house for years.

The owner sets a milestone (this wall, this many blocks, this payment) and sends the foreman a link. On site, the foreman writes a one-time code on paper, films it, then walks along the wall. The phone sends a still every half second instead of a video, and SAM 3.1 counts the blocks in each still while the walk is still happening. When the walk stops, our stitching joins the stills into one wall so each block counts once. Muse Spark reads the code without being told what it is, compares landmarks with the last visit and writes site notes tied to frames, and the phone's GPS is checked against the site pin. The owner gets a verdict, with every block numbered on the stitched wall and every frame one click away.

On a real 53-second walk in Karsana, Abuja, it confirmed 372 blocks and verified the visit. When we fed that same recording into a new visit as the camera, Muse Spark read the old code and the visit was not verified.

Try it on any block wall: https://plumbline-ruby.vercel.app/new
Demo video: https://youtu.be/xlCYNuYCelE
Code: https://github.com/techbone/plumbline
