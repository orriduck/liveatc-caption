# LiveATC Caption

<img width="1410" alt="Screenshot 2025-02-09 at 21 37 40" src="https://github.com/user-attachments/assets/35f96257-0b79-43a0-8b70-b057c72bd143" />

A real-time aviation communication transcription and captioning system that fetches live audio from LiveATC.net and provides transcription and captioning services.

## Tech Stack

### Frontend
- Next.js 14 - React Framework
- TypeScript - Type-safe JavaScript superset
- Tailwind CSS - Utility-first CSS framework
- Zustand - State management
- Shadcn/ui - Modern UI component library

### Backend
- FastAPI - Modern Python web framework
- Supabase - Open-source Firebase alternative for data storage
- BeautifulSoup4 - Web scraping and parsing
- HTTPX - Asynchronous HTTP client

## Local Development Setup

### Prerequisites
- Python 3.11+
- Node.js 22+
- pnpm
- Setup a Supabase account

### Installation Steps

1. Clone the repository
```bash
git clone <repository-url>
cd liveatc-caption
```

2. Install Python dependencies
```bash
python -m venv .venv
source .venv/bin/activate  # Linux/macOS
# or
.venv\Scripts\activate  # Windows
pip install -r requirements.txt
```

3. Install Node.js dependencies
```bash
pnpm install
```

4. Environment Variables Configuration
- Create a `.env.local` file and add `SUPABASE_KEY` and `SUPABASE_URL`

5. Run Database Migrations
- Ensure your Supabase credentials are properly configured in `.env.local`
- Execute the database migration script:
```bash
python -m package.db_migration.run_migrations
```

### Running the Project

1. Start the backend server
```bash
uvicorn api.index:app --reload
```

2. Start the frontend development server
```bash
pnpm dev
```

3. Access the application
Open your browser and visit http://localhost:3000

## Key Features

- Airport Search: Search global airports by ICAO code
- Real-time Data: Display airport METAR weather information
- Audio Channels: List all available air traffic control channels
- Live Status: Show online/offline status for each channel
- Frequency Information: Display detailed frequency information for each channel

## Features in Development

- Real-time Audio Transcription
- Caption Generation and Display
- History Recording
- Multi-language Support

## Contributing

Pull Requests and Issues are welcome!

Todo
- [ ] Fix when deploy to Vercel, when typing in
  and hit search button, it'll have "re is not defined" error. (ASK FOR HELP)
- [ ] Beautify the interface
- [ ] Adding the feature when clicking into the airport, open a new page and list all the URLs for that airport, When open the Channel, Pull up the channel audio and show the live status. transcript etc.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
