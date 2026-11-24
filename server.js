import http from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const WORKSPACE_DIR = '/workspace';
const PYTHON_AGENT_URL = process.env.PYTHON_AGENT_URL || 'http://dev-python:3099';

async function runPm2(args) {
  const { stdout, stderr } = await execFileAsync('pm2', args, { timeout: 15000 });
  return { stdout, stderr };
}

async function readTail(filePath, maxBytes = 65536) {
  try {
    const stat = await fs.stat(filePath);
    const start = Math.max(0, stat.size - maxBytes);
    const handle = await fs.open(filePath, 'r');
    const buf = Buffer.alloc(stat.size - start);
    await handle.read(buf, 0, buf.length, start);
    await handle.close();
    const lines = buf.toString('utf8').split('\n');
    return lines.slice(-150).join('\n');
  } catch {
    return '';
  }
}

async function getWorkspaceProjects() {
  try {
    const entries = await fs.readdir(WORKSPACE_DIR, { withFileTypes: true });
    return entries.filter(e => e.isDirectory() && !e.name.startsWith('.')).map(e => e.name);
  } catch {
    return [];
  }
}

async function fetchPythonAgent(pathname, options = {}) {
  try {
    const res = await fetch(`${PYTHON_AGENT_URL}${pathname}`, {
      ...options,
      signal: AbortSignal.timeout(5000)
    });
    return await res.json();
  } catch {
    return null;
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'GET' && url.pathname === '/api/status') {
    try {
      const [{ stdout }, nodeProjects, pyData] = await Promise.all([
        runPm2(['jlist']),
        getWorkspaceProjects(),
        fetchPythonAgent('/api/status')
      ]);
      const list = JSON.parse(stdout || '[]');
      const nodeProcesses = list.map(p => ({
        id: `node:${p.pm_id}`,
        rawId: p.pm_id,
        container: 'dev-node',
        runtime: 'Node.js',
        name: p.name,
        pid: p.pid,
        status: p.pm2_env?.status || 'unknown',
        uptime: p.pm2_env?.pm_uptime || 0,
        restarts: p.pm2_env?.restart_time || 0,
        cpu: p.monit?.cpu || 0,
        memory: p.monit?.memory || 0,
        script: p.pm2_env?.pm_exec_path || '',
        cwd: p.pm2_env?.pm_cwd || '',
        nodeVersion: p.pm2_env?.node_version || '',
        outLogPath: p.pm2_env?.pm_out_log_path || '',
        errLogPath: p.pm2_env?.pm_err_log_path || ''
      }));

      const pyProcesses = (pyData && Array.isArray(pyData.processes)) ? pyData.processes : [];
      const pyProjects = (pyData && Array.isArray(pyData.projects)) ? pyData.projects : [];

      const payload = {
        system: {
          hostname: 'HomeServer (dev-node + dev-python)',
          nodeVersion: process.version,
          pythonConnected: Boolean(pyData),
          cpuCount: os.cpus().length,
          cpuModel: os.cpus()[0]?.model || 'CPU',
          loadAvg: os.loadavg(),
          totalMem: os.totalmem(),
          freeMem: os.freemem(),
          uptime: os.uptime()
        },
        projects: nodeProjects,
        pythonProjects: pyProjects,
        processes: [...nodeProcesses, ...pyProcesses]
      };
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(payload));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/logs') {
    try {
      const id = url.searchParams.get('id') || '';
      if (id.startsWith('py:')) {
        const rawId = id.slice(3);
        const pyLogs = await fetchPythonAgent(`/api/logs?id=${encodeURIComponent(rawId)}`);
        if (!pyLogs || pyLogs.error) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: pyLogs?.error || 'Python process not found' }));
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(pyLogs));
        return;
      }

      const rawId = id.startsWith('node:') ? id.slice(5) : id;
      const { stdout } = await runPm2(['jlist']);
      const list = JSON.parse(stdout || '[]');
      const proc = list.find(p => String(p.pm_id) === String(rawId) || p.name === rawId);
      if (!proc) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Process not found' }));
        return;
      }
      const outLog = await readTail(proc.pm2_env?.pm_out_log_path);
      const errLog = await readTail(proc.pm2_env?.pm_err_log_path);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ name: proc.name, outLog, errLog }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  if (req.method === 'POST' && (url.pathname === '/api/action' || url.pathname === '/api/create')) {
    let body = '';
    for await (const chunk of req) body += chunk;
    try {
      const data = JSON.parse(body || '{}');
      if (url.pathname === '/api/action') {
        const allowed = ['restart', 'stop', 'start', 'reload', 'delete', 'flush', 'save'];
        if (!allowed.includes(data.action)) throw new Error('Invalid action');
        if (data.action === 'save') {
          await Promise.all([
            runPm2(['save']),
            fetchPythonAgent('/api/action', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'save' })
            })
          ]);
        } else {
          const target = String(data.target || '');
          if (target.startsWith('py:')) {
            const rawId = target.slice(3);
            const pyRes = await fetchPythonAgent('/api/action', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: data.action, target: rawId })
            });
            if (pyRes?.error) throw new Error(pyRes.error);
          } else {
            const rawId = target.startsWith('node:') ? target.slice(5) : target;
            await runPm2([data.action, rawId]);
            await runPm2(['save']);
          }
        }
      } else if (url.pathname === '/api/create') {
        if (!data.name || !data.script) throw new Error('Name and script are required');
        if (data.container === 'dev-python') {
          const pyRes = await fetchPythonAgent('/api/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });
          if (!pyRes || pyRes.error) throw new Error(pyRes?.error || 'Python container unreachable');
        } else {
          const cwd = data.cwd ? path.join(WORKSPACE_DIR, path.basename(data.cwd)) : WORKSPACE_DIR;
          await runPm2(['start', data.script, '--name', data.name, '--cwd', cwd]);
          await runPm2(['save']);
        }
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  if ((req.method === 'GET' || req.method === 'HEAD') && (url.pathname === '/pm2.png' || url.pathname === '/favicon.ico')) {
    try {
      const img = await fs.readFile(path.join(__dirname, 'public', 'pm2.png'));
      res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' });
      res.end(img);
    } catch {
      res.writeHead(404);
      res.end();
    }
    return;
  }

  try {
    const html = await fs.readFile(path.join(__dirname, 'public', 'index.html'), 'utf8');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  } catch (err) {
    res.writeHead(500);
    res.end('Dashboard UI not found');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`PM2 Web Monitor running on port ${PORT}`);
});
