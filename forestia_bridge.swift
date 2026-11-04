import AppKit
import CoreGraphics
import CoreImage
import CoreMedia
import Foundation
import ImageIO
import Network
import ScreenCaptureKit
import UniformTypeIdentifiers

final class StreamState: @unchecked Sendable {
    static let shared = StreamState()

    private let lock = NSLock()
    private var latestJPEG: Data = Data()
    private var frameIndex: UInt64 = 0
    private var latestWindowBounds: CGRect = CGRect(x: 0, y: 0, width: 960, height: 748)
    private var latestPID: pid_t = 0
    private var audioRing: [(seq: UInt64, data: Data)] = []
    private var audioSeq: UInt64 = 0

    func updateFrame(_ jpeg: Data, bounds: CGRect, pid: pid_t) {
        lock.lock()
        latestJPEG = jpeg
        frameIndex &+= 1
        if bounds.width > 200 {
            latestWindowBounds = bounds
        }
        if pid > 0 {
            latestPID = pid
        }
        lock.unlock()
    }

    func getFrame() -> (jpeg: Data, index: UInt64, bounds: CGRect, pid: pid_t) {
        lock.lock()
        defer { lock.unlock() }
        return (latestJPEG, frameIndex, latestWindowBounds, latestPID)
    }

    func pushAudio(_ pcmData: Data) {
        lock.lock()
        audioSeq &+= 1
        audioRing.append((seq: audioSeq, data: pcmData))
        if audioRing.count > 120 {
            audioRing.removeFirst(audioRing.count - 120)
        }
        lock.unlock()
    }

    func getAudioChunks(after seq: UInt64) -> (nextSeq: UInt64, combined: Data) {
        lock.lock()
        defer { lock.unlock() }
        guard let last = audioRing.last else {
            return (seq, Data())
        }
        if seq == 0 {
            // Return last ~3 chunks to prime playback with minimal latency
            let recent = audioRing.suffix(3)
            var out = Data()
            for item in recent { out.append(item.data) }
            return (last.seq, out)
        }
        var out = Data()
        for item in audioRing where item.seq > seq {
            out.append(item.data)
        }
        return (last.seq, out)
    }
}

final class CaptureEngine: NSObject, SCStreamOutput, SCStreamDelegate {
    private var stream: SCStream?
    private let ciContext = CIContext(options: [.useSoftwareRenderer: false])
    private let videoQueue = DispatchQueue(label: "forestia.video", qos: .userInteractive)
    private let audioQueue = DispatchQueue(label: "forestia.audio", qos: .userInteractive)
    private var currentWindowID: CGWindowID = 0
    private var currentBounds: CGRect = .zero
    private var currentPID: pid_t = 0
    private var isStarting = false
    private var lastFrameTime: CFAbsoluteTime = 0

    func startMonitor() {
        Timer.scheduledTimer(withTimeInterval: 2.0, repeats: true) { [weak self] _ in
            self?.ensureStream()
        }
        ensureStream()
    }

