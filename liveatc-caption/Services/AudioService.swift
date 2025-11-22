import AVFoundation
import Combine
import Foundation

class AudioService: ObservableObject {
  private var player: AVPlayer?
  @Published var isPlaying: Bool = false
  @Published var currentFeed: Feed?

  init() {
    configureAudioSession()
  }

  private func configureAudioSession() {
    do {
      try AVAudioSession.sharedInstance().setCategory(.playback, mode: .default)
      try AVAudioSession.sharedInstance().setActive(true)
    } catch {
      print("Failed to configure audio session: \(error)")
    }
  }

  func play(feed: Feed) {
    if currentFeed?.id == feed.id && isPlaying {
      pause()
      return
    }

    currentFeed = feed
    let playerItem = AVPlayerItem(url: feed.url)
    player = AVPlayer(playerItem: playerItem)
    player?.play()
    isPlaying = true
  }

  func pause() {
    player?.pause()
    isPlaying = false
  }

  func stop() {
    player?.pause()
    player = nil
    isPlaying = false
    currentFeed = nil
  }
}
