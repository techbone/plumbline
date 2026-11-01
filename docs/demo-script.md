# Demo video: script and sources (2:56)

**[Watch on YouTube](https://youtu.be/xlCYNuYCelE).** Narration by the builder, recorded in one take; the scenes were then cut to the voice so each picture change lands on the line that names it. Timecodes below are the published cut's. Bracketed timecodes mark a change within a scene.

Everything on screen is real and labelled in the corner: the live app, a live report, screenshots from the phone on 31 Oct, or a replay of that stored walk. Anything sped up says so on screen.

---

**0:00 · The Karsana report, panning along the wall**

> This is a fence in Karsana, Abuja. Three hundred and seventy-two blocks, each one found and numbered, from a single fifty-three-second walk with a phone.

**0:14 · "You're in London. The house is in Abuja."**

> Nigerians abroad build homes back home in stages, paying a relative or a foreman they can't watch.

**[0:23] · "A photo on WhatsApp."**

> The proof is usually a photo on WhatsApp. And people have been sent photos of someone else's house, for years.

**[0:32] · "A photo can't show how much was built, when, or where."**

> A photo can't show how much was built, when, or where.

**0:38 · Home page, the phone replay running**

> Plumbline turns the foreman's phone walk into a receipt the owner can check before the next payment. Nothing to install.

**0:49 · Setting up a site, then the site page with the QR**

> The owner sets the milestone: this wall, this many blocks, this payment. They get a link and a QR code to send to the foreman.

**1:01 · The walk, step 1 on the left**

> On site, the foreman gets a one-time code, writes it on paper, and films it for two seconds.

**[1:09] · step 2**

> Then they walk slowly along the wall. The phone never uploads a video. It sends a still every half second, because data is expensive.

**[1:20] · step 3**

> As each still arrives, SAM 3.1 finds the blocks in it, so the count climbs while they walk.

**1:30 · Phone screen: "Stitching the wall"**

> When the walk stops, the stills are joined into one wall, so each block counts once. Muse Spark reads the code without being told what it should be, and GPS pins the site.

**[1:45] · Phone screen: "Sent to the owner"**

> About a minute later, the report is sent.

**1:49 · The report on a laptop, top of the page**

> The owner sees the verdict first, and every check behind it.

**[1:54] · scrolls down to the site notes**

> Muse Spark adds site notes that point to exact frames.

**[1:59] · back up, panning along the wall**

> And here's the stitched wall. Solid blocks were seen in two or more stills. Amber ones only once, so a person should look.

**2:10 · "What if the video is old?"**

> So what stops someone sending yesterday's video?

**[2:15] · the old walk playing as the camera**

> We fed that same recorded walk into a brand-new visit, as if it were the camera.

**[2:23] · counting, sped up**

> The blocks still get counted. But this visit's code is four, seven, T, U, and the paper says X, K, M, X.

**[2:36] · "Not verified"**

> Muse Spark caught it. Not verified, no matter what the count says.

**2:43 · Closing card**

> Plumbline is built on SAM 3.1 and Muse Spark, and works with any phone, on any block wall. The contractor's video becomes the receipt.

---

## What's on screen, for the record

| Time | Source                                                                                                                                                                                                                                           |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0:00 | Live report `vis_55dbb8c2d7d2` (a phone walk, 31 Oct 2026, 17:33)                                                                                                                                                                                        |
| 0:38 | Live home page                                                                                                                                                                                                                                   |
| 0:49 | Live `/new`, creating a test site, then its site page                                                                                                                                                                                            |
| 1:01 | The home page's replay of `vis_55dbb8c2d7d2`: stored stills with SAM 3.1's stored boxes, at 1.9× speed                                                                                                                                             |
| 1:30 | Phone screenshots from that walk                                                                                                                                                                                                            |
| 1:49 | Live report `vis_55dbb8c2d7d2`                                                                                                                                                                                                                   |
| 2:10 | Live app: the stored walk fed to Chrome as its camera (`--use-file-for-fake-video-capture`), into a new visit on a fresh test site; result `vis_7ef2922f3dfd`, not verified (`Read "XKMX", expected "47TU"`). Sped up 7× during the walk and 32× during processing, labelled on screen |

## How it was made

Scenes were recorded from the live app with headless Chrome (desktop at 1920×1080, phones at 3× pixel density), title cards and labels rendered as HTML in the app's own type, and the cut assembled with ffmpeg. The narration was split at its pauses, each line checked against this script with a Muse Spark 1.2 transcription, and placed on the timeline; every line was then cut back out of the finished video and transcribed again to confirm placement.
