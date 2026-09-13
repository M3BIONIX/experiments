import {test,expect} from '@playwright/test';
import {Chess} from 'chess.js';
test.use({launchOptions:{executablePath:'/Users/m3bionix/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell',args:['--enable-unsafe-swiftshader']}});
const base='http://localhost:5173';
async function chooseTrial(page:any,value:string){await page.getByRole('button',{name:/Trial /}).click();await page.getByRole('option',{name:`${value.padStart(3,'0')} / 100`,exact:true}).click();}
async function ready(page:any){await page.goto(base+'/#/fly-chess');await expect(page.locator('.game-status')).toContainText('Your turn',{timeout:30000});}
async function move(page:any,from:string,to:string){await page.getByRole('button',{name:new RegExp('^'+from+' ')}).click();await page.getByRole('button',{name:new RegExp('^'+to+' ')}).click();}
test('transport only: twelve legal neural replies and rendering',async({page})=>{
 test.setTimeout(180000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await ready(page);
 for(let i=0;i<12;i++){
  const b=new Chess(await page.locator('.chessboard').getAttribute('data-fen') as string);if(b.isGameOver())break;
  const m=b.moves({verbose:true}).find(m=>!m.promotion)!;await move(page,m.from,m.to);
  await expect(page.locator('.game-status')).toContainText(/Your turn|check|wins|win|draw/i,{timeout:45000});
  const next=new Chess(await page.locator('.chessboard').getAttribute('data-fen') as string);expect(next.turn()).toBe('w');
 }
 await expect(page.locator('.brain-canvas canvas')).toBeVisible();expect(errors).toEqual([]);
 await page.screenshot({path:'/tmp/chess-desktop.png',fullPage:true});
});
test('busy request retries and a failed stream can recover',async({page})=>{
 await ready(page);let calls=0;
 await page.route('**/api/brain/play',async route=>{calls++;if(calls===1)return route.fulfill({status:429,json:{detail:'Busy'}});if(calls===2)return route.fulfill({contentType:'application/x-ndjson',body:JSON.stringify({type:'error',message:'Test interruption'})+'\n'});await route.continue();});
 await move(page,'e2','e4');await expect(page.getByRole('alert')).toContainText('Test interruption');expect(calls).toBe(2);
 await page.getByRole('button',{name:'Retry fly move'}).click();await expect(page.locator('.game-status')).toContainText('Your turn',{timeout:30000});
});
test('new game discards a late response',async({page})=>{
 await ready(page);await page.route('**/api/brain/play',async route=>{await new Promise(r=>setTimeout(r,1000));await route.fulfill({contentType:'application/x-ndjson',body:JSON.stringify({type:'result',move:'e7e5',telemetry:{}})+'\n'}).catch(()=>{});});
 await move(page,'e2','e4');await page.getByRole('button',{name:'New game',exact:true}).click();await page.waitForTimeout(1400);expect(await page.locator('.chessboard').getAttribute('data-fen')).toBe(new Chess().fen());
});
test('mobile pages, four experiments, replay and back navigation',async({page})=>{
 await page.setViewportSize({width:390,height:844});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/#/');await expect(page.locator('.banner')).toHaveCount(0);await expect(page.locator('.experiment-trigger')).toHaveCount(4);
 await page.getByRole('button',{name:'Fly Logo',exact:true}).click();await page.getByRole('link',{name:'About the experiment'}).click();await expect(page.locator('h1')).toHaveText('Fly Logo');
 await page.getByRole('link',{name:'Explore results',exact:true}).click();await page.getByRole('button',{name:/Trial /}).click();await expect(page.getByRole('option')).toHaveCount(100);await page.keyboard.press('Escape');await expect(page.locator('#play')).toBeEnabled();
 await chooseTrial(page,'100');await expect(page.locator('#download')).toHaveAttribute('href','/reports/neural-logo/trial-100.json');await page.locator('#play').click();await expect(page.locator('#play')).toHaveText('Pause');
 await page.screenshot({path:'/tmp/logo-mobile.png',fullPage:true});await page.getByRole('link',{name:'About Fly Logo'}).click();await expect(page.locator('h1')).toHaveText('Fly Logo');
 await ready(page);await expect(page.locator('.brain-canvas canvas')).toBeVisible({timeout:30000});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'/tmp/chess-mobile.png',fullPage:true});expect(errors).toEqual([]);
});
async function replies(page:any,moves:string[]){let i=0;await page.route('**/api/brain/play',route=>route.fulfill({contentType:'application/x-ndjson',body:JSON.stringify({type:'result',move:moves[i++],telemetry:{total_spikes:1,output_spikes:1,simulated_ms:100,compute_seconds:0,tied_moves:1,selected_score:1}})+'\n'}));}
test('castling and en passant work through the board controls',async({page})=>{
 await ready(page);await replies(page,['e7e5','b8c6','g8f6','d7d6']);
 for(const [a,b] of [['e2','e4'],['g1','f3'],['f1','c4'],['e1','g1']]){await move(page,a,b);await expect(page.locator('.game-status')).toContainText('Your turn');}
 let board=new Chess(await page.locator('.chessboard').getAttribute('data-fen') as string);expect(board.get('g1')?.type).toBe('k');expect(board.get('f1')?.type).toBe('r');
 await page.getByRole('button',{name:'New game',exact:true}).click();await page.unroute('**/api/brain/play');await replies(page,['a7a6','d7d5','g8f6']);
 for(const [a,b] of [['e2','e4'],['e4','e5'],['e5','d6']]){await move(page,a,b);await expect(page.locator('.game-status')).toContainText('Your turn');}
 board=new Chess(await page.locator('.chessboard').getAttribute('data-fen') as string);expect(board.get('d5')).toBeUndefined();expect(board.get('d6')?.color).toBe('w');
});
test('promotion chooser and black promotion',async({page})=>{
 await ready(page);await replies(page,['h7h5','h8h7','h5h4','h4h3','h3g2','g2h1b']);
 for(const [a,b] of [['a2','a3'],['a3','a4'],['a4','a5'],['a5','a6'],['a6','b7']]){await move(page,a,b);await expect(page.locator('.game-status')).toContainText('Your turn');}
 await move(page,'b7','a8');await expect(page.getByRole('group',{name:'Choose promotion'})).toBeVisible();await page.getByRole('button',{name:'queen',exact:true}).click();await expect(page.locator('.game-status')).toContainText('Your turn');
 const b=new Chess(await page.locator('.chessboard').getAttribute('data-fen') as string);expect(b.get('a8')?.type).toBe('q');expect(b.get('h1')?.type).toBe('b');
});
test('checkmate stops play; a hanging response exposes retry',async({page})=>{
 await ready(page);await replies(page,['e7e5','d8h4']);await move(page,'f2','f3');await expect(page.locator('.game-status')).toContainText('Your turn');await move(page,'g2','g4');await expect(page.locator('.game-status')).toHaveText('The fly wins.');await expect(page.locator('.square:not(:disabled)')).toHaveCount(0);
 await page.getByRole('button',{name:'New game',exact:true}).click();await page.unroute('**/api/brain/play');await page.route('**/api/brain/play',()=>{});await page.clock.install();await move(page,'e2','e4');await page.clock.fastForward(46000);await expect(page.getByRole('alert')).toContainText('took too long');await expect(page.getByRole('button',{name:'Retry fly move'})).toBeVisible();
});
test('offline simulator state and reduced motion on narrow screens',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce',colorScheme:'dark'});await page.setViewportSize({width:320,height:740});await page.route('**/api/brain/status',route=>route.fulfill({json:{status:'unavailable'}}));await page.goto(base+'/#/fly-chess');await expect(page.getByRole('button',{name:'Check connection'})).toBeVisible();await expect(page.locator('.square:not(:disabled)')).toHaveCount(0);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(await page.evaluate(()=>document.getAnimations().length)).toBe(0);await page.screenshot({path:'/tmp/chess-dark-narrow.png',fullPage:true});
});
test('tic tac toe completes and resets',async({page})=>{
 await page.goto(base+'/#/fly-tic-tac-toe');await expect(page.locator('.game-status')).toContainText('Your turn',{timeout:30000});await replies(page,['3','4']);
 for(const i of [0,1]){await page.locator('.ttt-cell').nth(i).click();await expect(page.locator('.game-status')).toContainText('Your turn');}await page.locator('.ttt-cell').nth(2).click();await expect(page.locator('.game-status')).toHaveText('You win.');await page.getByRole('button',{name:'New game',exact:true}).click();await expect(page.locator('.ttt-cell:not(:disabled)')).toHaveCount(9);
});
test('report loading failure has recovery and late trial responses are discarded',async({page})=>{
 await page.route('**/trial-001.json',route=>route.fulfill({status:503,body:'unavailable'}));await page.goto(base+'/reports/neural-logo/index.html');await expect(page.locator('#load-error')).toBeVisible();await expect(page.locator('#play')).toBeDisabled();await page.unroute('**/trial-001.json');await page.locator('#retry').click();await expect(page.locator('#play')).toBeEnabled();
 await page.route('**/trial-002.json',async route=>{await new Promise(r=>setTimeout(r,600));await route.continue()});await chooseTrial(page,'2');await chooseTrial(page,'3');await expect(page.locator('#download')).toHaveAttribute('href','/reports/neural-logo/trial-003.json');await page.waitForTimeout(800);await expect(page.locator('#download')).toHaveAttribute('href','/reports/neural-logo/trial-003.json');
});
test('neuron geometry recovers from failure and is reused between games',async({page})=>{
 let calls=0;await page.route('**/api/brain/geometry',async route=>{calls++;if(calls===1)return route.fulfill({status:503,body:'Unavailable'});await route.continue();});
 await ready(page);await expect(page.getByRole('button',{name:'Reload 3D view'})).toBeVisible();await page.getByRole('button',{name:'Reload 3D view'}).click();await expect(page.locator('.brain-canvas canvas')).toBeVisible({timeout:30000});
 await page.evaluate(()=>location.hash='#/fly-tic-tac-toe');await expect(page.locator('h1')).toHaveText('Fly Tic Tac Toe');await expect(page.locator('.brain-canvas canvas')).toBeVisible();expect(calls).toBe(2);
});
