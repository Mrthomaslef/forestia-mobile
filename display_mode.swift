import CoreGraphics
let a = CommandLine.arguments
let w = Int(a[1])!, h = Int(a[2])!
let d = CGMainDisplayID()
let opts = [kCGDisplayShowDuplicateLowResolutionModes: true] as CFDictionary
let modes = (CGDisplayCopyAllDisplayModes(d, opts) as! [CGDisplayMode]).filter { $0.width == w && $0.height == h && $0.pixelWidth == w && $0.isUsableForDesktopGUI() }
guard let m = modes.first else { print("mode introuvable"); exit(1) }
var cfg: CGDisplayConfigRef?
CGBeginDisplayConfiguration(&cfg)
CGConfigureDisplayWithDisplayMode(cfg, d, m, nil)
print("result", CGCompleteDisplayConfiguration(cfg, .permanently).rawValue)
