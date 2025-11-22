import SwiftUI

struct MiniPlayerView: View {
  @EnvironmentObject var audioService: AudioService

  var body: some View {
    if let feed = audioService.currentFeed {
      VStack(spacing: 0) {
        HStack(spacing: 12) {
          // Artwork / Icon
          ZStack {
            RoundedRectangle(cornerRadius: 6)
              .fill(Color.gray.opacity(0.2))
              .frame(width: 48, height: 48)

            Image(systemName: "antenna.radiowaves.left.and.right")
              .font(.system(size: 24))
              .foregroundColor(.secondary)
          }
          .shadow(radius: 2)

          Text(feed.name)
            .font(.headline)
            .lineLimit(1)

          Spacer()

          HStack(spacing: 16) {
            Button(action: {
              if audioService.isPlaying {
                audioService.pause()
              } else {
                audioService.play(feed: feed)
              }
            }) {
              Image(systemName: audioService.isPlaying ? "pause.fill" : "play.fill")
                .font(.title2)
                .foregroundColor(.primary)
            }

            Button(action: {
              // Forward action
            }) {
              Image(systemName: "forward.fill")
                .font(.title2)
                .foregroundColor(.secondary)
            }
          }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(
          GlassView(style: .systemChromeMaterial)
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .shadow(color: Color.black.opacity(0.1), radius: 10, x: 0, y: 5)
        )
        .padding(.horizontal, 8)
        .padding(.bottom, 8)
      }
      .transition(.move(edge: .bottom))
    }
  }
}

#Preview {
  let service = AudioService()
  service.currentFeed = Feed.mock
  service.isPlaying = true
  return MiniPlayerView()
    .environmentObject(service)
}
