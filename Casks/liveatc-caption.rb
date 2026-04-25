cask "liveatc-caption" do
  version "0.3.12"
  sha256 "ef7afb783e48cacb939a8b02f848473fb2096bda0de1187d84c8fc6448bb0fc4" # Updated automatically by CI

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
