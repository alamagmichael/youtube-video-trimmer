# YouTube Video Trimmer

A simple web application for trimming and downloading YouTube videos. Load any YouTube video, select your desired trim range, and generate download commands or download directly through the server.

## Features

- **Easy Video Loading**: Paste a YouTube URL or ID to load videos
- **Visual Trimming**: Use the video player to mark start and end times
- **Quality Selection**: Choose your preferred download quality (supports multiple options)
- **Command Generation**: Generate `yt-dlp` commands for local downloads
- **Server Downloads**: Optional server-side download support with ffmpeg trimming
- **Time Formatting**: Intuitive hours/minutes/seconds time input
- **Real-time Preview**: See your trim range duration before downloading

## Requirements

- Node.js and npm
- **Optional** (for server downloads): `yt-dlp` and `ffmpeg`

## Installation

1. Clone this repository:
```bash
git clone https://github.com/alamagmichael/youtube-video-trimmer.git
cd youtube-video-trimmer
```

2. Install dependencies:
```bash
npm install
```

3. (Optional) Install download tools for server functionality:
```bash
# On macOS
brew install yt-dlp ffmpeg

# On Ubuntu/Debian
sudo apt-get install yt-dlp ffmpeg

# On Windows
choco install yt-dlp ffmpeg
```

## Usage

1. Start the server:
```bash
npm start
```

The application will be available at `http://localhost:3000`

2. **Load a Video**: Enter a YouTube URL or video ID
3. **Select Trim Range**: Use the input fields to set start and end times in hours/minutes/seconds
4. **Choose Quality**: Select your desired video quality
5. **Download**: Either generate a yt-dlp command or use the download button (if server tools are installed)

## Project Structure

- `index.html` - Main UI and video player
- `app.js` - Frontend logic for video trimming and command generation
- `styles.css` - Application styling
- `server.js` - Express server with download endpoints
- `package.json` - Project dependencies and scripts

## API Endpoints

### GET `/health`
Check if optional download tools are available
```json
{
  "status": "ok",
  "ytDlp": true,
  "ffmpeg": true
}
```

### POST `/download`
Download and trim a video (requires yt-dlp and ffmpeg)
```json
{
  "url": "https://www.youtube.com/watch?v=...",
  "start": 60,
  "end": 300,
  "quality": "1080p"
}
```

## License

MIT