cask "adsbao" do
  version "0.4.7"
  sha256 "5ed5b3483eed64bd1aadc4e0ef2d2e4dfbb21a841dbf7d8bbf1cd92f73e5a0da" # Updated automatically by CI

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
