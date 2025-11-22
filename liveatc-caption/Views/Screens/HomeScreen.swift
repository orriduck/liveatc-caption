import SwiftUI

struct HomeScreen: View {
    @StateObject private var liveATCService = LiveATCService()
    @EnvironmentObject var audioService: AudioService
    
    var body: some View {
        NavigationView {
            ZStack {
                // Background Gradient
                LinearGradient(gradient: Gradient(colors: [Color.blue.opacity(0.3), Color.purple.opacity(0.3)]), startPoint: .topLeading, endPoint: .bottomTrailing)
                    .edgesIgnoringSafeArea(.all)
                
                ScrollView {
                    VStack(spacing: 20) {
                        Text("LiveATC")
                            .font(.system(size: 34, weight: .bold, design: .rounded))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.horizontal)
                        
                        NavigationLink(destination: SearchScreen()) {
                            GlassCard {
                                HStack {
                                    Image(systemName: "magnifyingglass")
                                        .foregroundColor(.white)
                                    Text("Search Feeds")
                                        .foregroundColor(.white.opacity(0.8))
                                    Spacer()
                                }
                            }
                            .frame(height: 60)
                        }
                        .padding(.horizontal)
                        
                        Text("Popular Feeds")
                            .font(.title2)
                            .fontWeight(.semibold)
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.horizontal)
                        
                        // Mock Popular Feeds
                        ForEach(0..<3) { _ in
                            GlassCard {
                                HStack {
                                    VStack(alignment: .leading) {
                                        Text("KJFK Tower")
                                            .font(.headline)
                                            .foregroundColor(.white)
                                        Text("New York, NY")
                                            .font(.subheadline)
                                            .foregroundColor(.white.opacity(0.7))
                                    }
                                    Spacer()
                                    Image(systemName: "play.circle.fill")
                                        .font(.title)
                                        .foregroundColor(.white)
                                }
                            }
                            .frame(height: 80)
                            .padding(.horizontal)
                        }
                    }
                    .padding(.top)
                }
            }
            .navigationBarHidden(true)
        }
    }
}
