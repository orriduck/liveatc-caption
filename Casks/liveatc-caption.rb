cask "liveatc-caption" do
  version "0.3.14"
  sha256 "62da78445eab1d8a306a18c2087113b99701cf8b53057711acb5cf524f8ed0a9" # Updated automatically by CI

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
