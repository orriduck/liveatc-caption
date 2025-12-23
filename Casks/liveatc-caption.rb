cask "liveatc-caption" do
  version "0.1.0"
  sha256 "3f318891676e4e09d5a52b862516e0e29592cf58163f4bef7682fbd6a7ea8c70" # Updated automatically by CI

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