    func ensureStream() {
        if isStarting { return }
        // Refresh window bounds from CGWindowList
        let opts = CGWindowListOption(arrayLiteral: .optionOnScreenOnly, .excludeDesktopElements)
        if let list = CGWindowListCopyWindowInfo(opts, kCGNullWindowID) as? [[String: Any]] {
            for w in list {
                if let owner = w[kCGWindowOwnerName as String] as? String,
                   owner.lowercased().contains("dosbox"),
                   let b = w[kCGWindowBounds as String] as? [String: CGFloat],
                   let h = b["Height"], h > 400,
                   let wid = w[kCGWindowNumber as String] as? CGWindowID,
                   let pid = w[kCGWindowOwnerPID as String] as? pid_t {
                    let rect = CGRect(x: b["X"] ?? 0, y: b["Y"] ?? 0, width: b["Width"] ?? 960, height: h)
                    currentBounds = rect
                    currentPID = pid
                    if stream != nil && wid == currentWindowID && (CFAbsoluteTimeGetCurrent() - lastFrameTime) < 4.0 {
                        return
                    }
                }
            }
        }

        isStarting = true
        SCShareableContent.getExcludingDesktopWindows(false, onScreenWindowsOnly: true) { [weak self] content, _ in
            guard let self = self else { return }
            guard let win = content?.windows.first(where: {
                ($0.owningApplication?.applicationName.lowercased().contains("dosbox") ?? false) && $0.frame.height > 400
            }) else {
                self.isStarting = false
                self.launchForestiaIfNeeded()
                return
            }

            self.currentWindowID = win.windowID
            self.currentBounds = win.frame
            self.currentPID = win.owningApplication?.processID ?? 0

            let filter = SCContentFilter(desktopIndependentWindow: win)
            let cfg = SCStreamConfiguration()
            cfg.width = Int(win.frame.width)
            cfg.height = Int(win.frame.height)
            cfg.minimumFrameInterval = CMTime(value: 1, timescale: 30)
            cfg.queueDepth = 3
            cfg.showsCursor = true
            cfg.capturesAudio = true
            cfg.sampleRate = 48000
            cfg.channelCount = 2

            if let old = self.stream {
                old.stopCapture { _ in }
                self.stream = nil
            }

            let newStream = SCStream(filter: filter, configuration: cfg, delegate: self)
            do {
                try newStream.addStreamOutput(self, type: .screen, sampleHandlerQueue: self.videoQueue)
                try newStream.addStreamOutput(self, type: .audio, sampleHandlerQueue: self.audioQueue)
                newStream.startCapture { err in
                    self.isStarting = false
                    if err == nil {
                        self.lastFrameTime = CFAbsoluteTimeGetCurrent()
                        self.stream = newStream
                    }
                }
            } catch {
                self.isStarting = false
            }
        }
    }

    private var lastLaunchAttempt: CFAbsoluteTime = 0
    func launchForestiaIfNeeded() {
        let now = CFAbsoluteTimeGetCurrent()
        if now - lastLaunchAttempt < 12.0 { return }
        lastLaunchAttempt = now
        let check = Process()
        check.executableURL = URL(fileURLWithPath: "/usr/bin/pgrep")
        check.arguments = ["-f", "DOSBoxPure"]
        try? check.run()
        check.waitUntilExit()
        if check.terminationStatus != 0 {
            let p = Process()
            p.executableURL = URL(fileURLWithPath: "/bin/bash")
            p.arguments = ["/Users/thomaslefevre/.t3/projects/forestia-mobile/lancer_forestia.sh"]
            try? p.run()
        }
    }

    func stream(_ stream: SCStream, didOutputSampleBuffer sampleBuffer: CMSampleBuffer, of type: SCStreamOutputType) {
        guard sampleBuffer.isValid else { return }
        if type == .screen {
            guard let pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }
            lastFrameTime = CFAbsoluteTimeGetCurrent()
            let ciImage = CIImage(cvPixelBuffer: pixelBuffer)
            let fullExtent = ciImage.extent
            // Crop 28px macOS titlebar from top (in CIImage coordinates, y=0 is bottom, so top 28px is height - 28)
            let titleBarH: CGFloat = fullExtent.height > 720 ? (fullExtent.height - 720) : 0
            let cropRect = CGRect(x: 0, y: 0, width: fullExtent.width, height: fullExtent.height - titleBarH)
            let cropped = ciImage.cropped(to: cropRect)
            guard let cgImage = ciContext.createCGImage(cropped, from: cropRect) else { return }

            let mutableData = CFDataCreateMutable(nil, 0)!
            if let dest = CGImageDestinationCreateWithData(mutableData, UTType.jpeg.identifier as CFString, 1, nil) {
                let opts: [CFString: Any] = [kCGImageDestinationLossyCompressionQuality: 0.72]
                CGImageDestinationAddImage(dest, cgImage, opts as CFDictionary)
                if CGImageDestinationFinalize(dest) {
                    let data = mutableData as Data
                    StreamState.shared.updateFrame(data, bounds: currentBounds, pid: currentPID)
                }
            }
        } else if type == .audio {
            let numSamples = CMSampleBufferGetNumSamples(sampleBuffer)
            if numSamples <= 0 { return }
            guard let blockBuffer = CMSampleBufferGetDataBuffer(sampleBuffer) else { return }
            let totalLen = CMBlockBufferGetDataLength(blockBuffer)
            if totalLen <= 0 { return }
            var rawBytes = [UInt8](repeating: 0, count: totalLen)
            let status = CMBlockBufferCopyDataBytes(blockBuffer, atOffset: 0, dataLength: totalLen, destination: &rawBytes)
            if status == kCMBlockBufferNoErr {
                let floatCount = totalLen / MemoryLayout<Float>.size
                if floatCount >= numSamples * 2 {
                    rawBytes.withUnsafeBytes { rawBuf in
                        let floats = rawBuf.bindMemory(to: Float.self)
                        var pcm16 = [Int16](repeating: 0, count: numSamples * 2)
                        for i in 0..<numSamples {
                            let l = max(-1.0, min(1.0, floats[i]))
                            let r = max(-1.0, min(1.0, floats[numSamples + i]))
                            pcm16[i * 2] = Int16(l * 32767.0)
                            pcm16[i * 2 + 1] = Int16(r * 32767.0)
                        }
                        let data = pcm16.withUnsafeBufferPointer { Data(buffer: $0) }
                        StreamState.shared.pushAudio(data)
                    }
                }
            }
        }
    }
}

