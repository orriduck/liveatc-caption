cask "adsbao" do
  version "0.4.10"
  sha256 "b0733fdf1b849ba638917b67450161f790a1acf7ab33020e7409489c9dec80d2" # Updated automatically by CI

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
