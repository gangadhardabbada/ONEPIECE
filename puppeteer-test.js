const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1800, height: 1200 });
  
  await page.goto('http://localhost:5173');
  
  // Wait for the file input
  await page.waitForSelector('input[type="file"]');
  
  // Upload a file (using the artifact image)
  const fileInput = await page.$('input[type="file"]');
  await fileInput.uploadFile('C:/Users/Lenovo/.gemini/antigravity-ide/brain/94db39e4-df2c-41b1-8239-ad991b18a58e/media__1786638097478.jpg');
  
  // Wait for the result to render
  await page.waitForTimeout(3000);
  
  // Take screenshot
  await page.screenshot({ path: 'test_render_layout.png' });
  
  await browser.close();
})();