enum InputInjector {
    static func refreshBounds() -> (bounds: CGRect, pid: pid_t) {
        let opts = CGWindowListOption(arrayLiteral: .optionOnScreenOnly, .excludeDesktopElements)
        if let list = CGWindowListCopyWindowInfo(opts, kCGNullWindowID) as? [[String: Any]] {
            for w in list {
                if let owner = w[kCGWindowOwnerName as String] as? String,
                   owner.lowercased().contains("dosbox"),
                   let b = w[kCGWindowBounds as String] as? [String: CGFloat],
                   let h = b["Height"], h > 400,
                   let pid = w[kCGWindowOwnerPID as String] as? pid_t {
                    return (CGRect(x: b["X"] ?? 0, y: b["Y"] ?? 0, width: b["Width"] ?? 960, height: h), pid)
                }
            }
        }
        let state = StreamState.shared.getFrame()
        return (state.bounds, state.pid)
    }

    static func sendMouse(action: String, nx: Double, ny: Double, button: String = "left") {
        let info = refreshBounds()
        if info.pid > 0 {
            let app = NSRunningApplication(processIdentifier: info.pid)
            if app?.isActive == false {
                app?.activate()
                usleep(25000)
            }
        }
        let titleBarH: CGFloat = info.bounds.height > 720 ? (info.bounds.height - 720) : 28
        let contentW = info.bounds.width
        let contentH = info.bounds.height - titleBarH
        let clampedX = max(0.0, min(1.0, CGFloat(nx)))
        let clampedY = max(0.0, min(1.0, CGFloat(ny)))
        let pt = CGPoint(
            x: info.bounds.origin.x + clampedX * contentW,
            y: info.bounds.origin.y + titleBarH + clampedY * contentH
        )

        let isRight = (button == "right")
        let btn: CGMouseButton = isRight ? .right : .left
        let downType: CGEventType = isRight ? .rightMouseDown : .leftMouseDown
        let upType: CGEventType = isRight ? .rightMouseUp : .leftMouseUp
        let dragType: CGEventType = isRight ? .rightMouseDragged : .leftMouseDragged

        switch action {
        case "move":
            CGEvent(mouseEventSource: nil, mouseType: .mouseMoved, mouseCursorPosition: pt, mouseButton: .left)?.post(tap: .cghidEventTap)
        case "down":
            CGEvent(mouseEventSource: nil, mouseType: .mouseMoved, mouseCursorPosition: pt, mouseButton: .left)?.post(tap: .cghidEventTap)
            usleep(8000)
            CGEvent(mouseEventSource: nil, mouseType: downType, mouseCursorPosition: pt, mouseButton: btn)?.post(tap: .cghidEventTap)
        case "up":
            CGEvent(mouseEventSource: nil, mouseType: upType, mouseCursorPosition: pt, mouseButton: btn)?.post(tap: .cghidEventTap)
        case "drag":
            CGEvent(mouseEventSource: nil, mouseType: dragType, mouseCursorPosition: pt, mouseButton: btn)?.post(tap: .cghidEventTap)
        case "click":
            CGEvent(mouseEventSource: nil, mouseType: .mouseMoved, mouseCursorPosition: pt, mouseButton: .left)?.post(tap: .cghidEventTap)
            usleep(12000)
            CGEvent(mouseEventSource: nil, mouseType: downType, mouseCursorPosition: pt, mouseButton: btn)?.post(tap: .cghidEventTap)
            usleep(35000)
            CGEvent(mouseEventSource: nil, mouseType: upType, mouseCursorPosition: pt, mouseButton: btn)?.post(tap: .cghidEventTap)
        case "dblclick":
            CGEvent(mouseEventSource: nil, mouseType: .mouseMoved, mouseCursorPosition: pt, mouseButton: .left)?.post(tap: .cghidEventTap)
            usleep(12000)
            for clickNum in 1...2 {
                let d = CGEvent(mouseEventSource: nil, mouseType: downType, mouseCursorPosition: pt, mouseButton: btn)
                d?.setIntegerValueField(.mouseEventClickState, value: Int64(clickNum))
                d?.post(tap: .cghidEventTap)
                usleep(25000)
                let u = CGEvent(mouseEventSource: nil, mouseType: upType, mouseCursorPosition: pt, mouseButton: btn)
                u?.setIntegerValueField(.mouseEventClickState, value: Int64(clickNum))
                u?.post(tap: .cghidEventTap)
                usleep(25000)
            }
        default:
            break
        }
    }

