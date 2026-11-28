# Plenty Flow

*Breathe in, plan out.*

**Pilates class planner.** Plan reformer and mat flows on your iPhone or iPad, then teach from them.
Made for Pilates teachers. Everything stays on your device: no account, no ads, no tracking.

**Version 0.7.0. Still early: keep backups.**

- **iPhone and iPad**: one app for both. How to install it: [docs/IPHONE.md](docs/IPHONE.md).
- **Android**: planned, not started.

## What it does

- **Your studios.** Each place you teach has its own reformers, springs, props and class types.
  A flow shows the right springs for the studio it's taught at.
- **Flows, step by step.** Pick the parts of the class, fill each one, put it in order, then tweak it
  in the flow editor: springs, reps, layers, props and what you offer clients who need it easier or
  harder. Write a movement in your own words when the library doesn't have it. Undo and redo as you go.
- **Blocks.** Save a sequence of movements as a block and drop it into any flow.
- **Paste from Notes.** Paste a plan written in your notes app (parts, spring letters like R/RB,
  reps, blocks and props) and it becomes a flow. Copy a flow back out as text too.
- **Search** that knows related words and forgives typos, across movements, series, blocks and flows.
- **Checks as you plan**: time for each part of the class, spring changes, muscle balance, spine
  movement and props.
- **184 movements and 18 series**, each with a drawing and the muscles it works. Change any of them,
  add your own, and star your favourites.
- **Play.** One movement at a time with a timer, springs and what's next. Tick movements off as you
  go. The screen stays awake.
- **Your roster.** Add the shifts you work, or save one like "Saturday mornings" and add it in a tap.
  Plan a flow for each class, cancel or cover a class, write notes after class, and get reminders.
  Shifts can go into the iPhone Calendar app, or out as a calendar file.
- **An optional timesheet**: hours each week and month, and your pay if you add a rate.
- **Sync your iPhone and iPad** over Wi-Fi, up to 6 devices. Each keeps everything.
- **Sharing.** Send a flow to another device on the same Wi-Fi by QR code, or a flow or studio as a file.
- **Backups** about once a day, kept in the Files app, with a reminder to copy one off the device.
- **Your look**: light, dark, true black, and a choice of colours. Text size, bold text, high
  contrast, bigger buttons and less motion.

### Coming later (greyed out in the app)

Draft a flow for me · a studio server you host yourself · a computer version · Android ·
home screen widgets.

## The library is a draft

Every movement was written for Plenty Flow in its own words and checked against published sources
for its name and usual springs ([src/library/SOURCES.md](src/library/SOURCES.md)). It is a planning
aid for qualified teachers, not teaching or medical advice.

## Building it

See [BUILD.md](BUILD.md). In short: `npm ci`, `npm test`, `npm run build`. The iPhone app is built by
a GitHub Action on a Mac.

## Privacy

Nothing leaves your device unless you share it. See [PRIVACY.md](PRIVACY.md).

## Licence

The app is free software under the [GNU GPL, version 3 or later](LICENSE). The movement library is
under [CC BY-SA 4.0](LICENSE-DATA.md).

Plenty Flow grew out of [OpenPilates](https://github.com/d-plenty/OpenPilates-app), which is on pause.
