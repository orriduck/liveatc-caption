cask "adsbao" do
  version "0.4.3"
  sha256 "ca90b02bdfc5ff5113083f10280e62be9fc7cb603a188c0bfafe73497203d312" # Updated automatically by CI

  url "https://github.com/orriduck/ADSBao/releases/download/v#{version}/ADSBao-#{version}-arm64.dmg"
  name "ADSBao"
  desc "Real-time ATC communication captioning app"
  homepage "https://github.com/orriduck/ADSBao"

  app "ADSBao.app"

  zap trash: [
    "~/Library/Application Support/ADSBao",
    "~/Library/Preferences/com.adsbao.app.plist",
    "~/Library/Saved Application State/com.adsbao.app.savedState",
    "~/Library/Application Support/liveatc-caption",
    "~/Library/Preferences/com.liveatc.caption.plist",
    "~/Library/Saved Application State/com.liveatc.caption.savedState",
  ]
end