    static func sendKey(keyCode: CGKeyCode, ctrl: Bool = false, alt: Bool = false) {
        let info = refreshBounds()
        if info.pid > 0 {
            let app = NSRunningApplication(processIdentifier: info.pid)
            if app?.isActive == false {
                app?.activate()
                usleep(25000)
            }
        }
        var flags: CGEventFlags = []
        if ctrl { flags.insert(.maskControl) }
        if alt { flags.insert(.maskAlternate) }

        if let down = CGEvent(keyboardEventSource: nil, virtualKey: keyCode, keyDown: true),
           let up = CGEvent(keyboardEventSource: nil, virtualKey: keyCode, keyDown: false) {
            down.flags = flags
            up.flags = flags
            down.post(tap: .cghidEventTap)
            usleep(35000)
            up.post(tap: .cghidEventTap)
        }
    }
}

final class HTTPServer {
    private var listener: NWListener?
    private let queue = DispatchQueue(label: "forestia.http", attributes: .concurrent)

    func start(port: UInt16) {
        do {
            let params = NWParameters.tcp
            params.allowLocalEndpointReuse = true
            listener = try NWListener(using: params, on: NWEndpoint.Port(rawValue: port)!)
            listener?.newConnectionHandler = { [weak self] conn in
                self?.handleConnection(conn)
            }
            listener?.start(queue: queue)
            print("Forestia Bridge listening on http://0.0.0.0:\(port)")
        } catch {
            print("Failed to start listener:", error)
        }
    }

    private func handleConnection(_ conn: NWConnection) {
        conn.start(queue: queue)
        conn.receive(minimumIncompleteLength: 1, maximumLength: 65536) { [weak self] data, _, _, err in
            guard let self = self, let data = data, err == nil,
                  let reqStr = String(data: data, encoding: .utf8) else {
                conn.cancel()
                return
            }
            self.routeRequest(reqStr, rawData: data, conn: conn)
        }
    }

