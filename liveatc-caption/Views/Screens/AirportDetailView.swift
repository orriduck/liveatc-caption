import SwiftUI

struct AirportDetailView: View {
  let airport: Airport
  @EnvironmentObject var audioService: AudioService
  @State private var scrollOffset: CGFloat = 0

  var body: some View {
    ZStack {
      ScrollView {
        VStack(spacing: 0) {
          // Header
          ZStack(alignment: .bottomLeading) {
            LinearGradient(
              gradient: Gradient(colors: [Color.orange, Color.yellow]),
              startPoint: .topLeading,
              endPoint: .bottomTrailing
            )
            .frame(height: 300)
            .overlay(
              LinearGradient(
                gradient: Gradient(colors: [.clear, .black.opacity(0.3)]),
                startPoint: .top,
                endPoint: .bottom
              )
            )

            VStack(alignment: .leading, spacing: 8) {
              Text(airport.id)
                .font(.system(size: 40, weight: .bold))
                .foregroundColor(.white)

              Text(airport.name)
                .font(.title3)
                .fontWeight(.semibold)
                .foregroundColor(.white)

              Text("Updated just now")
                .font(.caption)
                .foregroundColor(.white.opacity(0.8))
            }
            .padding(20)
          }

          // Action Buttons
          HStack(spacing: 16) {
            Button(action: {
              if let firstFeed = airport.feeds.first {
                audioService.play(feed: firstFeed)
              }
            }) {
              HStack {
                Image(systemName: "play.fill")
                Text("Play Tower")
              }
              .font(.headline)
              .foregroundColor(.white)
              .frame(maxWidth: .infinity)
              .padding(.vertical, 14)
              .background(Color.orange)
              .cornerRadius(12)
            }

            Button(action: {
              // Shuffle/Scan action
            }) {
              HStack {
                Image(systemName: "shuffle")
                Text("Scan")
              }
              .font(.headline)
              .foregroundColor(.white)
              .frame(maxWidth: .infinity)
              .padding(.vertical, 14)
              .background(Color.orange)
              .cornerRadius(12)
            }
          }
          .padding(20)

          // Description / METAR
          Text(airport.metar)
            .font(.caption)
            .foregroundColor(.secondary)
            .padding(.horizontal, 20)
            .padding(.bottom, 20)
            .lineLimit(3)

          Divider()
            .padding(.leading, 20)

          // Channel List
          LazyVStack(spacing: 0) {
            ForEach(airport.feeds) { feed in
              ChannelRow(
                feed: feed,
                isPlaying: audioService.currentFeed?.id == feed.id && audioService.isPlaying,
                action: {
                  audioService.play(feed: feed)
                }
              )
              .padding(.horizontal, 20)

              Divider()
                .padding(.leading, 76)
            }
          }
          .padding(.bottom, 100)  // Space for mini player
        }
      }
      .edgesIgnoringSafeArea(.top)
    }
  }
}

#Preview {
  AirportDetailView(airport: Airport.mock)
    .environmentObject(AudioService())
}
