# Building Plenty Flow

You need Node 22 or later. A Mac is only needed to run the app in Xcode's simulator; the iPhone
build for release is made by GitHub.

```
npm ci
npm test          # the tests
npm run build     # type-check, then build the web part into dist/
npm run dev       # the app in a browser at http://localhost:5173
```

In a browser everything works except sending by QR code over Wi-Fi (that needs the native side) and
the Files app; data is kept in the browser's storage.

## How it is put together

- `src/engine/` is the planning engine: vocabulary, analysis, drafting and the drawn figures. It started
  life in OpenPilates Server.
- `src/library/` is the movement library (one JSON file per movement) and the ready-built series.
- `src/lib/` is the app's data: what is kept (`types.ts`), cleaning anything that comes in
  (`clean.ts`), the store (`store.ts`), storage on the device (`storage.ts`), files and backups
  (`files.ts`), sending over Wi-Fi (`send.ts`).
- `src/ui/` is the screens (React).
- `ios/` is the Xcode project. Capacitor wraps the web part; `ios/App/App/PlentyFlowApple.swift` and
  `PlentyFlowLan.swift` are the only native code (screen awake, and the Wi-Fi for sending).
- `test/` is the tests.

Everything the app keeps is one JSON document, saved to the app's storage a moment after each change,
with the previous copy kept beside it.

## The iPhone and iPad build

`.github/workflows/ios.yml` builds an unsigned `.ipa` on one of GitHub's Macs:

- by hand: **Actions → iPhone app → Run workflow**, then download `plentyflow-iphone-unsigned` from the run;
- on a release: publishing a GitHub release attaches `plentyflow-<version>-unsigned.ipa` to it.

Installing that file is in [docs/IPHONE.md](docs/IPHONE.md).

On a Mac: `npm run ios:sync`, then open `ios/App/App.xcodeproj` in Xcode.

## Releasing

1. Set the version in `package.json` and add it to `CHANGELOG.md`.
2. `npm test && npm run build`.
3. Commit, tag `v<version>`, push, and publish a GitHub release for the tag. The `.ipa` is attached
   a few minutes later.
