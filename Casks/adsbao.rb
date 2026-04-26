cask "adsbao" do
  version "0.4.13"
  sha256 "810a927c59763adfd4d4ad9d7d8422337e8906ef13612617f6df6c1c208a7e27" # Updated automatically by CI

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
