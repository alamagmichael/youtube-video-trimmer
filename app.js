// app.js - YouTube Video Trimmer
// This file contains the main UI behavior for loading a YouTube video,
// selecting a trim range, previewing the clip, and generating yt-dlp commands.

let vidId = null; // Current loaded YouTube video ID
let selectedQ = '1080p'; // Currently selected download quality option

// Convert hours/minutes/seconds form values into a total second count.
function toSecs(h, m, s) {
  return parseInt(h || 0) * 3600 + parseInt(m || 0) * 60 + parseInt(s || 0);
}

// Convert a second count into hours/minutes/seconds for UI updates.
function fromSecs(t) {
  return {
    h: Math.floor(t / 3600),
    m: Math.floor((t % 3600) / 60),
    s: Math.floor(t % 60)
  };
}

// Pad a single number to two digits for time formatting.
function pad(n) {
  return String(n).padStart(2, '0');
}

// Format seconds as a timestamp string (mm:ss or h:mm:ss).
function fmtTime(t) {
  let { h, m, s } = fromSecs(t);
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

// Format a duration into a human-friendly string.
function fmtDur(t) {
  let h = Math.floor(t / 3600);
  let m = Math.floor((t % 3600) / 60);
  let s = Math.floor(t % 60);
  return h > 0 ? `${h}h ${m}m ${s}s` : m > 0 ? `${m}m ${s}s` : `${s}s`;
}

// Extract the YouTube video ID from a URL or common embed format.
function parseYTId(url) {
  let m = url.trim().match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

// Read the start time from the input controls.
function getStart() {
  return toSecs(
    document.getElementById('sh').value,
    document.getElementById('sm').value,
    document.getElementById('ss').value
  );
}

// Read the end time from the input controls.
function getEnd() {
  return toSecs(
    document.getElementById('eh').value,
    document.getElementById('em').value,
    document.getElementById('es').value
  );
}

// Load the video preview iframe from the entered YouTube URL.
function loadVideo() {
  let id = parseYTId(document.getElementById('yt-url').value);
  if (!id) {
    showStatus('Could not find a video ID in that URL.', 'error');
    return;
  }

  vidId = id;
  document.getElementById('placeholder').style.display = 'none';
  let iframe = document.getElementById('yt-iframe');
  iframe.style.display = 'block';
  iframe.src = `https://www.youtube-nocookie.com/embed/${id}?start=${getStart()}&rel=0&modestbranding=1`;

  document.getElementById('vid-info').style.display = 'flex';
  document.getElementById('vid-id-label').textContent = id;
  showStatus('Video loaded. Set your trim times, preview, then download.', 'info');
  updateTimeline();
}

// Adjust end or start time values automatically when the user changes one side.
function onTimeChange(which) {
  let st = getStart();
  let en = getEnd();

  // If start is moved past end, extend end so the clip still makes sense.
  if (which === 's' && st > en) {
    let { h, m, s } = fromSecs(st + 30);
    document.getElementById('eh').value = h;
    document.getElementById('em').value = m;
    document.getElementById('es').value = s;
  }

  // If end is moved before start, push start back a bit (if end > 0).
  if (which === 'e' && en < st && en > 0) {
    let { h, m, s } = fromSecs(Math.max(0, en - 30));
    document.getElementById('sh').value = h;
    document.getElementById('sm').value = m;
    document.getElementById('ss').value = s;
  }

  updateTimeline();
  if (vidId && en > st) {
    reloadIframe(st, en);
  }
}

// Refresh the timeline UI and clip labels using current start/end values.
function updateTimeline() {
  let st = getStart();
  let en = getEnd();
  let base = Math.max(en + 60, 120); // Keep timeline visible even for short clips.

  let sp = Math.max(0, Math.min(97, (st / base) * 100));
  let ep = Math.max(sp + 3, Math.min(100, (en / base) * 100));

  document.getElementById('tl-fill').style.cssText = `left:${sp}%;width:${ep - sp}%`;
  document.getElementById('tl-start').style.left = sp + '%';
  document.getElementById('tl-end').style.left = ep + '%';
  document.getElementById('tl-lbl-s').style.left = sp + '%';
  document.getElementById('tl-lbl-s').textContent = fmtTime(st);
  document.getElementById('tl-lbl-e').style.left = ep + '%';
  document.getElementById('tl-lbl-e').textContent = fmtTime(en);

  let dur = Math.max(0, en - st);
  document.getElementById('clip-badge').innerHTML = `<i class="ti ti-scissors"></i> Clip: ${fmtDur(dur)}`;
  document.getElementById('vid-dur-label').textContent = `Clip length: ${fmtDur(dur)}`;
}

// When timeline is clicked, move the nearest handle to the clicked time.
function seekTimeline(e) {
  let tl = document.getElementById('timeline');
  let rect = tl.getBoundingClientRect();
  let pct = (e.clientX - rect.left) / rect.width;
  let base = Math.max(getEnd() + 60, 120);
  let t = Math.round(pct * base);
  let st = getStart();
  let en = getEnd();

  if (Math.abs(t - st) <= Math.abs(t - en)) {
    let { h, m, s } = fromSecs(Math.max(0, t));
    document.getElementById('sh').value = h;
    document.getElementById('sm').value = m;
    document.getElementById('ss').value = s;
  } else {
    let { h, m, s } = fromSecs(Math.max(0, t));
    document.getElementById('eh').value = h;
    document.getElementById('em').value = m;
    document.getElementById('es').value = s;
  }

  updateTimeline();
  if (vidId && getEnd() > getStart()) {
    reloadIframe(getStart(), getEnd());
  }
}

// Reload the iframe with a new start/end payload for preview.
function reloadIframe(st, en) {
  if (!vidId) return;
  let iframe = document.getElementById('yt-iframe');
  let src = `https://www.youtube-nocookie.com/embed/${vidId}?autoplay=1&start=${st}&rel=0&modestbranding=1`;
  if (en) src += `&end=${en}`;
  iframe.src = src;
}

// Jump the preview to the selected start time.
function seekToStart() {
  if (!vidId) {
    showStatus('Load a video first.', 'error');
    return;
  }
  reloadIframe(getStart(), null);
}

// Jump the preview to roughly the selected end time.
function seekToEnd() {
  if (!vidId) {
    showStatus('Load a video first.', 'error');
    return;
  }
  reloadIframe(Math.max(0, getEnd() - 10), null);
}

// Update the selected quality button state.
function selectQ(el, q) {
  selectedQ = q;
  document.querySelectorAll('.q-btn').forEach((b) => b.classList.remove('selected'));
  el.classList.add('selected');
}

// Build the yt-dlp command string for the current clip and quality.
function buildCmd() {
  let st = getStart();
  let en = getEnd();
  let url = document.getElementById('yt-url').value.trim() || `https://www.youtube.com/watch?v=${vidId}`;

  if (selectedQ === 'audio') {
    return `yt-dlp -x --audio-format mp3 --download-sections "*${fmtTime(st)}-${fmtTime(en)}" --force-keyframes-at-cuts -o "clip_${vidId}_%(title)s.%(ext)s" "${url}"`;
  }

  const fmts = {
    '2160p': 'bestvideo[height<=2160][ext=mp4]+bestaudio[ext=m4a]/best[height<=2160]',
    '1440p': 'bestvideo[height<=1440][ext=mp4]+bestaudio[ext=m4a]/best[height<=1440]',
    '1080p': 'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080]',
    '720p': 'bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720]',
    '480p': 'bestvideo[height<=480]+bestaudio/best[height<=480]',
    '360p': 'bestvideo[height<=360]+bestaudio/best[height<=360]'
  };

  return `yt-dlp -f "${fmts[selectedQ] || fmts['1080p']}" --download-sections "*${fmtTime(st)}-${fmtTime(en)}" --force-keyframes-at-cuts -o "clip_${vidId}_%(title)s.%(ext)s" "${url}"`;
}

// Create and download a shell script that runs the yt-dlp command.
function downloadScript() {
  if (!vidId) {
    showStatus('Load a video first.', 'error');
    return;
  }

  let st = getStart();
  let en = getEnd();
  if (en <= st) {
    showStatus('End time must be after start time.', 'error');
    return;
  }

  let cmd = buildCmd();
  let blob = new Blob([
    `#!/bin/bash\n# YouTube Clip Downloader\n# Video   : ${vidId}\n# Clip    : ${fmtTime(st)} → ${fmtTime(en)} (${fmtDur(en - st)})\n# Quality : ${selectedQ}\n# Created : ${new Date().toLocaleString()}\n\n${cmd}\n\necho "Done! Clip saved."\n`
  ], { type: 'text/plain' });

  let a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `download_clip_${vidId}.sh`;
  a.click();

  showStatus(`Script saved! In Terminal run:\n  bash ~/Downloads/download_clip_${vidId}.sh`, 'success');
}

// Copy the current yt-dlp command to the clipboard.
function copyCmd() {
  if (!vidId) {
    showStatus('Load a video first.', 'error');
    return;
  }

  let st = getStart();
  let en = getEnd();
  if (en <= st) {
    showStatus('End time must be after start time.', 'error');
    return;
  }

  let cmd = buildCmd();
  navigator.clipboard.writeText(cmd).then(() => {
    showStatus('Command copied — paste it into your terminal and press Enter.\n' + cmd, 'success');
  }).catch(() => {
    showStatus('Here is the command (select and copy manually):\n' + cmd, 'info');
  });
}

// Download the clip using the server backend and present it as a browser download.
async function downloadServer() {
  if (!vidId) {
    showStatus('Load a video first.', 'error');
    return;
  }

  let st = getStart();
  let en = getEnd();
  if (en <= st) {
    showStatus('End time must be after start time.', 'error');
    return;
  }

  let url = document.getElementById('yt-url').value.trim() || `https://www.youtube.com/watch?v=${vidId}`;
  const clipDuration = fmtDur(en - st);
  setProgress(0, `Starting server download (${clipDuration})...`);

  try {
    const response = await fetch('/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, start: st, end: en, quality: selectedQ })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.error || `Server returned ${response.status}`);
    }

    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = 'downloaded_clip.mp4';
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="(.+)"/);
      if (match) filename = match[1];
    }

    const reader = response.body.getReader();
    const contentLength = Number(response.headers.get('Content-Length')) || 0;
    const chunks = [];
    let received = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.length;
      if (contentLength) {
        setProgress(received / contentLength, `Downloading ${Math.round((received / contentLength) * 100)}% · ${clipDuration}`);
      } else {
        setProgress(null, `Downloading ${Math.round(received / 1024)} KB... · ${clipDuration}`);
      }
    }

    const blob = new Blob(chunks, { type: response.headers.get('Content-Type') || 'application/octet-stream' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();

    const downloadedSize = formatBytes(received);
    setProgress(1, `Download complete! Saved as ${filename} (${downloadedSize})`, 'success');
  } catch (err) {
    setProgress(false, 'Server download failed: ' + err.message, 'error');
  }
}

let statusHideTimer = null;

function clearStatusTimer() {
  if (statusHideTimer) {
    clearTimeout(statusHideTimer);
    statusHideTimer = null;
  }
}

function hideStatus() {
  clearStatusTimer();
  const statusElem = document.getElementById('status');
  const progressWrap = document.getElementById('download-progress-wrap');
  const progressElem = document.getElementById('download-progress');

  statusElem.textContent = '';
  statusElem.className = 'status';

  if (!progressWrap.classList.contains('active')) return;
  progressWrap.classList.remove('active');
  progressElem.classList.remove('indeterminate');
  progressElem.style.width = '0%';
}

// Update progress state and status area for downloads.
function setProgress(fraction, message, type) {
  const progressWrap = document.getElementById('download-progress-wrap');
  const progressElem = document.getElementById('download-progress');
  const statusElem = document.getElementById('status');

  clearStatusTimer();

  if (fraction === false) {
    progressWrap.classList.remove('active');
    progressElem.classList.remove('indeterminate');
    progressElem.style.width = '0%';
  } else {
    progressWrap.classList.add('active');
    if (fraction === null) {
      progressElem.classList.add('indeterminate');
      progressElem.style.width = '100%';
    } else {
      progressElem.classList.remove('indeterminate');
      progressElem.style.width = Math.min(100, Math.round(fraction * 100)) + '%';
    }
  }

  statusElem.textContent = message;
  statusElem.className = 'status show ' + (type || 'info');

  if (type === 'success' || (fraction === false && type !== 'error')) {
    statusHideTimer = setTimeout(hideStatus, 5000);
  }
}

// Show a feedback message in the UI status area.
function showStatus(msg, type) {
  setProgress(false, msg, type);
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  let kb = bytes / 1024;
  if (kb < 1024) return kb.toFixed(1) + ' KB';
  let mb = kb / 1024;
  if (mb < 1024) return mb.toFixed(1) + ' MB';
  return (mb / 1024).toFixed(1) + ' GB';
}

// Switch the OS instruction tab in the setup section.
function showOS(os, btn) {
  ['mac', 'win', 'linux'].forEach((o) => {
    document.getElementById('os-' + o).style.display = o === os ? 'flex' : 'none';
  });
  document.querySelectorAll('.os-tab').forEach((b) => b.classList.remove('active'));
  btn.classList.add('active');
}

// Check the backend health endpoint and update the status chip.
async function checkServerHealth() {
  let chip = document.getElementById('server-status-chip');
  if (location.protocol === 'file:') {
    document.getElementById('server-warning').style.display = 'flex';
    chip.textContent = '⚠ file:// mode — downloads disabled';
    chip.style.color = '#fac775';
    return;
  }

  try {
    let res = await fetch('/health', { cache: 'no-store' });
    if (!res.ok) throw new Error('health check failed');
    let data = await res.json();

    if (data.status === 'ok') {
      chip.textContent = data.ytDlp && data.ffmpeg
        ? '✓ server ready — downloads enabled'
        : '⚠ server running — install yt-dlp/ffmpeg';
      chip.style.color = data.ytDlp && data.ffmpeg ? '#6ddfaa' : '#fac775';
    } else {
      throw new Error('invalid health response');
    }
  } catch (err) {
    chip.textContent = '✕ server unreachable';
    chip.style.color = '#f56262';
  }
}

// Initialize timeline and bind Enter key for the URL input.
updateTimeline();
checkServerHealth();

document.getElementById('yt-url').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') loadVideo();
});
