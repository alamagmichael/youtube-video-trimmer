FROM node:18-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3-full \
    pipx \
    ffmpeg \
    curl \
    ca-certificates \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Install latest yt-dlp using pipx (safer than pip)
RUN pipx install --upgrade yt-dlp

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node dependencies
RUN npm install

# Copy application files
COPY . .

# Expose port 3000
EXPOSE 3000

# Start the server
CMD ["node", "server.js"]
