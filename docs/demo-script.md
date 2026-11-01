# Demo video: voiceover script (2:51)

The video is already cut; read this over it. Calm pace, about 130 words a minute. Each block starts at its timecode. If you finish a line early, pause; the picture holds. Bracketed timecodes inside a block mark where the picture changes, so land the sentence after it on that change.

Everything on screen is real and labelled in the corner. Scenes are either the live app, the live report, screenshots from the phone on 31 Oct, or a replay of that stored walk.

---

**0:00 · The Karsana report, panning along the wall**

> This is a fence in Karsana, Abuja. Three hundred and seventy-two blocks, each one found and numbered, from a single fifty-three-second walk with a phone.

**0:14 · "You're in London. The house is in Abuja."**

> Nigerians abroad build homes back home in stages, paying a relative or a foreman they can't watch.

**[0:22] · "A photo on WhatsApp."**

> The proof is usually a photo on WhatsApp. And people have been sent photos of someone else's house, for years.

**[0:30] · "A photo can't show how much was built, when, or where."**

> A photo can't show how much was built, when, or where.

**0:38 · Home page, the phone replay running**

> Plumbline turns the foreman's phone walk into a receipt the owner can check before the next payment. Nothing to install.

**0:50 · Setting up a site, then the site page with the QR**

> The owner sets the milestone: this wall, this many blocks, this payment. They get a link and a QR code to send to the foreman.

**1:03 · The walk, step 1 on the left**

> On site, the foreman gets a one-time code, writes it on paper, and films it for two seconds.

**[1:12] · step 2**

> Then they walk slowly along the wall. The phone never uploads a video. It sends a still every half second, because data is expensive.

**[1:21] · step 3**

> As each still arrives, SAM 3.1 finds the blocks in it, so the count climbs while they walk.

**1:31 · Phone screen: "Stitching the wall"**

> When the walk stops, the stills are joined into one wall, so each block counts once. Muse Spark reads the code without being told what it should be, and GPS pins the site.

**[1:39] · Phone screen: "Sent to the owner"**

> About a minute later, the report is sent.

**1:50 · The report on a laptop, top of the page**

> The owner sees the verdict first, and every check behind it.

**[1:55] · scrolls down to the site notes**

> Muse Spark adds site notes that point to exact frames.

**[2:03] · back up, panning along the wall**

> And here's the stitched wall. Solid blocks were seen in two or more stills. Amber ones only once, so a person should look.

**2:13 · "What if the video is old?"**

> So what stops someone sending yesterday's video?

**[2:16] · the old walk playing as the camera**

> We fed that same recorded walk into a brand-new visit, as if it were the camera.

**[2:23] · counting, sped up**

> The blocks still get counted. But this visit's code is four, seven, T, U, and the paper says X, K, M, X.

**[2:29] · "Not verified"**

> Muse Spark caught it. Not verified, no matter what the count says.

**2:39 · Closing card**

> Plumbline is built on SAM 3.1 and Muse Spark, and works with any phone, on any block wall. The contractor's video becomes the receipt.

---

## Recording the voice

- **Where:** a quiet room with soft things around you (a wardrobe of clothes works). Phone voice memo is fine; hold it a hand's width from your mouth, slightly to the side.
- **How:** one take per block, not the whole thing at once. Leave a second of silence before each block so they're easy to cut.
- **Joining it to the video:** drop the clips on the video in any editor (CapCut, iMovie) at the timecodes above. Or, with one finished voice file the same length as the video:

  ```sh
  ffmpeg -i plumbline-demo.mp4 -i voice.m4a -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest plumbline-demo-voiced.mp4
  ```

## What's on screen, for the record

| Time | Source |
|---|---|
| 0:00 | Live report `vis_55dbb8c2d7d2` (your walk, 31 Oct, 17:33) |
| 0:38 | Live home page |
| 0:50 | Live `/new`, creating a test site, then its site page |
| 1:03 | The home page's replay of `vis_55dbb8c2d7d2`: stored stills with SAM 3.1's stored boxes, at 2× speed |
| 1:31 | Your phone screenshots from that walk |
| 1:50 | Live report `vis_55dbb8c2d7d2` |
| 2:13 | Live app: the stored walk fed to Chrome as its camera, into a new visit on a fresh test site; result `vis_7ef2922f3dfd`, not verified (`Read "XKMX", expected "47TU"`). Sped up 7× during the walk and 19× during processing, labelled on screen |
