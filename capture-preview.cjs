const path = require('path');
const fs = require('fs');
const http = require('http');
const { chromium } = require('playwright-chromium');

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.woff': 'application/font-woff',
  '.woff2': 'font/woff2',
  '.ttf': 'application/font-ttf',
  '.wasm': 'application/wasm'
};

async function runCapture() {
  console.log('[1/4] Starting static server...');
  const distPath = path.join(__dirname, 'dist');
  
  const server = http.createServer((req, res) => {
    try {
      const urlClean = req.url.split('?')[0];
      let filePath = path.join(distPath, urlClean);
      
      let isFile = false;
      if (fs.existsSync(filePath)) {
        try {
          isFile = fs.statSync(filePath).isFile();
        } catch (e) {
          isFile = false;
        }
      }

      if (!isFile) {
        filePath = path.join(distPath, 'index.html');
      }

      const extname = String(path.extname(filePath)).toLowerCase();
      const contentType = mimeTypes[extname] || 'application/octet-stream';
      const content = fs.readFileSync(filePath);
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    } catch (err) {
      res.writeHead(500);
      res.end('Server error');
    }
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`[Static Server] Running at ${baseUrl}`);

  const artifactDir = 'C:\\Users\\HP\\.gemini\\antigravity\\brain\\3c9de131-baca-4cc6-8425-bb69dad50d55';
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }

  console.log('[2/4] Launching Playwright browser...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1
  });
  const page = await context.newPage();

  console.log('[3/4] Navigating to login page...');
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // 1. Screenshot Login Screen
  const loginImgPath = path.join(artifactDir, 'preview_login_screen.png');
  await page.screenshot({ path: loginImgPath, fullPage: false, animations: 'disabled' });
  console.log('Saved 1: preview_login_screen.png');

  // 2. Click Offline Login button
  console.log('Clicking Offline Mode button...');
  const offlineBtn = await page.waitForSelector('button:has-text("OFFLINE MODE"), button:has-text("Mode Offline")', { timeout: 10000 });
  if (offlineBtn) {
    await offlineBtn.click();
    console.log('Clicked Offline Login button, waiting for workspace...');
    await page.waitForTimeout(2000);
  }

  // Dismiss welcome modal if open
  try {
    const getStartedBtn = await page.$('button:has-text("GET STARTED"), button:has-text("MULAI")');
    if (getStartedBtn) {
      console.log('Dismissing welcome modal...');
      await getStartedBtn.click();
      await page.waitForTimeout(1000);
    }
  } catch (e) {}

  // 3. Screenshot Workspace / Sidebar
  const sidebarImgPath = path.join(artifactDir, 'preview_workspace_sidebar.png');
  await page.screenshot({ path: sidebarImgPath, fullPage: false, animations: 'disabled' });
  console.log('Saved 2: preview_workspace_sidebar.png');

  // 4. Click Search Gen in Sidebar
  console.log('Clicking Search Gen in sidebar...');
  const searchGenLink = await page.waitForSelector('a[href="/SearchGen"], a:has-text("Search Gen")', { timeout: 10000 });
  if (searchGenLink) {
    await searchGenLink.click();
    console.log('Clicked Search Gen link, waiting for view...');
    await page.waitForTimeout(2000);
  }

  // 5. Screenshot Search Gen View
  const searchGenImgPath = path.join(artifactDir, 'preview_search_gen_view.png');
  await page.screenshot({ path: searchGenImgPath, fullPage: false, animations: 'disabled' });
  console.log('Saved 3: preview_search_gen_view.png');

  await browser.close();
  server.close();
  console.log('[4/4] Preview capture completed successfully!');
  process.exit(0);
}

runCapture().catch((err) => {
  console.error('[Error during capture]:', err);
  process.exit(1);
});
