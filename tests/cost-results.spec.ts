import {test,expect} from '@playwright/test';
test.use({launchOptions:{executablePath:'/Users/m3bionix/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell'}});
test('latest cost experiment only, readable results and mobile layout',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('http://localhost:5173/fly-logo');
 for(const title of ['Why we tried this','What we did','What we observed','What the results mean'])await expect(page.getByRole('heading',{name:title,exact:true})).toBeAttached();
 await expect(page.getByText(/Every recorded first approach was toward the east position/)).toBeAttached();
 await expect(page.locator('a[href*="reward-followup"],a[href*="neural-logo"]')).toHaveCount(0);
 await expect(page.locator('.research-figure img')).toHaveAttribute('src','/reports/cost-learning/results.png');
 await page.locator('.reward-results').scrollIntoViewIfNeeded();await page.waitForTimeout(500);await page.screenshot({path:'/tmp/cost-mobile.png'});
 await page.setViewportSize({width:320,height:740});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole('button',{name:'Did the fly experience a penalty and return?'}).click();await expect(page.locator('caption').filter({hasText:'Entry-penalty test'})).toBeVisible();
});
