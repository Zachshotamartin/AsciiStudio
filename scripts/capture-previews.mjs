import { chromium } from '@playwright/test';
import { writeFile, mkdir } from 'node:fs/promises';
const browser=await chromium.launch();const page=await browser.newPage({viewport:{width:1440,height:1050},reducedMotion:'reduce'});
await mkdir('output/review',{recursive:true});
for (const mode of ['donut','studio']) {
 await page.goto(`http://127.0.0.1:4191/#${mode}`);
 await page.locator('[data-ascii-canvas][data-frame]').waitFor();
 await page.getByRole('button',{name:mode==='donut'?'Candy shop':'Terminal',exact:true}).click();
 await page.waitForTimeout(150);
 const png=await page.locator('[data-ascii-canvas]').evaluate(c=>c.toDataURL().split(',')[1]);
 await writeFile(`public/examples/ascii-${mode}.png`,Buffer.from(png,'base64'));
 await page.screenshot({path:`output/review/${mode}-desktop.png`,fullPage:true});
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:`output/review/${mode}-mobile.png`,fullPage:true});
 await page.setViewportSize({width:1440,height:1050});
}
await browser.close();
