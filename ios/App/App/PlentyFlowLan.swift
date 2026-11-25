// Plenty Flow on iPhone and iPad: the Wi-Fi, for sending a class straight to another device.
// Plain TCP connections carrying messages of 4 bytes of length and then the message. Everything in
// a message is sealed by the app before it gets here (src/lib/send.ts), so this file only moves
// bytes. The other device is told the address by the QR code on screen.
//
// iOS only lets an app listen while it is open on screen.

import Capacitor
import Foundation
import Network

/// One connection, either way round. Reads and writes whole messages.
final class PlentyFlowLanConnection {
    let id: String
    let connection: NWConnection
    private var buffer = Data()
    private var closed = false
    /// Messages bigger than this are refused.
    static let maxMessage = 32 * 1024 * 1024

    init(id: String, connection: NWConnection) {
        self.id = id
        self.connection = connection
    }

    func send(_ payload: Data, done: @escaping (Error?) -> Void) {
        var length = UInt32(payload.count).bigEndian
        var framed = Data(bytes: &length, count: 4)
        framed.append(payload)
        connection.send(content: framed, completion: .contentProcessed { error in
            done(error)
        })
    }

    /// The next whole message, or nil when the other side has gone (or sent something too big).
    func receive(done: @escaping (Data?) -> Void) {
        if let message = takeMessage() {
            done(message)
            return
        }
        if closed {
            done(nil)
            return
        }
        connection.receive(minimumIncompleteLength: 1, maximumLength: 65536) { [weak self] data, _, isComplete, error in
            guard let self = self else {
                done(nil)
                return
            }
            if let data = data, !data.isEmpty {
                self.buffer.append(data)
            }
            if error != nil || isComplete {
                self.closed = true
            }
            if self.tooBig() {
                self.closed = true
                self.buffer = Data()
                done(nil)
                return
            }
            self.receive(done: done)
        }
    }

    private func declaredLength() -> Int? {
        if buffer.count < 4 {
            return nil
        }
        let bytes = [UInt8](buffer.prefix(4))
        return (Int(bytes[0]) << 24) | (Int(bytes[1]) << 16) | (Int(bytes[2]) << 8) | Int(bytes[3])
    }

    private func tooBig() -> Bool {
        guard let length = declaredLength() else {
            return false
        }
        return length < 0 || length > PlentyFlowLanConnection.maxMessage
    }

    private func takeMessage() -> Data? {
        guard let length = declaredLength(), buffer.count >= 4 + length else {
            return nil
        }
        let message = buffer.subdata(in: (buffer.startIndex + 4)..<(buffer.startIndex + 4 + length))
        buffer = buffer.subdata(in: (buffer.startIndex + 4 + length)..<buffer.endIndex)
        return message
    }

    func close() {
        closed = true
        connection.cancel()
    }
}

/// The app's connections and its listener. Everything runs on one queue.
final class PlentyFlowLan {
    static let shared = PlentyFlowLan()
    let queue = DispatchQueue(label: "family.plenty.plentyflow.lan")
    private var outgoing: [String: PlentyFlowLanConnection] = [:]
    private var incoming: [String: PlentyFlowLanConnection] = [:]
    /// Each thing the app listens for has its own name.
    private var listeners: [String: NWListener] = [:]
    /// Which listener each incoming connection came in on.
    private var cameInOn: [String: String] = [:]
    private var counter = 0
    /// A message that arrived for the app: (listener, connection, the other phone's address, the message).
    var onMessage: ((String, String, String, Data) -> Void)?
    var onEnded: ((String, String) -> Void)?

    private func nextId(_ prefix: String) -> String {
        counter += 1
        return "\(prefix)\(counter)"
    }

    /// TCP over Wi-Fi or Ethernet only, never mobile data.
    private func parameters() -> NWParameters {
        let tcp = NWProtocolTCP.Options()
        tcp.noDelay = true
        let parameters = NWParameters(tls: nil, tcp: tcp)
        parameters.prohibitedInterfaceTypes = [.cellular]
        parameters.includePeerToPeer = false
        return parameters
    }

    private static func hostText(_ endpoint: NWEndpoint?) -> (String, Int)? {
        guard let endpoint = endpoint, case let .hostPort(host, port) = endpoint else {
            return nil
        }
        var text: String
        switch host {
        case let .ipv4(address):
            text = "\(address)"
        case let .ipv6(address):
            text = "\(address)"
        case let .name(name, _):
            text = name
        @unknown default:
            text = "\(host)"
        }
        // "192.168.1.5%en0": the address without the interface.
        if let percent = text.firstIndex(of: "%"), !text.contains(":") {
            text = String(text[text.startIndex..<percent])
        }
        return (text, Int(port.rawValue))
    }

