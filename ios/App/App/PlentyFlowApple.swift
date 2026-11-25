// The iPhone and iPad app's own native side. Nearly all of Plenty Flow is the web code in src/;
// this is only what a web view can't do by itself:
//
// - keeping the screen on while a class plays;
// - the Wi-Fi, for sending a class straight to another device (PlentyFlowLan.swift).
//
// The TypeScript side (src/lib/native.ts) asks whether this plugin is there and carries on
// without it when it isn't.

import Capacitor
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
        CAPPluginMethod(name: "lanStop", returnType: CAPPluginReturnPromise)
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
