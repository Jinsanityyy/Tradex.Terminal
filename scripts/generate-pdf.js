const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const htmlPath = path.resolve(__dirname, '../public/tradex-agents-guide.html');
  const pdfPath  = path.resolve(__dirname, '../public/tradex-agents-guide.pdf');

  console.log('Launching browser...');
  const browser = await puppeteer.launch({ headless: true });
  const page    = await browser.newPage();

  await page.goto(`file:///${htmlPath.replace(/\\/g, '/')}`, { waitUntil: 'networkidle0', timeout: 30000 });

  // Allow fonts to load
  await new Promise(r => setTimeout(r, 2000));

  console.log('Generating PDF...');
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,   // keeps dark backgrounds
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
    preferCSSPageSize: false,
  });

  await browser.close();
  console.log('Done:', pdfPath);
})();
