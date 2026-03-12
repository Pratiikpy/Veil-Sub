import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  
  // Homepage with shorter timeout
  try {
    await page.goto('http://localhost:3000/?judge=1', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(3000); 
    await page.screenshot({ path: 'screenshots/desktop-home.png', fullPage: true });
    console.log('Captured home');
  } catch (e) {
    console.log('Failed home:', e.message);
  }
  
  // Explorer
  try {
    await page.goto('http://localhost:3000/explorer?judge=1', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'screenshots/desktop-explorer.png', fullPage: true });
    console.log('Captured explorer');
  } catch (e) {
    console.log('Failed explorer:', e.message);
  }
  
  // Mobile screenshots
  await context.close();
  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mobilePage = await mobileContext.newPage();
  
  const routes = [['explore', '/explore'], ['verify', '/verify'], ['dashboard', '/dashboard']];
  for (const [name, route] of routes) {
    try {
      await mobilePage.goto('http://localhost:3000' + route + '?judge=1', { waitUntil: 'domcontentloaded', timeout: 15000 });
      await mobilePage.waitForTimeout(2000);
      await mobilePage.screenshot({ path: 'screenshots/mobile-' + name + '.png', fullPage: true });
      console.log('Captured mobile ' + name);
    } catch (e) {
      console.log('Failed mobile ' + name + ': ' + e.message);
    }
  }
  
  await browser.close();
}

main().catch(console.error);
