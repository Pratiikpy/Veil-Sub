const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  const pages = [
    '/feed',
    '/explore',
    '/dashboard',
    '/verify',
    '/analytics',
    '/privacy',
    '/docs'
  ];

  for (const path of pages) {
    console.log('\n=== ' + path + ' ===');
    await page.goto('http://localhost:3000' + path, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);

    // Get all text content and find undefined/NaN
    const bodyHtml = await page.content();

    // Check for literal "undefined" in text (not in script tags or comments)
    const textContent = await page.evaluate(() => {
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );
      const texts = [];
      let node;
      while (node = walker.nextNode()) {
        const text = node.textContent.trim();
        if (text.includes('undefined') || text.includes('NaN')) {
          // Get parent element info
          const parent = node.parentElement;
          const parentInfo = parent ? parent.tagName + (parent.className ? '.' + parent.className.split(' ')[0] : '') : 'unknown';
          texts.push({ text: text.substring(0, 100), parent: parentInfo });
        }
      }
      return texts;
    });

    if (textContent.length > 0) {
      console.log('Found ' + textContent.length + ' undefined/NaN instances:');
      textContent.forEach(function(t) {
        console.log('  In <' + t.parent + '>: "' + t.text.substring(0, 60) + '"');
      });
    } else {
      console.log('No undefined/NaN found in visible text');
    }

    // Also check for it in attributes
    const badAttrs = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      const issues = [];
      elements.forEach(el => {
        Array.from(el.attributes).forEach(attr => {
          if (attr.value.includes('undefined') && !attr.name.startsWith('data-')) {
            issues.push(el.tagName + '[' + attr.name + '="' + attr.value.substring(0, 50) + '"]');
          }
        });
      });
      return issues;
    });

    if (badAttrs.length > 0) {
      console.log('Attributes with undefined:');
      badAttrs.slice(0, 5).forEach(function(a) { console.log('  ' + a); });
    }
  }

  await browser.close();
})();