    private func routeRequest(_ req: String, rawData: Data, conn: NWConnection) {
        let lines = req.components(separatedBy: "\r\n")
        guard let firstLine = lines.first else { conn.cancel(); return }
        let parts = firstLine.components(separatedBy: " ")
        guard parts.count >= 2 else { conn.cancel(); return }
        let method = parts[0]
        let fullPath = parts[1]

        let urlComps = URLComponents(string: "http://localhost" + fullPath)
        let path = urlComps?.path ?? "/"
        let queryItems = urlComps?.queryItems ?? []
        func q(_ name: String) -> String? {
            queryItems.first(where: { $0.name == name })?.value
        }

        if method == "OPTIONS" {
            sendResponse(conn: conn, status: "204 No Content", contentType: "text/plain", body: Data())
            return
        }

        switch path {
        case "/api/status":
            let st = StreamState.shared.getFrame()
            let json: [String: Any] = [
                "ok": true,
                "running": st.pid > 0 && !st.jpeg.isEmpty,
                "pid": st.pid,
                "frameIndex": st.index,
                "width": 960,
                "height": 720
            ]
            let body = (try? JSONSerialization.data(withJSONObject: json)) ?? Data()
            sendResponse(conn: conn, status: "200 OK", contentType: "application/json", body: body)

        case "/api/frame.jpg":
            let st = StreamState.shared.getFrame()
            if st.jpeg.isEmpty {
                sendResponse(conn: conn, status: "503 Service Unavailable", contentType: "text/plain", body: Data("Starting".utf8))
            } else {
                sendResponse(conn: conn, status: "200 OK", contentType: "image/jpeg", body: st.jpeg, extraHeaders: [
                    "X-Frame-Index: \(st.index)"
                ])
            }

        case "/api/stream.mjpeg":
            startMJPEGStream(conn: conn)

        case "/api/audio.pcm":
            let afterSeq = UInt64(q("after") ?? "0") ?? 0
            let res = StreamState.shared.getAudioChunks(after: afterSeq)
            sendResponse(conn: conn, status: "200 OK", contentType: "application/octet-stream", body: res.combined, extraHeaders: [
                "X-Audio-Seq: \(res.nextSeq)",
                "Access-Control-Expose-Headers: X-Audio-Seq, X-Frame-Index"
            ])

        case "/api/input":
            var params: [String: String] = [:]
            for item in queryItems {
                if let v = item.value { params[item.name] = v }
            }
            if method == "POST", let bodyRange = req.range(of: "\r\n\r\n") {
                let bodyStr = String(req[bodyRange.upperBound...])
                if let bodyData = bodyStr.data(using: .utf8),
                   let json = try? JSONSerialization.jsonObject(with: bodyData) as? [String: Any] {
                    for (k, v) in json { params[k] = "\(v)" }
                }
            }
            let type = params["type"] ?? "mouse"
            if type == "mouse" {
                let action = params["action"] ?? "click"
                let nx = Double(params["x"] ?? "0.5") ?? 0.5
                let ny = Double(params["y"] ?? "0.5") ?? 0.5
                let button = params["button"] ?? "left"
                DispatchQueue.global(qos: .userInteractive).async {
                    InputInjector.sendMouse(action: action, nx: nx, ny: ny, button: button)
                }
            } else if type == "key" {
                let key = params["key"] ?? "escape"
                let map: [String: (CGKeyCode, Bool, Bool)] = [
                    "escape": (53, false, false),
                    "enter": (36, false, false),
                    "space": (49, false, false),
                    "up": (126, false, false),
                    "down": (125, false, false),
                    "left": (123, false, false),
                    "right": (124, false, false),
                    "quicksave": (96, true, false),   // Ctrl + F5
                    "quickload": (101, true, false),  // Ctrl + F9
                    "fastforward": (99, true, false), // Ctrl + F3
                    "menu": (111, true, false)        // Ctrl + F12
                ]
                if let (code, ctrl, alt) = map[key] {
                    DispatchQueue.global(qos: .userInteractive).async {
                        InputInjector.sendKey(keyCode: code, ctrl: ctrl, alt: alt)
                    }
                }
            } else if type == "restart" {
                DispatchQueue.global().async {
                    let p = Process()
                    p.executableURL = URL(fileURLWithPath: "/usr/bin/killall")
                    p.arguments = ["DOSBoxPure"]
                    try? p.run()
                    p.waitUntilExit()
                    usleep(500000)
                    let l = Process()
                    l.executableURL = URL(fileURLWithPath: "/bin/bash")
                    l.arguments = ["/Users/thomaslefevre/.t3/projects/forestia-mobile/lancer_forestia.sh"]
                    try? l.run()
                }
            }
            let resp = Data("{\"ok\":true}".utf8)
            sendResponse(conn: conn, status: "200 OK", contentType: "application/json", body: resp)

        default:
            let baseDir = "/Users/thomaslefevre/.t3/projects/forestia-mobile"
            let routes: [String: (String, String)] = [
                "/": ("\(baseDir)/index.html", "text/html; charset=utf-8"),
                "/index.html": ("\(baseDir)/index.html", "text/html; charset=utf-8"),
                "/manifest.json": ("\(baseDir)/manifest.json", "application/json; charset=utf-8"),
                "/endpoint.json": ("\(baseDir)/endpoint.json", "application/json; charset=utf-8"),
                "/assets/icon.svg": ("\(baseDir)/assets/icon.svg", "image/svg+xml")
            ]
            if let (filePath, mime) = routes[path], let fileData = try? Data(contentsOf: URL(fileURLWithPath: filePath)) {
                sendResponse(conn: conn, status: "200 OK", contentType: mime, body: fileData)
            } else {
                sendResponse(conn: conn, status: "404 Not Found", contentType: "text/plain", body: Data("Not Found".utf8))
            }
        }
    }

