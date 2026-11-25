# Plenty Flow on iPhone and iPad

Plenty Flow is one app for iPhone and iPad. It is **not on the App Store or TestFlight yet**, so for
now it is installed from a computer, the way a developer would.

> **Read this first**
>
> - **You need a computer** (Windows or Mac) and a cable. It can't be installed from the iPhone alone.
> - **It stops opening after 7 days.** A free Apple Account can only sign an app for a week. Plug the
>   phone in and install it again to keep going. your flows stay, as long as you install over the
>   top and don't delete the app first.
> - **Back up first, and often** (More → Backups → Back up now, then copy the file off the phone). If
>   the app is deleted, or signing goes wrong, a backup file is the only copy of your flows.
> - **This is unofficial.** Apple doesn't support installing apps this way, and the tools that do it
>   are made by other people, not by Plenty Flow or Apple. You sign in to them with your Apple
>   Account; use an app-specific password or a spare Apple Account if that worries you.
> - **A free Apple Account can have 3 apps installed this way at once.**
> - **This is the first version.** Tell us what breaks.

## What you need

- An iPhone or iPad on **iOS or iPadOS 15 or later**.
- A Windows 10 or 11 PC, or a Mac.
- Your Apple Account (the free kind is fine).
- The file **`plentyflow-<version>-unsigned.ipa`** from the newest release on
  [the releases page](https://github.com/d-plenty/Plentyflowpilates/releases), under Assets.

## Installing with Sideloadly (Windows or Mac)

1. On Windows, install **iTunes** and **iCloud** from Apple's website (the installers, not the
   Microsoft Store apps). Sideloadly's own page links to both.
2. Install **Sideloadly** from sideloadly.io and open it.
3. Plug the iPhone in with a cable that carries data, unlock it, and tap **Trust** on the phone.
4. Drag the `.ipa` file onto Sideloadly. Your iPhone should be named in the **iDevice** box. Type
   your Apple Account email, and press **Start**. It asks for your Apple Account password and a
   sign-in code.
5. On the iPhone: **Settings → General → VPN & Device Management**, tap your Apple Account, then **Trust**.
6. On iOS 16 or later: **Settings → Privacy & Security → Developer Mode**, turn it on. The phone restarts.
7. Open Plenty Flow.

To renew after 7 days, or to install a newer version: plug in and do step 4 again with the same
Apple Account. Don't delete Plenty Flow from the phone first.

### If Windows gets in the way

- **iCloud's installer says "missing Media features"** (a fresh Windows 11 can have them off).
  Right-click Start, choose **Terminal (Admin)**, and run these two, then restart the PC:

  ```
  DISM /Online /Enable-Feature /FeatureName:MediaPlayback /All /NoRestart
  DISM /Online /Add-Capability /CapabilityName:Media.WindowsMediaPlayer~~~~0.0.12.0
  ```

- **Sideloadly says "no devices detected"** although File Explorer shows the iPhone. With the phone
  plugged in and unlocked, open **Settings → Windows Update → Advanced options → Optional updates →
  Driver updates**, tick the lines that start with **Apple**, and install them. Unplug the phone,
  plug it back in, and press the refresh button in Sideloadly.

## Good to know

- **Backups** are made about once a day when you open the app, and go to **Files → On My iPhone →
  Plenty Flow → Plenty Flow backups**. Copy one to iCloud Drive or a computer now and then.
- **Sharing by QR code** needs both devices on the same Wi-Fi, with Plenty Flow open on both. The
  first time, iOS asks whether Plenty Flow may find devices on your local network, and for the
  camera: say yes to both. If the code won't connect (some guest and studio Wi-Fi networks stop
  devices talking to each other), share the flow as a file instead.
- **Updates**: an iPhone app installed this way can't update itself. Install the newer `.ipa` over the top.
- **iPad**: held sideways, the tabs are down the left side.
