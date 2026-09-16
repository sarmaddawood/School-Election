import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

(async () => {
  try {
    const browser = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
    const page = await browser.newPage();
    
    // Set to iPhone 12 Pro dimensions
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    
    console.log("On login page");
    // Wait for the input to appear
    await page.waitForSelector('input[type="text"]', { timeout: 10000 });
    
    // Focus and type ADMIN
    await page.type('input[type="text"]', 'ADMIN');
    await page.type('input[type="password"]', 'password123');
    
    console.log("Filled login form");
    await page.click('button[type="submit"]');
    
    console.log("Clicked login, waiting for network");
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 }).catch(e => console.log("No navigation event"));
    await new Promise(r => setTimeout(r, 2000));
    
    console.log("Finding Calendar tab...");
    // Let's take a screenshot just in case we can't find the calendar
    await page.screenshot({ path: 'C:/Users/sarma/.gemini/antigravity/brain/7e118d1d-70cd-488e-b0f4-35d096192e13/mobile_dashboard.png' });

    // Look for Calendar tab
    const tabs = await page.$$('button, a');
    let clicked = false;
    for (const btn of tabs) {
      const text = await page.evaluate(el => el.textContent || el.innerText, btn);
      if (text && text.toLowerCase().includes('calendar')) {
        await page.evaluate(el => el.click(), btn);
        clicked = true;
        break;
      }
    }
    
    if (clicked) {
      console.log("Clicked calendar tab, waiting for it to render...");
      await new Promise(r => setTimeout(r, 2000));
      await page.screenshot({ path: 'C:/Users/sarma/.gemini/antigravity/brain/7e118d1d-70cd-488e-b0f4-35d096192e13/mobile_calendar.png' });
      console.log("Calendar screenshot saved.");
    } else {
      console.log("Could not find calendar tab.");
    }
    
    await browser.close();
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
})();