    private func sendResponse(conn: NWConnection, status: String, contentType: String, body: Data, extraHeaders: [String] = []) {
        var headers = [
            "HTTP/1.1 \(status)",
            "Content-Type: \(contentType)",
            "Content-Length: \(body.count)",
            "Access-Control-Allow-Origin: *",
            "Access-Control-Allow-Methods: GET, POST, OPTIONS",
            "Access-Control-Allow-Headers: Content-Type, Accept, Cache-Control",
            "Access-Control-Allow-Private-Network: true",
            "Cache-Control: no-store, no-cache, must-revalidate, max-age=0",
            "Connection: close"
        ]
        headers.append(contentsOf: extraHeaders)
        let headerData = Data((headers.joined(separator: "\r\n") + "\r\n\r\n").utf8)
        var payload = headerData
        payload.append(body)
        conn.send(content: payload, completion: .contentProcessed { _ in
            conn.cancel()
        })
    }

    private func startMJPEGStream(conn: NWConnection) {
        let headers = [
            "HTTP/1.1 200 OK",
            "Content-Type: multipart/x-mixed-replace; boundary=frame",
            "Access-Control-Allow-Origin: *",
            "Access-Control-Allow-Private-Network: true",
            "Cache-Control: no-store, no-cache, must-revalidate, max-age=0",
            "Connection: close",
            "\r\n"
        ].joined(separator: "\r\n")

        conn.send(content: Data(headers.utf8), completion: .contentProcessed { err in
            if err != nil { conn.cancel(); return }
            self.pushMJPEGFrame(conn: conn, lastIndex: 0)
        })
    }

    private func pushMJPEGFrame(conn: NWConnection, lastIndex: UInt64) {
        queue.asyncAfter(deadline: .now() + 0.033) { [weak self] in
            guard let self = self else { return }
            let st = StreamState.shared.getFrame()
            if st.jpeg.isEmpty || st.index == lastIndex {
                self.pushMJPEGFrame(conn: conn, lastIndex: lastIndex)
                return
            }
            var chunk = Data("--frame\r\nContent-Type: image/jpeg\r\nContent-Length: \(st.jpeg.count)\r\n\r\n".utf8)
            chunk.append(st.jpeg)
            chunk.append(Data("\r\n".utf8))
            conn.send(content: chunk, completion: .contentProcessed { err in
                if err != nil {
                    conn.cancel()
                } else {
                    self.pushMJPEGFrame(conn: conn, lastIndex: st.index)
                }
            })
        }
    }
}

let app = NSApplication.shared
app.setActivationPolicy(.accessory)

let engine = CaptureEngine()
engine.startMonitor()

let server = HTTPServer()
server.start(port: 8790)

RunLoop.main.run()
