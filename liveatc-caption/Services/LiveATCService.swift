import Combine
import Foundation

class LiveATCService: ObservableObject {
  @Published var feeds: [Feed] = []

  func searchFeeds(query: String) async {
    // TODO: Implement actual scraping or API call
    // For now, return mock data
    try? await Task.sleep(nanoseconds: 1_000_000_000)  // Simulate network delay

    DispatchQueue.main.async {
      self.feeds = [
        Feed(
          id: "kjfk_twr", name: "KJFK Tower", frequency: "119.100", location: "New York, NY",
          url: URL(string: "https://d.liveatc.net/kjfk_twr")!),
        Feed(
          id: "ksfo_twr", name: "KSFO Tower", frequency: "120.500", location: "San Francisco, CA",
          url: URL(string: "https://d.liveatc.net/ksfo_twr")!),
        Feed(
          id: "egll_twr", name: "EGLL Tower", frequency: "118.500", location: "London, UK",
          url: URL(string: "https://d.liveatc.net/egll_twr")!),
      ].filter {
        $0.name.lowercased().contains(query.lowercased())
          || $0.location.lowercased().contains(query.lowercased())
      }
    }
  }
}
