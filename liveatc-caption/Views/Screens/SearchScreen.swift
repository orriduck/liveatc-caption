import SwiftUI

struct SearchScreen: View {
    @StateObject private var liveATCService = LiveATCService()
    @EnvironmentObject var audioService: AudioService
    @State private var searchText = ""
    
    var body: some View {
        ZStack {
            LinearGradient(gradient: Gradient(colors: [Color.blue.opacity(0.3), Color.purple.opacity(0.3)]), startPoint: .topLeading, endPoint: .bottomTrailing)
                .edgesIgnoringSafeArea(.all)
            
            VStack {
                // Custom Search Bar
                GlassCard {
                    HStack {
                        Image(systemName: "magnifyingglass")
                            .foregroundColor(.white.opacity(0.6))
                        TextField("Search airport or frequency...", text: $searchText)
                            .foregroundColor(.white)
                            .onSubmit {
                                Task {
                                    await liveATCService.searchFeeds(query: searchText)
                                }
                            }
                        if !searchText.isEmpty {
                            Button(action: { searchText = "" }) {
                                Image(systemName: "xmark.circle.fill")
                                    .foregroundColor(.white.opacity(0.6))
                            }
                        }
                    }
                }
                .frame(height: 50)
                .padding()
                
                ScrollView {
                    LazyVStack(spacing: 15) {
                        ForEach(liveATCService.feeds) { feed in
                            Button(action: {
                                audioService.play(feed: feed)
                            }) {
                                GlassCard {
                                    HStack {
                                        VStack(alignment: .leading) {
                                            Text(feed.name)
                                                .font(.headline)
                                                .foregroundColor(.white)
                                            Text(feed.location)
                                                .font(.caption)
                                                .foregroundColor(.white.opacity(0.7))
                                        }
                                        Spacer()
                                        if audioService.currentFeed?.id == feed.id && audioService.isPlaying {
                                            Image(systemName: "pause.circle.fill")
                                                .font(.title2)
                                                .foregroundColor(.white)
                                        } else {
                                            Image(systemName: "play.circle.fill")
                                                .font(.title2)
                                                .foregroundColor(.white)
                                        }
                                    }
                                }
                                .frame(height: 70)
                            }
                            .padding(.horizontal)
                        }
                    }
                }
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .navigationTitle("Search")
    }
}
