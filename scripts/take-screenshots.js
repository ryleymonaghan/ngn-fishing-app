#!/usr/bin/env node
/**
 * NGN Fishing — App Store Screenshot Capture
 *
 * Takes screenshots of ngnfishing.com at all required device sizes:
 *   - iPhone 6.7" (1290x2796) — iPhone 15 Pro Max
 *   - iPhone 6.5" (1284x2778) — iPhone 14 Plus
 *   - iPad 12.9"  (2048x2732) — iPad Pro
 *
 * Usage:
 *   cd ~/Desktop/ngn-fishing-app-updated
 *   npm install puppeteer
 *   node scripts/take-screenshots.js
 *
 * Screenshots saved to: ~/Documents/Claude/Projects/NGN Fishing/screenshots/
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const os = require('os');

const BASE_URL = 'https://ngnfishing.com';
const OUTPUT_DIR = path.join(os.homedir(), 'Documents', 'Claude', 'Projects', 'NGN Fishing', 'screenshots');

// Demo credentials for authenticated screens
const DEMO_EMAIL = 'demo@ngnfishing.com';
const DEMO_PASS = 'TightLines2026!';

// Device configs — EXACT App Store required pixel dimensions
const DEVICES = [
  { name: 'iPhone_6_7', width: 1290, height: 2796, label: 'iPhone 15 Pro Max' },
  { name: 'iPhone_6_5', width: 1284, height: 2778, label: 'iPhone 14 Plus' },
  { name: 'iPad_12_9',  width: 2048, height: 2732, label: 'iPad Pro 12.9"' },
];

// Screens to capture (route + descriptive filename)
const SCREENS = [
  { route: '/',                   name: '01-dashboard',        desc: 'Conditions dashboard' },
  { route: '/tabs/reports',       name: '02-report-wizard',    desc: 'Report wizard' },
  { route: '/tabs/spots',         name: '03-spot-map',         desc: 'GPS Spot Map' },
  { route: '/wizard/step2',       name: '04-species-select',   desc: 'Species selection' },
  { route: '/tabs/catches',       name: '05-catches',          desc: 'Trip catches' },
  { route: '/tabs/knots',         name: '06-knots-guide',      desc: 'Knot guide' },
  { route: '/tabs/profile',       name: '07-profile',          desc: 'Profile & settings' },
  { route: '/tabs/shop',          name: '08-gear-shop',        desc: 'Gear shop' },
];

async function run() {
  // Create output dirs
  for (const device of DEVICES) {
    const dir = path.join(OUTPUT_DIR, device.name);
    fs.mkdirSync(dir, { recursive: true });
  }

  console.log('🎣 NGN Fishing — App Store Screenshot Capture');
  console.log(`   Output: ${OUTPUT_DIR}\n`);

  const browser = await puppeteer.launch({
    headless: false,  // Show browser so you can see what's happening
    defaultViewport: null,
  });

  for (const device of DEVICES) {
    console.log(`\n📱 ${device.label} (${device.width}x${device.height})`);
    console.log('─'.repeat(50));

    const page = await browser.newPage();

    // Set viewport to EXACT App Store pixel dimensions (no scaling)
    await page.setViewport({
      width: device.width,
      height: device.height,
      deviceScaleFactor: 1,
      isMobile: device.name.startsWith('iPhone'),
      hasTouch: true,
    });

    // Set dark background to match app theme
    await page.evaluateOnNewDocument(() => {
      document.documentElement.style.backgroundColor = '#060E1A';
    });

    for (const screen of SCREENS) {
      const url = `${BASE_URL}${screen.route}`;
      const filename = `${screen.name}.png`;
      const filepath = path.join(OUTPUT_DIR, device.name, filename);

      try {
        console.log(`   📸 ${screen.desc}...`);
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });
        // Wait a beat for animations / data to load
        await new Promise(r => setTimeout(r, 2500));
        await page.screenshot({ path: filepath, fullPage: false });
        console.log(`      ✅ ${filepath}`);
      } catch (err) {
        console.log(`      ❌ Failed: ${err.message}`);
      }
    }

    await page.close();
  }

  console.log('\n✅ Done! Screenshots saved to:');
  console.log(`   ${OUTPUT_DIR}\n`);
  console.log('📋 Upload these to App Store Connect:');
  console.log('   • iPhone_6_7/ → "iPhone 6.7-inch Display"');
  console.log('   • iPhone_6_5/ → "iPhone 6.5-inch Display"');
  console.log('   • iPad_12_9/  → "iPad Pro (6th Gen) 12.9-inch Display"\n');

  await browser.close();
}

run().catch(console.error);
