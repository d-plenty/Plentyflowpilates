# Changelog

## 0.6.0

A Home tab, a tidier Calendar, Settings and More, movements in colour, reordering in a flow, and an
app icon you pick. Nothing about your flows, studios or calendar changes: everything from 0.5.0
comes across, and sync with a device still on 0.5.0 keeps working (settings never sync).

**Home**

- A new first tab: the welcome (moved from Flows), the classes coming up, flows still to plan for
  the next week, and the backup reminder. Quick tiles for a new flow, the calendar and movements.
- The welcome line: a new one each day (on by default), one you pick or type, or none. Add your
  own (up to 31) and delete any. During a holiday its own line shows. Look and colours → Welcome
  line, kept on each device.

**Flows and movements**

- Reorder: tap Reorder in a flow, drag a block by its handle or use the up and down arrows. Blocks
  can move to another part of the class. Undo puts it back.
- Add a block lists movements by section, A to Z in each section, with the sections for that part
  of the class first, and chips to jump to a section. The 80-movement cap is gone.
- Movements are grouped and coloured by section, with bigger pictures. "Parts of the class" for
  sorting movements is now called "Movement sections".

**Studio props**

- Every prop can be renamed, merged into another ("the same thing as": the higher count is kept,
  and movements that ask for it count the other) or taken out. Put the starting props back undoes
  the changes to the built-in ones.
- Props sit in groups: Boxes and boards, Weights, Balls, Bands and rings, Other. Props of your own
  can go in any group.
- Weights and balls have sizes: hand weights and ankle weights by the kg, small and large balls
  with a weighted one by the kg. A movement that needs hand weights is happy with any size; a block
  can ask for one size.