    // MARK: asking another phone

    func dial(host: String, port: Int, timeout: TimeInterval, done: @escaping (String?, String?) -> Void) {
        guard port > 0, port < 65536, let nwPort = NWEndpoint.Port(rawValue: UInt16(port)) else {
            done(nil, "That isn't an address Plenty Flow can connect to.")
            return
        }
        let connection = NWConnection(host: NWEndpoint.Host(host), port: nwPort, using: parameters())
        let id = nextId("out")
        var answered = false
        let finish: (String?, String?) -> Void = { id, error in
            if answered {
                return
            }
            answered = true
            done(id, error)
        }
        connection.stateUpdateHandler = { [weak self] state in
            guard let self = self else {
                return
            }
            switch state {
            case .ready:
                self.outgoing[id] = PlentyFlowLanConnection(id: id, connection: connection)
                finish(id, nil)
            case let .failed(error):
                connection.cancel()
                self.outgoing[id] = nil
                finish(nil, error.localizedDescription)
            case let .waiting(error):
                // Nothing there (or not allowed on the local network): don't wait for it to appear.
                connection.cancel()
                finish(nil, error.localizedDescription)
            case .cancelled:
                self.outgoing[id] = nil
                finish(nil, "The connection was closed.")
            default:
                break
            }
        }
        connection.start(queue: queue)
        queue.asyncAfter(deadline: .now() + timeout) {
            if !answered {
                connection.cancel()
                finish(nil, "The other device didn't answer.")
            }
        }
    }

    /// One message out, its answer back.
    func ask(id: String, payload: Data, timeout: TimeInterval, done: @escaping (Data?, String?) -> Void) {
        guard let conn = outgoing[id] else {
            done(nil, "That connection has closed.")
            return
        }
        var answered = false
        let finish: (Data?, String?) -> Void = { data, error in
            if answered {
                return
            }
            answered = true
            done(data, error)
        }
        conn.send(payload) { error in
            if let error = error {
                finish(nil, error.localizedDescription)
                return
            }
            conn.receive { message in
                if let message = message {
                    finish(message, nil)
                } else {
                    finish(nil, "The other device hung up.")
                }
            }
        }
        queue.asyncAfter(deadline: .now() + timeout) { [weak self] in
            if !answered {
                conn.close()
                self?.outgoing[id] = nil
                finish(nil, "The other device took too long to answer.")
            }
        }
    }

    func close(id: String) {
        outgoing[id]?.close()
        outgoing[id] = nil
    }

    // MARK: answering other phones

    func listen(key: String, preferredPort: Int, done: @escaping (Int?, String?) -> Void) {
        if let listener = listeners[key], let port = listener.port {
            done(Int(port.rawValue), nil)
            return
        }
        stopListening(key: key)
        var made: NWListener?
        // The port asked for, or any free one (the QR code carries it).
        if preferredPort > 0, preferredPort < 65536, let preferred = NWEndpoint.Port(rawValue: UInt16(preferredPort)) {
            made = try? NWListener(using: parameters(), on: preferred)
        }
        if made == nil {
            made = try? NWListener(using: parameters())
        }
        guard let listener = made else {
            done(nil, "Plenty Flow couldn't start listening on this Wi-Fi.")
            return
        }
        var answered = false
        listener.newConnectionHandler = { [weak self] connection in
            self?.accept(connection, key: key)
        }
        listener.stateUpdateHandler = { [weak self] state in
            switch state {
            case .ready:
                if !answered {
                    answered = true
                    done(listener.port.map { Int($0.rawValue) }, nil)
                }
            case let .failed(error):
                listener.cancel()
                if self?.listeners[key] === listener {
                    self?.listeners[key] = nil
                }
                if !answered {
                    answered = true
                    done(nil, error.localizedDescription)
                }
            default:
                break
            }
        }
        listeners[key] = listener
        listener.start(queue: queue)
    }

    private func accept(_ connection: NWConnection, key: String) {
        // A few at a time.
        if incoming.count >= 6 {
            connection.cancel()
            return
        }
        let id = nextId("in")
        let conn = PlentyFlowLanConnection(id: id, connection: connection)
        incoming[id] = conn
        cameInOn[id] = key
        connection.stateUpdateHandler = { [weak self] state in
            switch state {
            case .ready:
                self?.readNext(conn)
            case .failed, .cancelled:
                self?.ended(id)
            default:
                break
            }
        }
        connection.start(queue: queue)
    }

    private func readNext(_ conn: PlentyFlowLanConnection) {
        conn.receive { [weak self] message in
            guard let self = self else {
                return
            }
            guard let message = message else {
                conn.close()
                self.ended(conn.id)
                return
            }
            let from = PlentyFlowLan.hostText(conn.connection.currentPath?.remoteEndpoint)?.0 ?? ""
            self.onMessage?(self.cameInOn[conn.id] ?? "", conn.id, from, message)
        }
    }

