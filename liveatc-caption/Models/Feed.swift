import Foundation

struct Feed: Identifiable, Codable {
    let id: String
    let name: String
    let frequency: String
    let location: String
    let url: URL
    
    // Helper for mock data
    static let mock = Feed(
        id: "kjfk_twr",
        name: "KJFK Tower",
        frequency: "119.100",
        location: "New York, NY",
        url: URL(string: "https://d.liveatc.net/kjfk_twr")!
    )
}
