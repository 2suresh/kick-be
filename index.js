const express = require('express');
const cors = require('cors');
const axios = require('axios');
const multer = require('multer');
const fs = require('fs');
const { spawn } = require('child_process');

const app = express();
const PORT = 5555;

app.use(cors());

app.use(express.json());

//mediaRecorder.start(1000);

// ===== Replace with your api.video API key =====
const API_VIDEO_KEY = 'YeGTY1KMVJzqruYM5Ovp7CQdIOXhKZ1NMxQpnDZHw3B';
const apiClient = axios.create({
  baseURL: 'https://ws.api.video',
  headers: { Authorization: `Bearer ${API_VIDEO_KEY}` },
});

app.get('/', (req, res) => {
    res.send('<h2>Welcome! Choose: <a href="/list">View Streams</a> or <a href="/start">Start Broadcast</a></h2>');
});
  
// List all live streams
app.get('/list', async (req, res) => {
    try {
        const { data } = await apiClient.get('/live-streams');
        res.json(data.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create new stream
app.post('/start', async (req, res) => {
  try {
    const { name } = req.body;
    const { data } = await apiClient.post('/live-streams', {
      name,
      record: true,
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Handle webcam chunk upload from browser and stream via FFmpeg
const upload = multer({ dest: 'uploads/' });

app.post('/upload-chunk', upload.single('video'), (req, res) => {
    const filePath = req.file.path;
  
    const ffmpeg = spawn('ffmpeg', [
      '-re',
      '-i', filePath,
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-tune', 'zerolatency',
      '-c:a', 'aac',
      '-f', 'flv',
      `rtmp://broadcast.api.video/s/${API_VIDEO_KEY}` // replace this with actual key
    ]);
  
    ffmpeg.stderr.on('data', (data) => {
      console.error(`FFmpeg error: ${data}`);
    });
  
    ffmpeg.on('close', (code) => {
      fs.unlinkSync(filePath); // delete temp file
      console.log(`FFmpeg exited with code ${code}`);
      res.sendStatus(200);
    });
  });

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running at: http://localhost:${PORT}`);
});
