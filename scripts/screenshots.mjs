#!/usr/bin/env node
/**
 * Screenshot generator for Mandapam theme
 *
 * Generates screenshots of the theme in different configurations:
 * - Desktop and mobile viewports
 * - Home, venue, facilities, gallery, and contact pages
 *
 * Usage: node scripts/screenshots.mjs [--serve]
 *   --serve: Start Hugo server automatically (otherwise assumes server running on :1313)
 */

import { chromium } from 'playwright';
import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const IMAGES_DIR = join(PROJECT_ROOT, 'images');

const BASE_URL = 'http://localhost:1313';

// Viewport sizes
const DESKTOP = { width: 1280, height: 800 };
const MOBILE = { width: 375, height: 812 };

// Screenshots to capture
const SCREENSHOTS = [
  // Desktop screenshots
  { name: 'screenshot.png', path: '/', viewport: DESKTOP },
  { name: 'screenshot-venue.png', path: '/venue/', viewport: DESKTOP },
  { name: 'screenshot-facilities.png', path: '/facilities/', viewport: DESKTOP },
  { name: 'screenshot-gallery.png', path: '/gallery/', viewport: DESKTOP },
  { name: 'screenshot-contact.png', path: '/contact/', viewport: DESKTOP },

  // Mobile screenshots
  { name: 'screenshot-mobile.png', path: '/', viewport: MOBILE },

  // Theme preview (used for Hugo themes site)
  { name: 'tn.png', path: '/', viewport: { width: 900, height: 600 } },
];

async function startHugoServer() {
  console.log('Starting Hugo server...');

  const hugo = spawn('hugo', ['server', '--buildDrafts'], {
    cwd: join(PROJECT_ROOT, 'exampleSite'),
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      PATH: `${join(PROJECT_ROOT, 'node_modules', '.bin')}:${process.env.PATH}`,
    },
  });

  // Wait for server to be ready
  return new Promise((resolve, reject) => {
    let output = '';

    hugo.stdout.on('data', (data) => {
      output += data.toString();
      if (output.includes('Web Server is available')) {
        console.log('Hugo server ready');
        resolve(hugo);
      }
    });

    hugo.stderr.on('data', (data) => {
      output += data.toString();
    });

    hugo.on('error', reject);

    // Timeout after 30 seconds
    setTimeout(30000).then(() => {
      if (!output.includes('Web Server is available')) {
        hugo.kill();
        reject(new Error('Hugo server failed to start:\n' + output));
      }
    });
  });
}

async function captureScreenshots() {
  const shouldServe = process.argv.includes('--serve');
  let hugoProcess = null;

  try {
    if (shouldServe) {
      hugoProcess = await startHugoServer();
      await setTimeout(3000); // Extra wait for server stability
    }

    console.log('Launching browser...');
    const browser = await chromium.launch();

    for (const shot of SCREENSHOTS) {
      console.log(`Capturing ${shot.name}...`);

      const context = await browser.newContext({
        viewport: shot.viewport,
      });

      const page = await context.newPage();
      await page.goto(`${BASE_URL}${shot.path}`, { waitUntil: 'load', timeout: 60000 });

      // Wait for any animations/transitions
      await setTimeout(500);

      await page.screenshot({
        path: join(IMAGES_DIR, shot.name),
        fullPage: false,
      });

      await context.close();
    }

    await browser.close();
    console.log('Done! Screenshots saved to images/');

  } finally {
    if (hugoProcess) {
      console.log('Stopping Hugo server...');
      hugoProcess.kill();
    }
  }
}

captureScreenshots().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
