const express = require('express');
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

let ytDlpAvailable = false;
let ffmpegAvailable = false;

try {
  execSync('yt-dlp --version', { stdio: 'ignore' });
  ytDlpAvailable = true;
} catch (err) {
  console.warn('yt-dlp not available: install yt-dlp for server downloads.');
}

try {
  execSync('ffmpeg -version', { stdio: 'ignore' });
  ffmpegAvailable = true;
} catch (err) {
  console.warn('ffmpeg not available: install ffmpeg for server downloads.');
}

app.use(express.static(path.join(__dirname)));
app.use(express.json());

// CORS headers for cross-origin requests
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.get('/health', (req, res) => {
  return res.json({
    status: 'ok',
    ytDlp: ytDlpAvailable,
    ffmpeg: ffmpegAvailable
  });
});

app.post('/download', (req, res) => {
  const { url, start, end, quality } = req.body;
  if (!url || start == null || end == null || !quality) {
    return res.status(400).json({ error: 'Missing required download parameters.' });
  }

  const safeUrl = String(url).trim();
  const startTime = Number(start);
  const endTime = Number(end);
  const duration = endTime - startTime;

  if (!safeUrl || isNaN(startTime) || isNaN(endTime) || duration <= 0) {
    return res.status(400).json({ error: 'Invalid start or end time.' });
  }

  const fmts = {
    '2160p': 'bestvideo[height<=2160][ext=mp4]+bestaudio[ext=m4a]/best[height<=2160]',
    '1440p': 'bestvideo[height<=1440][ext=mp4]+bestaudio[ext=m4a]/best[height<=1440]',
    '1080p': 'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080]',
    '720p': 'bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720]',
    '480p': 'bestvideo[height<=480]+bestaudio/best[height<=480]',
    '360p': 'bestvideo[height<=360]+bestaudio/best[height<=360]',
    'audio': 'bestaudio'
  };

  const format = fmts[quality] || fmts['1080p'];
  const ext = quality === 'audio' ? '.mp3' : '.mp4';
  const filename = timestampFilename(ext);
  const tempName = `yttrim-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
  const tempPath = path.join(os.tmpdir(), tempName);

  const commonArgs = [
    '--no-warnings',
    '--socket-timeout', '30',
    '--retries', '3',
    '--fragment-retries', '3',
    '--download-sections', `*${formatTime(startTime)}-${formatTime(endTime)}`,
    '--force-keyframes-at-cuts',
    '-o', tempPath
  ];

  const ytDlpArgs = quality === 'audio'
    ? ['-x', '--audio-format', 'mp3', ...commonArgs, safeUrl]
    : ['-f', format, ...commonArgs, safeUrl];

  let stderrData = '';
  const child = spawn('yt-dlp', ytDlpArgs, { stdio: ['ignore', 'pipe', 'pipe'] });

  child.stdout.on('data', (data) => {
    console.log('[yt-dlp stdout]', data.toString().trim());
  });

  child.stderr.on('data', (data) => {
    const message = data.toString();
    stderrData += message;
    console.error('[yt-dlp stderr]', message.trim());
  });

  const cleanup = () => {
    if (fs.existsSync(tempPath)) {
      fs.unlink(tempPath, (err) => {
        if (err) console.warn('Could not delete temp file:', tempPath, err.message);
      });
    }
  };

  res.on('close', cleanup);

  child.on('error', (err) => {
    console.error('yt-dlp process error:', err);
    cleanup();
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to start yt-dlp.' });
    }
  });

  child.on('close', (code) => {
    if (code !== 0) {
      console.error(`yt-dlp exited with code ${code}`);
      console.error(`yt-dlp stderr:\n${stderrData}`);
      cleanup();
      if (!res.headersSent) {
        const errorMsg = stderrData.includes('HTTP Error 403')
          ? 'YouTube blocked this download. Try a different video.'
          : stderrData.includes('Video unavailable')
          ? 'This video is unavailable or private.'
          : 'yt-dlp failed to download the clip.';
        return res.status(500).json({ error: errorMsg, details: stderrData.substring(0, 500) });
      }
      return;
    }

    if (fs.existsSync(tempPath)) {
      res.download(tempPath, filename, (err) => {
        cleanup();
        if (err && !res.headersSent) {
          console.error('Failed to send downloaded file:', err);
          res.status(500).json({ error: 'Failed to send downloaded file.' });
        }
      });
    } else {
      console.error('Downloaded file missing after yt-dlp finished.');
      if (!res.headersSent) {
        res.status(500).json({ error: 'Downloaded file is missing.' });
      }
    }
  });
});

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

function timestampFilename(ext) {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = pad(now.getMonth() + 1);
  const dd = pad(now.getDate());
  const hh = pad(now.getHours());
  const min = pad(now.getMinutes());
  const ss = pad(now.getSeconds());
  return `clip_${yyyy}${mm}${dd}_${hh}${min}${ss}${ext}`;
}

function pad(n) {
  return String(n).padStart(2, '0');
}

const startPort = Number.isFinite(Number(port)) ? Number(port) : 3000;
const maxPortTries = 10;

function startServer(portToTry, remainingAttempts) {
  const server = app.listen(portToTry, () => {
    console.log(`Server started on http://localhost:${portToTry}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE' && remainingAttempts > 0) {
      console.warn(`Port ${portToTry} in use, trying ${portToTry + 1}...`);
      startServer(portToTry + 1, remainingAttempts - 1);
    } else {
      console.error('Server failed to start:', err);
      process.exit(1);
    }
  });
}

startServer(startPort, maxPortTries);
