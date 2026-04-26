cask "adsbao" do
  version "0.4.15"
  sha256 "82a2e5d7460a409183596972e7a8f6df49dcdd724c80ef224e843ce2fb9c2949" # Updated automatically by CI

  url "https://github.com/orriduck/ADSBao/releases/download/v#{version}/ADSBao-#{version}-arm64.dmg"
  name "ADSBao"
  desc "Airport weather and nearby aircraft monitoring app"
  homepage "https://github.com/orriduck/ADSBao"

  app "ADSBao.app"

  zap trash: [
    "~/Library/Application Support/ADSBao",
    "~/Library/Preferences/com.adsbao.app.plist",
    "~/Library/Saved Application State/com.adsbao.app.savedState",
  ]
end
