import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const chrome='C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const base='http://127.0.0.1:5187';
const sizes=[[320,568],[360,800],[375,667],[375,812],[390,844],[393,852],[412,915],[430,932],[768,1024],[820,1180],[1024,768],[1280,800],[1366,768],[1440,900],[1600,900],[1920,1080]];
const screenshotSizes=new Set(['320x568','375x812','390x844','393x852','430x932','768x1024','1024x768','1440x900','1920x1080']);
await mkdir('qa-screenshots',{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:chrome,args:['--disable-dev-shm-usage']});
const findings=[];
try{
  for(const [width,height] of sizes){
    const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,isMobile:width<600,hasTouch:width<900,reducedMotion:'reduce'});
    const page=await context.newPage();
    const errors=[];
    page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(base,{waitUntil:'networkidle'});
    await page.evaluate(()=>document.querySelectorAll('img[loading="lazy"]').forEach(image=>{image.loading='eager';}));
    await page.waitForFunction(()=>[...document.images].every(image=>image.complete&&image.naturalWidth>0));
    const layout=await page.evaluate(()=>{
      const visible=element=>{const style=getComputedStyle(element),rect=element.getBoundingClientRect();return style.display!=='none'&&style.visibility!=='hidden'&&rect.width>0&&rect.height>0;};
      const bad=[];
      for(const element of document.querySelectorAll('h1,h2,h3,p,blockquote,.button,.direction-option span,img,form,.english-card,.review,.location-card')){
        if(!visible(element))continue;
        const rect=element.getBoundingClientRect();
        if(rect.right>innerWidth+1||rect.left<-1)bad.push({tag:element.tagName,className:element.className,left:rect.left,right:rect.right,text:(element.textContent||'').trim().slice(0,45)});
      }
      const buttons=[...document.querySelectorAll('a.button,button')].filter(visible).map(element=>{const rect=element.getBoundingClientRect();return{className:element.className,width:rect.width,height:rect.height,text:element.textContent.trim()};});
      return{scrollWidth:document.documentElement.scrollWidth,innerWidth,bad,buttons};
    });
    assert.ok(layout.scrollWidth<=width+1,`${width}x${height}: horizontal overflow ${layout.scrollWidth}`);
    assert.deepEqual(layout.bad,[],`${width}x${height}: clipped elements ${JSON.stringify(layout.bad)}`);
    for(const button of layout.buttons)assert.ok(button.height>=43,`${width}x${height}: short button ${button.text} (${button.height})`);
    const runtimeEmoji=await page.evaluate(()=>{
      const isEmoji=character=>/\p{Emoji}/u.test(character)&&!/[0-9#*]/u.test(character);
      const find=(value,source)=>[...String(value||'')].filter(isEmoji).map(character=>`${source}: ${character} U+${character.codePointAt(0).toString(16).toUpperCase()}`);
      const hits=[];
      const walker=document.createTreeWalker(document,NodeFilter.SHOW_TEXT);
      while(walker.nextNode())hits.push(...find(walker.currentNode.nodeValue,walker.currentNode.parentElement?.tagName||'text'));
      for(const element of document.querySelectorAll('*')){
        for(const attribute of element.attributes)hits.push(...find(attribute.value,`${element.tagName}[${attribute.name}]`));
        for(const pseudo of ['::before','::after'])hits.push(...find(getComputedStyle(element,pseudo).content,`${element.tagName}${pseudo}`));
      }
      return hits;
    });
    assert.deepEqual(runtimeEmoji,[],`${width}x${height}: emoji in runtime DOM ${runtimeEmoji.join(' | ')}`);
    assert.equal(errors.length,0,`${width}x${height}: console errors ${errors.join(' | ')}`);
    if(screenshotSizes.has(`${width}x${height}`))await page.screenshot({path:`qa-screenshots/page-${width}x${height}.png`,fullPage:true});
    findings.push(`${width}x${height}: ok`);
    await context.close();
  }

  const context=await browser.newContext({viewport:{width:375,height:812},deviceScaleFactor:1,isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  const page=await context.newPage();
  const errors=[];page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  await page.goto(base,{waitUntil:'networkidle'});
  await page.locator('.menu-toggle').click();
  assert.equal(await page.locator('#navigation').evaluate(element=>getComputedStyle(element).display),'flex');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
  await page.screenshot({path:'qa-screenshots/state-mobile-menu.png'});
  await page.locator('#navigation a').first().click();assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'),'false');
  await page.locator('#signup').scrollIntoViewIfNeeded();
  await page.locator('#submit-lead').click();assert.equal(await page.locator('#parent-error').isVisible(),true);
  await page.screenshot({path:'qa-screenshots/state-form-errors.png'});
  await page.locator('[name="direction"][value="english"]').check();
  await page.locator('#parent').fill('Анна');await page.locator('#age').fill('7');await page.locator('#phone').fill('89271234567');
  await page.evaluate(()=>{const meta=document.createElement('meta');meta.name='lead-endpoint';meta.content='/api/leads';document.head.append(meta);});
  await page.route('**/api/leads',async route=>{await new Promise(resolve=>setTimeout(resolve,500));await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,id:'qa'})});});
  await page.locator('#submit-lead').click();
  assert.equal(await page.locator('#submit-lead').isDisabled(),true);assert.match(await page.locator('#submit-lead').textContent(),/Отправляем/);
  await page.screenshot({path:'qa-screenshots/state-form-loading.png'});
  await page.locator('#success-card').waitFor({state:'visible'});assert.equal(await page.locator('#parent').inputValue(),'');
  await page.screenshot({path:'qa-screenshots/state-form-success.png'});
  assert.equal(errors.length,0,`state checks: console errors ${errors.join(' | ')}`);await context.close();

  const errorContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  const errorPage=await errorContext.newPage();
  await errorPage.goto(base,{waitUntil:'networkidle'});await errorPage.locator('#signup').scrollIntoViewIfNeeded();
  await errorPage.locator('#parent').fill('Анна');await errorPage.locator('#age').fill('7');await errorPage.locator('#phone').fill('89271234567');
  await errorPage.evaluate(()=>{const meta=document.createElement('meta');meta.name='lead-endpoint';meta.content='/api/leads';document.head.append(meta);});
  await errorPage.route('**/api/leads',route=>route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({success:false})}));
  await errorPage.locator('#submit-lead').click();await errorPage.locator('#form-status').waitFor({state:'visible'});
  assert.equal(await errorPage.locator('#success-card').isVisible(),false);await errorPage.screenshot({path:'qa-screenshots/state-form-error.png'});await errorContext.close();
  const report=findings.concat('Interactive states: menu, validation, loading, success and error — ok').join('\n');
  await writeFile('qa-screenshots/audit-report.txt',report,'utf8');console.log(report);
}finally{await browser.close();}
