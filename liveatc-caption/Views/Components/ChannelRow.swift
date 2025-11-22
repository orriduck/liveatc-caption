import SwiftUI

struct ChannelRow: View {
  let feed: Feed
  let isPlaying: Bool
  let action: () -> Void

  var body: some View {
    Button(action: action) {
      HStack(spacing: 16) {
        // Icon / Number
        ZStack {
          RoundedRectangle(cornerRadius: 8)
            .fill(Color.gray.opacity(0.1))
            .frame(width: 40, height: 40)

          if isPlaying {
            Image(systemName: "waveform")
              .foregroundColor(.accentColor)
              .font(.system(size: 18, weight: .semibold))
          } else {
            Text(String(feed.name.prefix(1)))
              .font(.system(size: 18, weight: .semibold))
              .foregroundColor(.gray)
          }
        }

        VStack(alignment: .leading, spacing: 4) {
          Text(feed.name)
            .font(.body)
            .fontWeight(.medium)
            .foregroundColor(.primary)

          Text(feed.frequency)
            .font(.subheadline)
            .foregroundColor(.secondary)
        }

        Spacer()

        Button(action: {
          // More action
        }) {
          Image(systemName: "ellipsis")
            .foregroundColor(.gray)
            .padding(8)
        }
      }
      .padding(.vertical, 8)
      .contentShape(Rectangle())
    }
    .buttonStyle(PlainButtonStyle())
  }
}

#Preview {
  ChannelRow(feed: Feed.mock, isPlaying: true, action: {})
    .padding()
}