    /// The app's answer to a message (nil: hang up).
    func reply(id: String, payload: Data?) {
        guard let conn = incoming[id] else {
            return
        }
        guard let payload = payload else {
            conn.close()
            ended(id)
            return
        }
        conn.send(payload) { [weak self] error in
            if error != nil {
                conn.close()
                self?.ended(id)
            } else {
                self?.readNext(conn)
            }
        }
    }

    private func ended(_ id: String) {
        if incoming.removeValue(forKey: id) != nil {
            let key = cameInOn.removeValue(forKey: id) ?? ""
            onEnded?(key, id)
        }
    }

    func stopListening(key: String) {
        listeners[key]?.cancel()
        listeners[key] = nil
        let mine = cameInOn.filter { $0.value == key }.map { $0.key }
        for id in mine {
            incoming[id]?.close()
            ended(id)
        }
    }

    // MARK: being found by your other devices (Bonjour), as in Restock

    func advertise(key: String, name: String, type: String, txt: [String: String]) -> Bool {
        guard let listener = listeners[key] else {
            return false
        }
        var record = NWTXTRecord()
        for (field, value) in txt {
            record[field] = value
        }
        listener.service = NWListener.Service(name: name, type: type, domain: nil, txtRecord: record)
        return true
    }

    func unadvertise(key: String) {
        listeners[key]?.service = nil
    }

    func browse(type: String, seconds: TimeInterval, done: @escaping ([[String: Any]]) -> Void) {
        let browser = NWBrowser(for: .bonjourWithTXTRecord(type: type, domain: nil), using: parameters())
        var results: [NWBrowser.Result] = []
        browser.browseResultsChangedHandler = { found, _ in
            results = Array(found)
        }
        browser.start(queue: queue)
        queue.asyncAfter(deadline: .now() + seconds) { [weak self] in
            browser.cancel()
            guard let self = self else {
                done([])
                return
            }
            self.resolve(Array(results.prefix(12)), into: [], done: done)
        }
    }

    /// A found device's address: a short connection to it says where it is.
    private func resolve(_ left: [NWBrowser.Result], into found: [[String: Any]], done: @escaping ([[String: Any]]) -> Void) {
        guard let result = left.first else {
            done(found)
            return
        }
        let rest = Array(left.dropFirst())
        var txt: [String: String] = [:]
        if case let .bonjour(record) = result.metadata {
            txt = record.dictionary
        }
        var name = ""
        if case let .service(serviceName, _, _, _) = result.endpoint {
            name = serviceName
        }
        let connection = NWConnection(to: result.endpoint, using: parameters())
        var answered = false
        let finish: ((String, Int)?) -> Void = { [weak self] address in
            if answered {
                return
            }
            answered = true
            connection.cancel()
            var all = found
            if let address = address {
                all.append(["name": name, "host": address.0, "port": address.1, "txt": txt])
            }
            self?.resolve(rest, into: all, done: done)
        }
        connection.stateUpdateHandler = { state in
            switch state {
            case .ready:
                finish(PlentyFlowLan.hostText(connection.currentPath?.remoteEndpoint))
            case .failed, .waiting:
                finish(nil)
            default:
                break
            }
        }
        connection.start(queue: queue)
        queue.asyncAfter(deadline: .now() + 1.5) {
            finish(nil)
        }
    }

    // MARK: this device's address

    /// This device's IPv4 address on the Wi-Fi (en0), or nil.
    static func wifiAddress() -> String? {
        var address: String?
        var list: UnsafeMutablePointer<ifaddrs>?
        guard getifaddrs(&list) == 0, let first = list else {
            return nil
        }
        defer { freeifaddrs(list) }
        var pointer: UnsafeMutablePointer<ifaddrs>? = first
        while let current = pointer {
            let interface = current.pointee
            pointer = interface.ifa_next
            guard let socketAddress = interface.ifa_addr, socketAddress.pointee.sa_family == UInt8(AF_INET) else {
                continue
            }
            let name = String(cString: interface.ifa_name)
            // en0 is the Wi-Fi on iPhone and iPad; en1 and up cover Ethernet adapters.
            if !name.hasPrefix("en") {
                continue
            }
            var host = [CChar](repeating: 0, count: Int(NI_MAXHOST))
            if getnameinfo(socketAddress, socklen_t(socketAddress.pointee.sa_len), &host, socklen_t(host.count), nil, 0, NI_NUMERICHOST) == 0 {
                let text = String(cString: host)
                if !text.hasPrefix("169.254.") && (address == nil || name == "en0") {
                    address = text
                }
            }
        }
        return address
    }
}

