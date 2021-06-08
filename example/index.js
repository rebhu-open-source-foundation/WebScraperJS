const puppeteer = require('puppeteer');
const iPhone = puppeteer.devices['iPhone 6'];

(async () => {
  console.log("asdsad");
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.emulate(iPhone);
  await page.goto('https://www.google.com');
  // other actions...
  await browser.close();
})();