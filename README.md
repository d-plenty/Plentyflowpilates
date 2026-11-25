# Plenty Flow

**Pilates class planner.** Plan reformer and mat flows on your iPhone or iPad, then teach from them.
Made for Pilates teachers. Everything stays on your device: no account, no ads, no tracking.

**Version 0.3.0. Still early: keep backups.**

- **iPhone and iPad**: one app for both. How to install it: [docs/IPHONE.md](docs/IPHONE.md).
- **Android**: planned, not started.

## What it does

- **Your studios.** Each place you teach has its own reformers, springs, props and class types.
  A flow shows the right springs for the studio it's taught at.
- **Flows, block by block.** Pick a movement or a series, then its springs, layers, props and what
  you offer clients who need it easier or harder. Undo and redo as you go.
- **Checks as you plan**: time for each part of the class, spring changes, muscle balance, spine
  movement and props.
- **A library of 184 movements and 18 series**, each with a drawing. Change any of them or add your own.
- **Play.** One block at a time with a timer, springs and what's next. The screen stays awake.
- **Calendar.** Put a date on a flow. Finishing it in Play marks it as taught.
- **Sharing.** Send a flow to another device on the same Wi-Fi by QR code, or a flow or studio as a file.
- **Backups** about once a day, kept in the Files app, with a reminder to copy one off the device.
- **Your look**: light, dark, true black, and a choice of colours. Text size, bold text, high
  contrast, bigger buttons and less motion.

### Coming later (greyed out in the app)

Draft a flow for me · sync between your own devices · a studio server you host yourself ·
a computer version.

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
