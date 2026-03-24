const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  const issues = [];

  console.log('=== REAL USER ISSUES TEST ===\n');

  // Test 1: Check which pages exist
  console.log('1. Checking page existence...\n');
  const allPages = [
    { path: '/', name: 'Homepage' },
    { path: '/feed', name: 'Feed' },
    { path: '/explore', name: 'Explore' },
    { path: '/dashboard', name: 'Dashboard' },
    { path: '/subscriptions', name: 'Subscriptions' },
    { path: '/verify', name: 'Verify' },
    { path: '/governance', name: 'Governance' },
    { path: '/marketplace', name: 'Marketplace' },
    { path: '/developers', name: 'Developers' },
    { path: '/privacy-dashboard', name: 'Privacy Dashboard' },
    { path: '/privacy', name: 'Privacy' },
    { path: '/analytics', name: 'Analytics' },
    { path: '/explorer', name: 'Explorer' },
    { path: '/docs', name: 'Docs' },
    { path: '/vision', name: 'Vision' },
    { path: '/settings', name: 'Settings' },
    { path: '/notifications', name: 'Notifications' }
  ];

  for (const p of allPages) {
    try {
      const response = await page.goto('http://localhost:3000' + p.path, {
        waitUntil: 'networkidle',
        timeout: 15000
      });
      const status = response ? response.status() : 'N/A';

      // Check for actual 404 page content (not just the word "not" anywhere)
      const pageTitle = await page.title();
      const is404 = pageTitle.toLowerCase().includes('404') ||
                    await page.locator('h1:has-text("404"), h1:has-text("Not Found")').count() > 0;

      // Check for visible text content (not just scripts)
      const visibleText = await page.evaluate(() => {
        const body = document.body;
        const clone = body.cloneNode(true);
        clone.querySelectorAll('script, style, noscript').forEach(el => el.remove());
        return clone.textContent.trim().length;
      });

      if (status === 404 || is404) {
        console.log('   ' + p.name + ' (' + p.path + '): 404 NOT FOUND');
        issues.push(p.path + ' returns 404');
      } else if (visibleText < 50) {
        console.log('   ' + p.name + ' (' + p.path + '): BLANK PAGE');
        issues.push(p.path + ' appears blank');
      } else {
        console.log('   ' + p.name + ' (' + p.path + '): OK (' + visibleText + ' chars)');
      }
    } catch (e) {
      console.log('   ' + p.name + ' (' + p.path + '): ERROR - ' + e.message.substring(0, 40));
      issues.push(p.path + ' failed to load');
    }
  }

  // Test 2: Check homepage content more carefully
  console.log('\n2. Checking homepage content...\n');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

  // Check for hero section
  const heroH1 = await page.locator('h1').first().textContent().catch(() => null);
  console.log('   Hero H1: ' + (heroH1 ? '"' + heroH1.substring(0, 50) + '"' : 'NOT FOUND'));

  // Check for main navigation
  const navLinks = await page.locator('nav a, header a').count();
  console.log('   Nav links: ' + navLinks);

  // Check for CTA buttons
  const ctaButtons = await page.locator('button, a[href="/explore"], a[href="/dashboard"]').count();
  console.log('   CTA buttons/links: ' + ctaButtons);

  // Test 3: Test navigation works
  console.log('\n3. Checking navigation...\n');

  // Dismiss any overlays first
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  // Try clicking explore link
  const exploreLink = await page.locator('a[href="/explore"]').first();
  if (await exploreLink.count() > 0) {
    await exploreLink.click();
    await page.waitForLoadState('networkidle');
    const newUrl = page.url();
    if (newUrl.includes('/explore')) {
      console.log('   Explore navigation: WORKS');
    } else {
      console.log('   Explore navigation: FAILED (stayed at ' + newUrl + ')');
      issues.push('Explore link does not navigate');
    }
  } else {
    console.log('   Explore link: NOT FOUND');
  }

  // Test 4: Test creator page
  console.log('\n4. Checking creator page...\n');
  await page.goto('http://localhost:3000/explore', { waitUntil: 'networkidle' });

  const creatorLinks = await page.locator('a[href*="/creator/"]').all();
  console.log('   Creator links on explore: ' + creatorLinks.length);

  if (creatorLinks.length > 0) {
    const firstCreatorHref = await creatorLinks[0].getAttribute('href');
    console.log('   First creator link: ' + firstCreatorHref);

    await creatorLinks[0].click();
    await page.waitForLoadState('networkidle');
    const creatorUrl = page.url();
    console.log('   Navigated to: ' + creatorUrl);

    // Check for subscribe button
    const subscribeBtn = await page.locator('button').filter({ hasText: 'Subscribe' }).first();
    if (await subscribeBtn.count() > 0) {
      console.log('   Subscribe button: FOUND');

      // Click it
      await subscribeBtn.click();
      await page.waitForTimeout(1000);

      // Check for wallet prompt or modal
      const hasModal = await page.locator('[role="dialog"]').count() > 0;
      const hasWalletText = await page.locator('text="Connect"').count() > 0 ||
                            await page.locator('text="wallet"').count() > 0;

      if (hasModal) {
        console.log('   Subscribe click: Opens modal');
      } else if (hasWalletText) {
        console.log('   Subscribe click: Shows wallet prompt');
      } else {
        console.log('   Subscribe click: No visible response');
        issues.push('Subscribe button has no visible response');
      }

      await page.keyboard.press('Escape');
    } else {
      console.log('   Subscribe button: NOT FOUND');
      issues.push('Creator page has no subscribe button');
    }

    // Check for tier info
    const tierInfo = await page.locator('text=/ALEO/i').count();
    console.log('   Price/tier info visible: ' + (tierInfo > 0 ? 'YES' : 'NO'));
  }

  // Test 5: Dashboard compose test
  console.log('\n5. Checking dashboard compose...\n');
  await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle' });

  // Look for compose/post form elements
  const titleInput = await page.locator('input[placeholder*="title"], input[name*="title"]').count();
  const textarea = await page.locator('textarea').count();
  const publishBtn = await page.locator('button').filter({ hasText: /publish|post|save/i }).count();

  console.log('   Title input: ' + (titleInput > 0 ? 'FOUND' : 'NOT FOUND'));
  console.log('   Textarea: ' + (textarea > 0 ? 'FOUND' : 'NOT FOUND'));
  console.log('   Publish button: ' + (publishBtn > 0 ? 'FOUND' : 'NOT FOUND'));

  // Test 6: Mobile test
  console.log('\n6. Checking mobile (390px)...\n');
  await page.setViewportSize({ width: 390, height: 844 });

  for (const path of ['/', '/explore', '/dashboard']) {
    await page.goto('http://localhost:3000' + path, { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);

    // Check for horizontal overflow
    const hasOverflow = await page.evaluate(() => {
      return document.body.scrollWidth > window.innerWidth;
    });

    // Check mobile nav is visible
    const mobileNav = await page.locator('[class*="mobile"], [class*="bottom-nav"]').count();

    if (hasOverflow) {
      console.log('   ' + path + ': OVERFLOW');
      issues.push(path + ' has horizontal overflow on mobile');
    } else {
      console.log('   ' + path + ': OK');
    }
  }

  // Summary
  console.log('\n\n========== SUMMARY ==========');
  if (issues.length === 0) {
    console.log('No critical issues found!');
  } else {
    console.log('Found ' + issues.length + ' issues:');
    issues.forEach(function(i) { console.log('  - ' + i); });
  }

  await browser.close();
})();
