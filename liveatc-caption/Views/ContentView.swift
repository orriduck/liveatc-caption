import SwiftUI

struct ContentView: View {
  @StateObject private var audioService = AudioService()

  var body: some View {
    ZStack(alignment: .bottom) {
      NavigationView {
        AirportDetailView(airport: Airport.mock)
          .environmentObject(audioService)
      }
      .accentColor(.orange)

      MiniPlayerView()
        .environmentObject(audioService)
    }
  }
}