- Long box and Short box are now one Box (it's the same box turned long-ways or short-ways).
  Movements still say which, for their pictures. A studio's count becomes the higher of the two.
- Props of your own from before with a weight in the name (like "2kg dumbbells") move under
  Weights as a size, with their counts. "Prop names" in Class set-up is gone: it's all in Studio
  props now.
- Fixed: on iPhone each prop's count sat a line below its name, and the arrows on folding cards
  had a line of their own. Folding cards are now drawn by the app, and sheets sit on top of the
  page, not inside the screen.
- If a device still on 0.5.0 syncs, it shows a Box count as none until it's updated too.

**Settings, Calendar and More**

- Settings grouped like Restock, with coloured icons, and your name on a card you tap to change.
  Sync, Backups, Your data, What's new, Coming soon and About moved here, About at the bottom.
- Settings → Calendar holds reminders, the iPhone's Calendar app and calendar files (.ics). The
  Calendar tab keeps the week, the roster, the hours, adding a shift and saved shifts.
- More is a page of tiles: My studios, Timesheet, Settings and the Guide. Share a flow from the
  flow; bring one in from Flows → Import.

**Look**

- App icon: Plenty blue, Sunset, Teal, Plum, Berry, Olive and Charcoal, plus Christmas, New Year,
  Australia Day, Easter and Halloween icons, picked by hand in Look and colours. iOS shows its own
  message each time the icon changes. The icons are drawn in src/lib/appicon.ts; make the PNGs with
  `node scripts/app-icons.ts` (needs rsvg-convert).
- "Breathe in, plan out." on the opening, on every theme, and under the name.
- Fixed: watching an animation in Look and colours opened inside the page on iPhone, with the tab
  bar showing and an X that did nothing. It now fills the screen and closes.

## 0.5.0

A new look, dark mode throughout, and holiday themes. Nothing about your flows, studios or calendar
changes: everything from 0.4.0 comes across, and sync with a device still on 0.4.0 keeps working.

**The look**

- Refreshed like Restock: rounded cards, pill-shaped buttons, chips and search boxes, a floating tab
  bar with the current tab in a soft pill, headers on the page instead of in a bar. One set of styles
  for every screen.
- Dark mode reworked on every screen, with colours to match the night pictures. Match phone, Light
  or Dark, in Look and colours.

**The opening**

- One jump off the jump board on a beach at sunset by day, under a full moon by night (light and
  dark mode). About three and a half seconds, then the app.
- Tap the screen to skip it. With Reduce Motion (on the phone or in Accessibility) it's a still
  picture. Turn it off in Look and colours → Opening animation.
- The picture at the top of the Flows home is the same scene, still, so it uses no battery.

**Holiday themes** (on by default; turn them off in Look and colours)

- Christmas, 1–26 December: Santa's sleigh pulled by kangaroos, a decorated tree on the beach.
- New Year, 27 December – 1 January: a beach party by day, fireworks over the sea at night.
- Australia Day, 2–27 January: the flag flying, kangaroos hopping in, a barbecue on the sand.
- Easter, the four weeks before Easter Sunday to the day after Easter Monday: a meadow of eggs and
  flowers, a bunny hopping in, bunny ears on the figure.
- Halloween, 1 October – 1 November: bats, a spider web, a haunted house and jack-o'-lanterns.
- Each has a day and a night picture, its own greeting on the Flows home, and on Plenty blue its own
  colours for the buttons and bars. If you picked your own colour, you keep it.
- See any of them in Look and colours → See the animations, by day or by night.
- Looks are kept on each device and don't sync.

**Under the hood**

- The pictures are drawn in code (src/ui/art), so they stay sharp at every size and need no images.
- The stylesheet is grouped by part of the app instead of by version, with the old opening and
  unused styles removed.
- New tests for the holiday dates (Easter moves each year), the pictures and the new settings.

## 0.4.0

From Sarah's first week with Plenty Flow. Everything from 0.3.0 comes across: a flow that had a
date becomes a one-class shift on the calendar.

**Calendar: your roster**

- Add the shifts you work: a block of classes at a studio, with a class type for each.
- Saved shifts, like "Saturday mornings", for one studio or every studio. Add one to a day in a tap.
- Repeat a shift every week until a date. Delete just one, or that one and the weeks after.
- Plan a flow for each class, or fill a shift from your favourites that haven't been taught lately.
- Cancel a class or a whole shift: it stays on the calendar and drops out of your hours.
- Covering for someone: it counts in your hours and stands out, and you can bring in their flow
  straight onto the class.
- Notes after class, for next time. They're all in Your data too.
- Month, week and coming-up views, and search.
- Share or print the week's roster.
- Export and import calendar files (.ics) for Google, Outlook and Apple calendars.

**Timesheet, hours and pay (optional)**

- Hours each week and month, with a chart. Count class time only, or the whole block.
- Add a pay rate for each studio, if you want to see your pay. Share or print a month for invoices.

**Reminders and iPhone Calendar**

- A reminder before a shift (an hour by default, your choice) and the night before when a class has
  no flow yet. Tapping it opens that class.
- Add your shifts to the iPhone Calendar app, one way, in a calendar of its own.
- Calendar history is kept for 12 months by default (your choice). Flows and studios are kept forever.

**Sync your devices (new)**

- Sync your iPhones and iPads over Wi-Fi, up to 6. Pair once with a QR code, then tap Sync with the
  app open on both. A progress bar shows how it's going, and it says plainly when it can't find
  the other device.
- Every device keeps everything, and keeps it if it stops syncing. Settings stay on each device.
- It also syncs quietly when the app opens, if your other devices are open too.

**Flows**

- Favourite flows, with a star. Tabs: All, Favourites, Taught, Not taught.
- Each flow says when it was last taught and where, and when it's next on the calendar.
- An Import button next to New flow.
- The home screen shows today's and tomorrow's classes, or the shifts on a busy day.
- A flow's "On your calendar" section replaces "Planned for".

**Movements (the Library tab, renamed)**

- Favourite movements, with their own tab.
- The muscle pictures from OpenPilates Server are back, on each movement and in a flow's checks.
- Figures have a plain face, so you can see which way the head is turned.
- Add your own position or part of the class from the movement editor, for every studio or one.

**Studios**

- Duplicate a studio, or import from one when you add a new studio. Tick what to copy each time.
- A box missing something (a name) turns red, with a short line under it, instead of a message.
- "Props you own" is now Studio props. Muscles and Prop names are separate pages, and there's a new
  Positions page.
- Every level can be deleted, Beginner, Intermediate and Advanced too. Deleted ones are listed as
  examples you could add.
- Suggested class types to add in a tap.
- Lengths and timing laid out so nothing is cut off.

**More and Settings**

- Laid out like Restock, in groups, with search.
- Your data: hours this week, month and year, a chart, your class notes, and what's on the device.
- Share, import and export, each with its own section.
- Coming soon is one row. What's new shows once after each update, and stays in More.

**Behind the scenes**

- The build uses the current GitHub actions (no more Node.js 20 warning).
- Old, unused code removed.

## 0.3.0

The first Plenty Flow. A fresh start, renamed and redesigned from OpenPilates. It is a new app with
its own app ID, so it installs alongside the old one and starts empty. It doesn't read OpenPilates
files.

**A new look**

- Plenty Flow: blue, orange and white, rounded and clean, with one easy-to-read font.
- A new logo: a round badge with a reformer, a figure on the jump board and a sunset.
- Each time the app opens, the reformer does one jump, then the app starts.
- Shorter wording. Longer explanations sit behind an ⓘ.

**First open**

- Welcome, then "Set up" or "Restore from a backup".
- What happens to your data, and the fine print.
- Your name. It is used to greet you and to show who a shared flow is from. Change it in Settings.
- Then straight into the app. Everything else is set up when you need it.

**Starts empty**

- No studios to start with. A new studio has no class types, focuses, lengths or props.
- A few muscle names and parts of the class are there to start with, and "Add the standard list"
  fills in the rest.

**Flows**

- Classes are now flows: the Flows tab, New flow and the flow editor.
- The Flows tab greets you by name with the reformer and a line for the day.
- New flow with no studio says "You need a studio first", with Set up my studio or Not now.
- The first flow at a studio sets up a class type in three steps: what kind of class, how long and
  what level, and the parts of the class.
- After that, New flow asks only the class type and length. Level, focus and date are under
  More options.
- Draft for me says it is coming soon and offers to start with empty parts.

**The flow editor**

- A slim bar at the top with Back, undo, redo, share, play and Save. The title and details scroll
  away with the flow.
- An "Add a block" button floats at the bottom.
- Text in the parts of the class is no longer cut off.

**Save everywhere**

- Every editing screen has a Save button, and Back asks before you leave changes behind. This now
  includes series in the library.
- Only the flow editor has undo and redo.

**Studios**

- Class set-up lives inside each studio, not in the More tab.
- A "My usual studio" switch inside each studio.

**Backups**

- A reminder to copy a backup off the device: after your first few saves, after a lot of changes,
  and when the last copy is two weeks old. Not now holds it off for a few days.

**Removed**

- Everything for OpenPilates Server and old OpenPilates files.
