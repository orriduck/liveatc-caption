import SwiftUI

struct PlayerScreen: View {
    @EnvironmentObject var audioService: AudioService
    
    var body: some View {
        if let feed = audioService.currentFeed {
            GlassCard {
                HStack {
                    VStack(alignment: .leading) {
                        Text(feed.name)
                            .font(.headline)
                            .foregroundColor(.white)
                        Text(feed.frequency)
                            .font(.caption)
                            .foregroundColor(.white.opacity(0.7))
                    }
                    
                    Spacer()
                    
                    Button(action: {
                        if audioService.isPlaying {
                            audioService.pause()
                        } else {
                            audioService.play(feed: feed)
                        }
                    }) {
                        Image(systemName: audioService.isPlaying ? "pause.fill" : "play.fill")
                            .font(.title2)
                            .foregroundColor(.white)
                            .padding()
                            .background(Circle().fill(Color.white.opacity(0.2)))
                    }
                }
            }
            .frame(height: 80)
            .padding()
            .transition(.move(edge: .bottom))
        }
    }
}
