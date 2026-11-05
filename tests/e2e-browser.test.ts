import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, type ChildProcess } from 'child_process';
import http from 'http';

describe('End-to-End Browser Verification', () => {
  let chromeProc: ChildProcess | null = null;
  const cdpPort = 9390;

  beforeAll(async () => {
    // Launch headless chrome pointing to the preview server
    chromeProc = spawn('google-chrome', [
      '--headless=new',
      `--remote-debugging-port=${cdpPort}`,
      '--user-data-dir=/tmp/cdp-e2e-test',
      '--no-first-run',
      '--no-default-browser-check',
      'http://127.0.0.1:4173/?stop=1001'
    ], { stdio: 'ignore' });

    // Wait for Chrome to initialize
    await new Promise((resolve) => setTimeout(resolve, 2500));
  });

  afterAll(() => {
    if (chromeProc) {
      chromeProc.kill();
    }
  });

  it('renders application with station 1001 deep link correctly', async () => {
    // Fetch tabs list from CDP
    const tabs: any = await new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${cdpPort}/json`, (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => resolve(JSON.parse(raw)));
      }).on('error', reject);
    });

    const pageTab = tabs.find((t: any) => t.type === 'page');
    expect(pageTab).toBeDefined();
    expect(pageTab.title).toContain('اتوبوس تهران');
    expect(pageTab.url).toContain('stop=1001');
  });
});

