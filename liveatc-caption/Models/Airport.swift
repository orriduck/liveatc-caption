import Foundation

struct Airport: Identifiable, Codable {
  let id: String  // ICAO code
  let name: String
  let location: String
  let metar: String
  let feeds: [Feed]

  static let mock = Airport(
    id: "KJFK",
    name: "John F. Kennedy International Airport",
    location: "New York, NY",
    metar: "KJFK 191451Z 31015G22KT 10SM FEW045 08/M06 A3004 RMK AO2 SLP172 T00781061",
    feeds: [
      Feed(
        id: "kjfk_twr", name: "Tower", frequency: "119.100", location: "New York, NY",
        url: URL(string: "https://d.liveatc.net/kjfk_twr")!),
      Feed(
        id: "kjfk_gnd", name: "Ground", frequency: "121.900", location: "New York, NY",
        url: URL(string: "https://d.liveatc.net/kjfk_gnd")!),
      Feed(
        id: "kjfk_app", name: "Approach", frequency: "128.125", location: "New York, NY",
        url: URL(string: "https://d.liveatc.net/kjfk_app")!),
      Feed(
        id: "kjfk_dep", name: "Departure", frequency: "135.900", location: "New York, NY",
        url: URL(string: "https://d.liveatc.net/kjfk_dep")!),
      Feed(
        id: "kjfk_del", name: "Delivery", frequency: "128.725", location: "New York, NY",
        url: URL(string: "https://d.liveatc.net/kjfk_del")!),
    ]
  )
}