// MARK: - The plugin's side

extension PlentyFlowApplePlugin {
    private func lanData(_ call: CAPPluginCall, _ key: String) -> Data? {
        guard let text = call.getString(key) else {
            return nil
        }
        return Data(base64Encoded: text)
    }

    @objc func lanInfo(_ call: CAPPluginCall) {
        if let address = PlentyFlowLan.wifiAddress() {
            call.resolve(["ip": address])
        } else {
            call.resolve([:])
        }
    }

    @objc func lanDial(_ call: CAPPluginCall) {
        let host = call.getString("host") ?? ""
        let port = call.getInt("port") ?? 0
        let timeout = Double(call.getInt("timeoutMs") ?? 3000) / 1000.0
        let lan = PlentyFlowLan.shared
        lan.queue.async {
            lan.dial(host: host, port: port, timeout: timeout) { id, error in
                if let id = id {
                    call.resolve(["id": id])
                } else {
                    call.reject(error ?? "Couldn't connect.")
                }
            }
        }
    }

    @objc func lanAsk(_ call: CAPPluginCall) {
        guard let id = call.getString("id"), let payload = lanData(call, "data") else {
            call.reject("Nothing to send.")
            return
        }
        let timeout = Double(call.getInt("timeoutMs") ?? 60000) / 1000.0
        let lan = PlentyFlowLan.shared
        lan.queue.async {
            lan.ask(id: id, payload: payload, timeout: timeout) { data, error in
                if let data = data {
                    call.resolve(["data": data.base64EncodedString()])
                } else {
                    call.reject(error ?? "The other device didn't answer.")
                }
            }
        }
    }

    @objc func lanClose(_ call: CAPPluginCall) {
        let id = call.getString("id") ?? ""
        let lan = PlentyFlowLan.shared
        lan.queue.async {
            lan.close(id: id)
            call.resolve()
        }
    }

    @objc func lanListen(_ call: CAPPluginCall) {
        let key = call.getString("key") ?? "send"
        let preferred = call.getInt("port") ?? 0
        let lan = PlentyFlowLan.shared
        lan.queue.async { [weak self] in
            lan.onMessage = { key, conn, from, message in
                self?.notifyListeners("lanMessage", data: ["key": key, "conn": conn, "from": from, "data": message.base64EncodedString()])
            }
            lan.onEnded = { key, conn in
                self?.notifyListeners("lanEnded", data: ["key": key, "conn": conn])
            }
            lan.listen(key: key, preferredPort: preferred) { port, error in
                if let port = port {
                    call.resolve(["port": port])
                } else {
                    call.reject(error ?? "Plenty Flow couldn't start listening on this Wi-Fi.")
                }
            }
        }
    }

    @objc func lanReply(_ call: CAPPluginCall) {
        let conn = call.getString("conn") ?? ""
        let payload = lanData(call, "data")
        let lan = PlentyFlowLan.shared
        lan.queue.async {
            lan.reply(id: conn, payload: payload)
            call.resolve()
        }
    }

    @objc func lanStop(_ call: CAPPluginCall) {
        let key = call.getString("key") ?? "send"
        let lan = PlentyFlowLan.shared
        lan.queue.async {
            lan.stopListening(key: key)
            call.resolve()
        }
    }
    @objc func lanAdvertise(_ call: CAPPluginCall) {
        let key = call.getString("key") ?? "sync"
        let name = call.getString("name") ?? "plentyflow"
        let type = call.getString("type") ?? "_plentyflow._tcp"
        var txt: [String: String] = [:]
        if let given = call.getObject("txt") {
            for (field, value) in given {
                if let text = value as? String {
                    txt[field] = text
                }
            }
        }
        let lan = PlentyFlowLan.shared
        lan.queue.async {
            if lan.advertise(key: key, name: name, type: type, txt: txt) {
                call.resolve()
            } else {
                call.reject("Plenty Flow isn't listening yet.")
            }
        }
    }

    @objc func lanUnadvertise(_ call: CAPPluginCall) {
        let key = call.getString("key") ?? "sync"
        let lan = PlentyFlowLan.shared
        lan.queue.async {
            lan.unadvertise(key: key)
            call.resolve()
        }
    }

    @objc func lanBrowse(_ call: CAPPluginCall) {
        let type = call.getString("type") ?? "_plentyflow._tcp"
        let seconds = Double(call.getInt("ms") ?? 4000) / 1000.0
        let lan = PlentyFlowLan.shared
        lan.queue.async {
            lan.browse(type: type, seconds: seconds) { found in
                call.resolve(["found": found])
            }
        }
    }
}
