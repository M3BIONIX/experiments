import {test,expect} from '@playwright/test';
test.use({launchOptions:{executablePath:'/Users/m3bionix/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell'}});
test('clean URLs, direct loads, refresh, back, and legacy hash links',async({page})=>{
 await page.route('**/api/brain/status',r=>r.fulfill({json:{status:'unavailable'}}));
 await page.goto('http://localhost:5173/');await page.getByRole('button',{name:'Fly Logo',exact:true}).click();await page.getByRole('link',{name:'About the experiment',exact:true}).click();await expect(page).toHaveURL('http://localhost:5173/fly-logo');await expect(page.locator('h1')).toHaveText('Fly Logo');await page.reload();await expect(page.locator('h1')).toHaveText('Fly Logo');await page.goBack();await expect(page).toHaveURL('http://localhost:5173/');
 await page.goto('http://localhost:5173/fly-chess');await page.getByRole('link',{name:'Try Fly Chess'}).click();await expect(page).toHaveURL('http://localhost:5173/fly-chess/play');await expect(page.locator('.square')).toHaveCount(64);await page.reload();await expect(page.locator('.square')).toHaveCount(64);await page.getByRole('link',{name:'About this experiment'}).click();await expect(page).toHaveURL('http://localhost:5173/fly-chess');
 await page.goto('http://localhost:5173/#/experiments/fly-logo');await expect(page).toHaveURL('http://localhost:5173/fly-logo');
 await page.goto('http://localhost:5173/#/fly-tic-tac-toe');await expect(page).toHaveURL('http://localhost:5173/fly-tic-tac-toe/play');await expect(page.locator('.ttt-cell')).toHaveCount(9);
});
