import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { writeFileSync, appendFileSync, mkdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

// HTML保存・配信プラグイン（開発環境のみ）
function saveHtmlPlugin() {
  return {
    name: 'save-html-api',
    configureServer(server) {
      // POST /api/save-html → data/YYYYMMDD/filename.html に保存
      server.middlewares.use('/api/save-html', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method Not Allowed' }));
          return;
        }
        let body = '';
        req.on('data', (chunk) => { body += chunk; });
        req.on('end', () => {
          try {
            const { html, dateStr, filename } = JSON.parse(body);
            const dir = join(process.cwd(), 'data', dateStr);
            mkdirSync(dir, { recursive: true });
            writeFileSync(join(dir, filename), html, 'utf8');
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true, path: `/data/${dateStr}/${filename}` }));
          } catch (e) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: e.message }));
          }
        });
      });

      // POST /api/save-log → data/logs/newspaper_<sessionId>.log に追記
      server.middlewares.use('/api/save-log', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method Not Allowed' }));
          return;
        }
        let body = '';
        req.on('data', (chunk) => { body += chunk; });
        req.on('end', () => {
          try {
            const { entries, sessionId } = JSON.parse(body);
            const dir = join(process.cwd(), 'data', 'logs');
            mkdirSync(dir, { recursive: true });
            const logFile = join(dir, `newspaper_${sessionId}.log`);
            const lines = entries.map((e) => {
              const dataStr = e.data !== undefined
                ? '\n' + JSON.stringify(e.data, null, 2)
                : '';
              return `[${e.time}] [${e.level.padEnd(5)}] ${e.message}${dataStr}`;
            }).join('\n') + '\n';
            appendFileSync(logFile, lines, 'utf8');
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true, file: logFile }));
          } catch (e) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: e.message }));
          }
        });
      });

      // GET /data/... → data/ フォルダのファイルを配信
      server.middlewares.use('/data', (req, res, next) => {
        const filePath = join(process.cwd(), 'data', req.url);
        if (existsSync(filePath)) {
          try {
            const content = readFileSync(filePath, 'utf8');
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.end(content);
          } catch (e) {
            next();
          }
        } else {
          next();
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), saveHtmlPlugin()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    watch: {
      usePolling: true,
      interval: 1000,
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
  },
});
