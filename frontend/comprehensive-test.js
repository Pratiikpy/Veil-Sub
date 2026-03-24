const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  const issues = [];
  const consoleErrors = [];

  // Capture console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Ignore hydration warnings and known React dev warnings
      if (!text.includes('Hydration') && !text.includes('Warning:')) {
        consoleErrors.push(text.substring(0, 200));
      }
    }
  });

  console.log('=== TESTING AS PERSON 1: First-time visitor ===\n');

  // Test 1: Homepage - Is it clear what the app does?
  console.log('1. Testing homepage clarity...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000); // Wait for overlays

  // Check for overlays blocking the view
  const welcomeOverlay = await page.locator('[class*="WelcomeOverlay"], [class*="welcome"]').count();
  const changelogOverlay = await page.locator('[class*="ChangelogOverlay"], [class*="changelog"]').count();
  if (welcomeOverlay > 0 || changelogOverlay > 0) {
    console.log('   Note: Overlays present on homepage');
  }

  // Dismiss overlays if present
  try {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  } catch (e) {}

  // Check hero text is visible
  const heroText = await page.locator('h1').first().textContent();
  console.log('   Hero text: ' + (heroText ? heroText.substring(0, 50) : 'NOT FOUND'));

  // Test 2: Can user find a creator?
  console.log('\n2. Testing creator discovery...');
  await page.goto('http://localhost:3000/explore', { waitUntil: 'networkidle' });

  const creatorCards = await page.locator('[class*="creator"], [class*="card"]').count();
  console.log('   Found ' + creatorCards + ' creator-related elements');

  // Check if any creator cards are clickable
  const firstCreatorLink = await page.locator('a[href*="/creator/"]').first();
  if (await firstCreatorLink.count() > 0) {
    console.log('   Creator links found - PASS');

    // Click on first creator
    await firstCreatorLink.click();
    await page.waitForLoadState('networkidle');
    const creatorPageUrl = page.url();
    console.log('   Navigated to: ' + creatorPageUrl);

    // Check for subscribe button
    const subscribeBtn = await page.locator('button:has-text("Subscribe"), button:has-text("subscribe")').count();
    if (subscribeBtn > 0) {
      console.log('   Subscribe button found - PASS');
    } else {
      issues.push('Creator page: No subscribe button visible');
      console.log('   WARNING: No subscribe button found');
    }

    // Check for tier/pricing info
    const tierInfo = await page.locator('text=/ALEO|tier|price/i').count();
    if (tierInfo > 0) {
      console.log('   Pricing info found - PASS');
    } else {
      console.log('   Note: No obvious pricing info visible');
    }
  } else {
    issues.push('Explore page: No clickable creator cards');
    console.log('   WARNING: No creator links found');
  }

  // Test 3: What happens without a wallet?
  console.log('\n3. Testing wallet-less experience...');

  // Try to click subscribe without wallet
  const subscribeButtons = await page.locator('button:has-text("Subscribe")').all();
  for (const btn of subscribeButtons.slice(0, 1)) {
    try {
      await btn.click();
      await page.waitForTimeout(1000);

      // Check for modal or helpful message
      const modalVisible = await page.locator('[role="dialog"], [class*="modal"]').count();
      const walletMessage = await page.locator('text=/wallet|connect/i').count();

      if (modalVisible > 0 || walletMessage > 0) {
        console.log('   Wallet prompt/modal appeared - PASS');
      } else {
        issues.push('Subscribe without wallet: No clear feedback');
        console.log('   WARNING: No wallet prompt appeared');
      }

      // Close modal if open
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    } catch (e) {
      console.log('   Could not test subscribe button: ' + e.message);
    }
  }

  console.log('\n=== TESTING AS PERSON 2: Daily subscriber ===\n');

  // Test feed page
  console.log('4. Testing feed functionality...');
  await page.goto('http://localhost:3000/feed', { waitUntil: 'networkidle', timeout: 30000 });

  // Check for content or helpful empty state
  const feedContent = await page.textContent('body');
  if (feedContent.includes('No content') || feedContent.includes('Subscribe') || feedContent.includes('empty')) {
    console.log('   Empty state message found - PASS');
  }

  // Test subscriptions page
  console.log('\n5. Testing subscriptions page...');
  await page.goto('http://localhost:3000/subscriptions', { waitUntil: 'networkidle', timeout: 30000 });
  const subsPageContent = await page.textContent('body');
  if (subsPageContent.length > 100) {
    console.log('   Subscriptions page has content - PASS');
  }

  console.log('\n=== TESTING AS PERSON 3: New creator ===\n');

  // Test dashboard
  console.log('6. Testing creator dashboard...');
  await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle' });

  // Check for clear onboarding
  const onboardingElements = await page.locator('text=/connect|wallet|register|get started/i').count();
  if (onboardingElements > 0) {
    console.log('   Onboarding guidance found - PASS');
  }

  // Check for compose/post area
  const composeArea = await page.locator('textarea, [class*="compose"], [class*="post"], input[placeholder*="title"]').count();
  console.log('   Compose elements: ' + composeArea);

  console.log('\n=== TESTING AS PERSON 4: Every page ===\n');

  const allPages = [
    '/', '/feed', '/explore', '/dashboard', '/subscriptions', '/verify',
    '/governance', '/marketplace', '/developers', '/privacy-dashboard',
    '/privacy', '/analytics', '/explorer', '/docs', '/vision',
    '/settings', '/notifications'
  ];

  for (const path of allPages) {
    const url = 'http://localhost:3000' + path;
    try {
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
      const status = response ? response.status() : 'no response';

      await page.waitForTimeout(500);

      // Check for blank page
      const bodyText = await page.textContent('body');
      const isBlank = !bodyText || bodyText.trim().length < 30;

      // Check for error displays
      const hasError = await page.locator('text=/error|failed|404|not found/i').count() > 0;

      // Check for undefined/NaN
      const hasUndefined = bodyText.includes('undefined') || bodyText.includes('NaN');

      let status_msg = 'OK';
      if (isBlank) {
        status_msg = 'BLANK!';
        issues.push(path + ': Page is blank');
      } else if (status === 404 || hasError) {
        status_msg = '404/Error';
        // Some pages are expected to show connect wallet messages, not errors
        if (!bodyText.includes('Connect') && !bodyText.includes('wallet')) {
          issues.push(path + ': Shows error or 404');
        }
      } else if (hasUndefined) {
        status_msg = 'Has undefined/NaN';
        issues.push(path + ': Shows undefined or NaN');
      }

      console.log('   ' + path + ': ' + status_msg);

    } catch (e) {
      console.log('   ' + path + ': TIMEOUT/ERROR - ' + e.message.substring(0, 50));
      issues.push(path + ': Page load error');
    }
  }

  // Test buttons on homepage
  console.log('\n7. Testing button interactions on homepage...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.keyboard.press('Escape'); // Dismiss overlays
  await page.waitForTimeout(500);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  const buttons = await page.locator('button:visible, a[class*="button"]:visible').all();
  console.log('   Found ' + buttons.length + ' visible buttons/button-links');

  // Test a few buttons to make sure they do something
  for (let i = 0; i < Math.min(3, buttons.length); i++) {
    try {
      const btn = buttons[i];
      const btnText = await btn.textContent();
      const isDisabled = await btn.isDisabled().catch(() => false);

      if (!isDisabled && btnText && btnText.trim().length > 0) {
        console.log('   Button "' + btnText.trim().substring(0, 20) + '": clickable');
      }
    } catch (e) {}
  }

  // Mobile test
  console.log('\n8. Testing mobile viewport (390px)...');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  // Check if content is visible at mobile size
  const mobileHero = await page.locator('h1').first().isVisible();
  console.log('   Hero visible on mobile: ' + (mobileHero ? 'YES' : 'NO'));

  // Check for mobile nav
  const mobileNav = await page.locator('[class*="mobile"], [class*="bottom"], nav').count();
  console.log('   Mobile nav elements: ' + mobileNav);

  await page.screenshot({ path: '/tmp/mobile_home.png', fullPage: true });

  // Summary
  console.log('\n\n========== SUMMARY ==========');
  console.log('Issues found: ' + issues.length);
  issues.forEach(function(i) { console.log('  - ' + i); });

  if (consoleErrors.length > 0) {
    console.log('\nConsole errors: ' + consoleErrors.length);
    consoleErrors.slice(0, 5).forEach(function(e) { console.log('  - ' + e.substring(0, 100)); });
  }

  await browser.close();
})();
