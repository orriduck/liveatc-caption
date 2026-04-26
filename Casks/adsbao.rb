cask "adsbao" do
  version "0.4.9"
  sha256 "e49e9da0b477d8f0d4c4a96151b1641843a66db54513fc8ff690ec68d9491837" # Updated automatically by CI

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
