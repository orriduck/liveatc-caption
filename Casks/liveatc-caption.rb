cask "liveatc-caption" do
  version "0.3.10"
  sha256 "d9fdb82ba54ca109793b8fe774b99c943970206fbf7328e0bf4c4ace2e889933" # Updated automatically by CI

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
