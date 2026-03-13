import express from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;
const SAVE_DIR = process.env.SAVE_DIR || path.join(__dirname, 'data');

app.use(express.json({ limit: '100mb' }));

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
}

function sanitizePath(str) {
  return str.replace(/[^a-zA-Z0-9._\-\u3000-\u9FFF\u4E00-\u9FAF]/g, '_');
}

app.post('/api/save', async (req, res) => {
  try {
    const { dateDir, timeDir, filename, content, encoding } = req.body;

    if (!dateDir || !timeDir || !filename || content == null) {
      return res.status(400).json({ error: 'dateDir, timeDir, filename, content は必須です' });
    }

    const safeDateDir = dateDir.replace(/[^0-9]/g, '');
    const safeTimeDir = timeDir.replace(/[^0-9]/g, '');
    const safeFilename = sanitizePath(filename);

    const dirPath = path.join(SAVE_DIR, safeDateDir, safeTimeDir);
    await fs.mkdir(dirPath, { recursive: true });

    const filePath = path.join(dirPath, safeFilename);

    if (encoding === 'base64') {
      const buffer = Buffer.from(content, 'base64');
      await fs.writeFile(filePath, buffer);
    } else {
      await fs.writeFile(filePath, content, 'utf-8');
    }

    const relPath = `${safeDateDir}/${safeTimeDir}/${safeFilename}`;
    console.log(`[save] ${relPath}`);
    res.json({ success: true, path: relPath });
  } catch (err) {
    console.error('[save] error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/files', async (req, res) => {
  try {
    const entries = [];
    let dateDirs;
    try {
      dateDirs = await fs.readdir(SAVE_DIR);
    } catch {
      await fs.mkdir(SAVE_DIR, { recursive: true });
      dateDirs = [];
    }

    for (const dateDir of dateDirs.sort().reverse()) {
      const datePath = path.join(SAVE_DIR, dateDir);
      const stat = await fs.stat(datePath);
      if (!stat.isDirectory()) continue;

      const timeDirs = await fs.readdir(datePath);
      for (const timeDir of timeDirs.sort().reverse()) {
        const timePath = path.join(datePath, timeDir);
        const timeStat = await fs.stat(timePath);
        if (!timeStat.isDirectory()) continue;

        const files = await fs.readdir(timePath);
        entries.push({ date: dateDir, time: timeDir, files });
      }
    }

    res.json(entries);
  } catch (err) {
    console.error('[files] error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', saveDir: SAVE_DIR });
});

if (process.env.NODE_ENV === 'production') {
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Vibe News server running on port ${PORT}`);
  console.log(`Save directory: ${SAVE_DIR}`);
});
