import { chromium } from 'playwright';

const routes = ['/', '/explore', '/verify', '/dashboard', '/docs', '/analytics', '/explorer', '/privacy', '/vision'];

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  
  for (const route of routes) {
    const filename = route === '/' ? 'home' : route.slice(1);
    try {
      // Add ?judge=1 to skip overlays
      await page.goto(`http://localhost:3000${route}?judge=1`, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000); // Wait for client-side rendering
      await page.screenshot({ path: `screenshots/desktop-${filename}.png`, fullPage: true });
      console.log(`Captured ${filename}`);
    } catch (e) {
      console.log(`Failed ${filename}: ${e.message}`);
    }
  }
  
  await browser.close();
}

main().catch(console.error);
