cask "liveatc-caption" do
  version "0.3.4"
  sha256 "98326caa2733368a73f3fb3640422e530009c075912bbd1367190e6e4e983503" # Updated automatically by CI

  url "https://github.com/orriduck/liveatc-caption/releases/download/v#{version}/LiveATC.Caption-#{version}-arm64.dmg"
  name "LiveATC Caption"
  desc "Real-time ATC communication captioning app"
  homepage "https://github.com/orriduck/liveatc-caption"

  app "LiveATC Caption.app"

  zap trash: [
    "~/Library/Application Support/liveatc-caption",
    "~/Library/Preferences/com.liveatc.caption.plist",
    "~/Library/Saved Application State/com.liveatc.caption.savedState",
  ]
end
