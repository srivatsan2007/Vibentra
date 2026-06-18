const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    page.on('pageerror', error => {
        console.error('Page Error:', error.message);
    });
    
    page.on('console', msg => {
        if (msg.type() === 'error') {
            console.error('Console Error:', msg.text());
        } else {
            console.log('Console:', msg.text());
        }
    });

    try {
        await page.goto('http://localhost:5000/pages/home.html', {waitUntil: 'networkidle0'});
        console.log("Page loaded successfully.");
    } catch (e) {
        console.error("Failed to load page:", e.message);
    }
    
    await browser.close();
})();
