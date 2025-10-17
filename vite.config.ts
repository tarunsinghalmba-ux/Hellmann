import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'log-ports',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === '/api/log-ports' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => {
              body += chunk.toString();
            });
            req.on('end', () => {
              try {
                const data = JSON.parse(body);
                const logFile = path.join(process.cwd(), 'ports-debug.txt');

                const output = [
                  '======================================',
                  'PORTS DEBUG INFO',
                  '======================================',
                  `Total unique ports: ${data.totalPorts}`,
                  `Total unique modes: ${data.totalModes}`,
                  `Total unique carriers: ${data.totalCarriers}`,
                  `Total unique locations: ${data.totalLocations}`,
                  '',
                  `First 10 ports: ${data.first10Ports.join(', ')}`,
                  `Last 10 ports: ${data.last10Ports.join(', ')}`,
                  '',
                  `Ports starting with Q (${data.qPorts.length}):`,
                  data.qPorts.join(', '),
                  '',
                  '======================================',
                  'ALL PORTS (sorted alphabetically):',
                  '======================================',
                  ...data.allPorts,
                  '',
                  `Total: ${data.allPorts.length} ports`
                ].join('\n');

                fs.writeFileSync(logFile, output);
                console.log('\n' + output + '\n');

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
              } catch (err) {
                console.error('Error processing log:', err);
                res.writeHead(500);
                res.end();
              }
            });
          } else {
            next();
          }
        });
      }
    }
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
