import {test,expect} from '@playwright/test';
test.use({launchOptions:{executablePath:'/Users/m3bionix/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell',args:['--enable-unsafe-swiftshader']}});
for(const width of [390,1280])test(`square tic tac toe cells and readable anatomy at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:844});await page.emulateMedia({colorScheme:'dark'});
 await page.route('**/api/brain/status',r=>r.fulfill({json:{status:'unavailable'}}));
 await page.goto('http://localhost:5173/#/fly-tic-tac-toe');await expect(page.locator('.ttt-cell')).toHaveCount(9);
 for(const cell of await page.locator('.ttt-cell').all()){
  const box=await cell.boundingBox();expect(Math.abs(box!.width-box!.height)).toBeLessThan(1);
  expect(await cell.evaluate(el=>getComputedStyle(el).borderRadius)).toBe('0px');
 }
 await expect(page.getByText(/Brain above, nerve cord below/)).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
