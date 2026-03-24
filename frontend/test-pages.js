const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  const pages = [
    '/',
    '/explore',
    '/dashboard',
    '/verify',
    '/docs',
    '/analytics',
    '/privacy',
    '/vision',
    '/explorer'
  ];

  const issues = [];

  for (const path of pages) {
    const url = 'http://localhost:3000' + path;
    console.log('\n--- Testing ' + url + ' ---');

    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      const title = await page.title();
      console.log('Title: ' + title);

      // Check for blank page
      const bodyText = await page.textContent('body');
      if (!bodyText || bodyText.trim().length < 50) {
        issues.push(path + ': Blank or nearly blank page');
        console.log('WARNING: Page appears blank!');
      }

      // Check for undefined/NaN
      const hasUndefined = await page.locator('text=/undefined|NaN/').count();
      if (hasUndefined > 0) {
        issues.push(path + ': Shows undefined/NaN (' + hasUndefined + ' instances)');
        console.log('WARNING: Found ' + hasUndefined + ' undefined/NaN instances');
      }

      // Take screenshot
      const screenshotPath = '/tmp/page' + path.replace(/\//g, '_') + '.png';
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log('Screenshot saved to ' + screenshotPath);

    } catch (err) {
      issues.push(path + ': Error - ' + err.message);
      console.log('ERROR: ' + err.message);
    }
  }

  console.log('\n\n=== SUMMARY ===');
  if (issues.length === 0) {
    console.log('No critical issues found!');
  } else {
    console.log('Found ' + issues.length + ' issues:');
    issues.forEach(function(i) { console.log('  - ' + i); });
  }

  await browser.close();
})();
