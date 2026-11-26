// The iPhone and iPad app's own native side. Nearly all of Plenty Flow is the web code in src/;
// this is only what a web view can't do by itself:
//
// - keeping the screen on while a class plays;
// - the Wi-Fi, for sending a class straight to another device and syncing your own devices
//   (PlentyFlowLan.swift);
// - copying shifts and classes into the iPhone's Calendar app, one way, in a calendar of its own;
// - switching the app icon (Settings → Look and colours).
//
// The TypeScript side (src/lib/native.ts) asks whether this plugin is there and carries on
// without it when it isn't.

import Capacitor
import EventKit
import Foundation
import UIKit

/// The app's own view controller: Capacitor's, plus this app's plugin.
class PlentyFlowViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(PlentyFlowApplePlugin())
    }
}

@objc(PlentyFlowApplePlugin)
public class PlentyFlowApplePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "PlentyFlowApplePlugin"
    public let jsName = "PlentyFlowApple"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "info", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "keepAwake", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "lanInfo", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "lanDial", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "lanAsk", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "lanClose", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "lanListen", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "lanReply", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "lanStop", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "lanAdvertise", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "lanUnadvertise", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "lanBrowse", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "calendarAccess", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "calendarSync", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "calendarRemove", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "appIcon", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setAppIcon", returnType: CAPPluginReturnPromise)
    ]

    @objc func info(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            call.resolve([
                "version": 1,
                "pad": UIDevice.current.userInterfaceIdiom == .pad,
                "system": UIDevice.current.systemVersion,
                "name": UIDevice.current.name
            ])
        }
    }

    /// Stops the screen dimming and locking (Play). Turned off again when the class ends.
    @objc func keepAwake(_ call: CAPPluginCall) {
        let on = call.getBool("on") ?? false
        DispatchQueue.main.async {
            UIApplication.shared.isIdleTimerDisabled = on
            call.resolve()
        }
    }
}

// MARK: the iPhone's Calendar app

private let calendarStore = EKEventStore()
private let calendarTitle = "Plenty Flow"

extension PlentyFlowApplePlugin {
    @objc func calendarAccess(_ call: CAPPluginCall) {
        let done: (Bool, Error?) -> Void = { granted, _ in
            call.resolve(["granted": granted])
        }
        if #available(iOS 17.0, *) {
            calendarStore.requestFullAccessToEvents(completion: done)
        } else {
            calendarStore.requestAccess(to: .event, completion: done)
        }
    }

    /// The app's own calendar, made the first time it's needed.
    private func plentyCalendar(create: Bool) -> EKCalendar? {
        if let found = calendarStore.calendars(for: .event).first(where: { $0.title == calendarTitle && $0.allowsContentModifications }) {
            return found
        }
        if !create {
            return nil
        }
        let calendar = EKCalendar(for: .event, eventStore: calendarStore)
        calendar.title = calendarTitle
        calendar.cgColor = UIColor(red: 0.12, green: 0.37, blue: 0.55, alpha: 1).cgColor
        let sources = calendarStore.sources
        guard let source = calendarStore.defaultCalendarForNewEvents?.source
            ?? sources.first(where: { $0.sourceType == .local })
            ?? sources.first(where: { $0.sourceType == .calDAV }) else {
            return nil
        }
        calendar.source = source
        do {
            try calendarStore.saveCalendar(calendar, commit: true)
        } catch {
            return nil
        }
        return calendar
    }

    /// Replaces what's in the app's own calendar (from 60 days back) with the events given.
    /// Each event: title, start and end as local "yyyy-MM-ddTHH:mm", and notes and location if any.
    @objc func calendarSync(_ call: CAPPluginCall) {
        let events = call.getArray("events") ?? []
        DispatchQueue.global(qos: .utility).async {
            guard let calendar = self.plentyCalendar(create: true) else {
                call.reject("Calendar isn't available.")
                return
            }
            let from = Date().addingTimeInterval(-60 * 86400)
            let to = Date().addingTimeInterval(800 * 86400)
            let old = calendarStore.events(matching: calendarStore.predicateForEvents(withStart: from, end: to, calendars: [calendar]))
            for event in old {
                try? calendarStore.remove(event, span: .thisEvent, commit: false)
            }
            let format = DateFormatter()
            format.locale = Locale(identifier: "en_US_POSIX")
            format.timeZone = TimeZone.current
            format.dateFormat = "yyyy-MM-dd'T'HH:mm"
            var added = 0
            for value in events {
                guard let item = value as? JSObject,
                      let title = item["title"] as? String,
                      let startText = item["start"] as? String,
                      let endText = item["end"] as? String,
                      let start = format.date(from: startText),
                      let end = format.date(from: endText) else {
                    continue
                }
                let event = EKEvent(eventStore: calendarStore)
                event.calendar = calendar
                event.title = title
                event.startDate = start
                event.endDate = end
                if let notes = item["notes"] as? String, !notes.isEmpty {
                    event.notes = notes
                }
                if let place = item["location"] as? String, !place.isEmpty {
                    event.location = place
                }
                do {
                    try calendarStore.save(event, span: .thisEvent, commit: false)
                    added += 1
                } catch {
                    continue
                }
            }
            do {
                try calendarStore.commit()
                call.resolve(["added": added])
            } catch {
                call.reject("Couldn't save to Calendar.")
            }
        }
    }

    /// Turning it off takes the app's calendar away again.
    @objc func calendarRemove(_ call: CAPPluginCall) {
        DispatchQueue.global(qos: .utility).async {
            if let calendar = self.plentyCalendar(create: false) {
                try? calendarStore.removeCalendar(calendar, commit: true)
            }
            call.resolve()
        }
    }
}

// MARK: the app icon

extension PlentyFlowApplePlugin {
    /// Which icon is showing: the icon set's name (AppIcon-teal), or "" for the app's own.
    @objc func appIcon(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            call.resolve([
                "can": UIApplication.shared.supportsAlternateIcons,
                "name": UIApplication.shared.alternateIconName ?? ""
            ])
        }
    }

    /// Switches the icon. iOS always shows its own message saying the icon changed.
    /// An empty name goes back to the app's own icon.
    @objc func setAppIcon(_ call: CAPPluginCall) {
        let raw = call.getString("name") ?? ""
        let name: String? = raw.isEmpty ? nil : raw
        DispatchQueue.main.async {
            let app = UIApplication.shared
            guard app.supportsAlternateIcons else {
                call.reject("This device can't change the app icon.")
                return
            }
            if app.alternateIconName == name {
                call.resolve(["name": raw])
                return
            }
            // Only while the app is on screen: iOS refuses (or quietly drops) a change made from
            // the background.
            guard app.applicationState == .active else {
                call.reject("Open Plenty Flow and try again.")
                return
            }
            app.setAlternateIconName(name) { error in
                if let error = error {
                    call.reject(error.localizedDescription)
                } else {
                    call.resolve(["name": app.alternateIconName ?? ""])
                }
            }
        }
    }
}
