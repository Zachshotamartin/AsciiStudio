import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
const hash = page => page.locator('[data-ascii-canvas]').evaluate(c=>c.toDataURL());
const ready=async(page,mode='studio')=>{await page.goto(`/#${mode}`);await expect(page.locator('[data-ascii-canvas]')).toHaveAttribute('data-frame',/\d+/);};
async function change(page,label,value){await page.getByRole('slider',{name:label,exact:true}).fill(String(value));}
test('donut animates, pauses, responds to dough and palettes, and exports ASCII text',async({page})=>{
 await ready(page,'donut');const a=await hash(page);await expect.poll(()=>hash(page)).not.toBe(a);
 await page.getByRole('button',{name:'Pause spin',exact:true}).click();const paused=await hash(page);await page.waitForTimeout(160);expect(await hash(page)).toBe(paused);
 await change(page,'Dough thickness',.3);await expect.poll(()=>hash(page)).not.toBe(paused);
 const small=await hash(page);await page.getByRole('button',{name:'Candy shop',exact:true}).click();await expect.poll(()=>hash(page)).not.toBe(small);
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Save text',exact:true}).click();const text=await readFile(await(await download).path(),'utf8');expect(text.split('\n').length).toBeGreaterThan(20);expect(text).toContain('*');
});
test('real image upload, paused settings, custom alphabet, original comparison, and PNG export',async({page})=>{
 await ready(page);const png=await page.locator('[data-original-canvas]').evaluate(()=>{const c=document.createElement('canvas');c.width=64;c.height=32;const x=c.getContext('2d');x.fillStyle='black';x.fillRect(0,0,64,32);x.fillStyle='white';x.fillRect(32,0,32,32);return c.toDataURL().split(',')[1];});
 await page.getByLabel('Upload image',{exact:true}).setInputFiles({name:'two-tones.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});await expect(page.locator('[data-source-name]')).toHaveText('two-tones.png');
 const before=await hash(page);await page.getByLabel('Invert character density').check();await expect.poll(()=>hash(page)).not.toBe(before);
 await page.getByLabel('Character set',{exact:true}).selectOption('custom');await page.getByLabel('Custom characters',{exact:true}).fill(' XO');await page.locator('.ascii-text-details summary').click();await expect(page.locator('[data-text]')).toContainText('O');
 await page.getByRole('button',{name:'Show original',exact:true}).click();await expect(page.locator('[data-original-canvas]')).toBeVisible();await page.getByRole('button',{name:'Show ASCII',exact:true}).click();
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Save PNG',exact:true}).click();const bytes=await readFile(await(await download).path());expect(bytes.subarray(1,4).toString()).toBe('PNG');
});
test('uploaded video plays, seeks, recolors while paused, and exports a decodable changing clip',async({page})=>{
 await ready(page);await page.getByLabel('Upload video',{exact:true}).setInputFiles('public/examples/motion.webm');await expect(page.locator('[data-source-name]')).toHaveText('motion.webm');
 const start=await hash(page);await page.getByRole('button',{name:'Play video',exact:true}).click();await expect.poll(()=>hash(page)).not.toBe(start);await page.getByRole('button',{name:'Pause video',exact:true}).click();
 await change(page,'Video position',1);const paused=await hash(page);await change(page,'Contrast',2.5);await expect.poll(()=>hash(page)).not.toBe(paused);
 await change(page,'Video position',0);
 const event=page.waitForEvent('download');await page.getByRole('button',{name:'Export video',exact:true}).click();await expect(page.getByRole('button',{name:'Cancel export',exact:true})).toBeVisible();const download=await event;const bytes=await readFile(await download.path());expect(bytes.length).toBeGreaterThan(5000);
 const frames=await page.evaluate(async encoded=>{const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));const url=URL.createObjectURL(new Blob([bytes],{type:'video/webm'}));const v=document.createElement('video');v.muted=true;v.src=url;await new Promise((resolve,reject)=>{v.onloadeddata=resolve;v.onerror=reject;});const c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;const ctx=c.getContext('2d');const capture=()=>{ctx.drawImage(v,0,0);return c.toDataURL();};const first=capture();v.currentTime=1;await new Promise(resolve=>v.onseeked=resolve);const second=capture();v.removeAttribute('src');v.load();URL.revokeObjectURL(url);return {first,second,width:c.width};},bytes.toString('base64'));
 expect(frames.width).toBeGreaterThan(100);expect(frames.first).not.toBe(frames.second);
});
test('video cancellation and invalid files recover; replacing a source retains new controls',async({page})=>{
 await ready(page);await page.getByRole('button',{name:'Try a video',exact:true}).click();await expect(page.locator('[data-source-name]')).toHaveText('Color parade');await page.getByRole('button',{name:'Export video',exact:true}).click();await page.getByRole('button',{name:'Cancel export',exact:true}).click();await expect(page.locator('.ascii-status')).toContainText('canceled');
 await page.getByLabel('Upload image',{exact:true}).setInputFiles({name:'broken.png',mimeType:'image/png',buffer:Buffer.from('not an image')});await expect(page.getByRole('alert')).toContainText('cannot decode');
 await page.getByRole('button',{name:'Try a still life',exact:true}).click();await expect(page.getByRole('alert')).toBeHidden();await expect(page.locator('[data-source-name]')).toHaveText('Studio still life');await change(page,'Detail',80);await expect(page.locator('[data-ascii-canvas]')).toHaveAttribute('data-columns','80');
});
for(const width of [1440,390,320])test(`both playgrounds fit at ${width}px and respect reduced motion`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.emulateMedia({reducedMotion:'reduce'});
 for(const mode of ['donut','studio']){await ready(page,mode);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);if(mode==='donut')await expect(page.getByRole('button',{name:'Spin donut',exact:true})).toBeVisible();}
});

test('upload buttons open the matching picker and file-only drop feedback clears',async({page})=>{
 await ready(page);
 for(const kind of ['image','video']){const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:`Upload ${kind}`,exact:true}).click();expect(await (await chooser).element().getAttribute('accept')).toBe(`${kind}/*`);}
 await page.locator('.ascii-upload').dispatchEvent('dragenter',{dataTransfer:await page.evaluateHandle(()=>{const d=new DataTransfer();d.setData('text/plain','text');return d;})});await expect(page.locator('.ascii-app')).not.toHaveClass(/ascii-dragging/);
 const transfer=await page.evaluateHandle(()=>{const d=new DataTransfer();d.items.add(new File(['fixture'],'example.png',{type:'image/png'}));return d;});await page.locator('.ascii-upload').dispatchEvent('dragenter',{dataTransfer:transfer});await expect(page.locator('.ascii-app')).toHaveClass(/ascii-dragging/);await page.keyboard.press('Escape');await expect(page.locator('.ascii-app')).not.toHaveClass(/ascii-dragging/);
});

for (const mode of ['donut', 'studio']) test(`Surprise me makes fresh settings without selecting a mood in ${mode}`, async ({page}) => {
 await page.emulateMedia({reducedMotion:'reduce'});await ready(page,mode);
 await page.evaluate(()=>{let seed=42;Math.random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/2**32);});
 const palettes=new Set();
 for(let i=0;i<6;i++){
  const before=await hash(page);
  await page.getByRole('button',{name:'Surprise me',exact:true}).click();
  await expect(page.locator('[data-preset][aria-pressed="true"]')).toHaveCount(0);
  await expect.poll(()=>hash(page)).not.toBe(before);
  palettes.add(await page.locator('[data-setting=ink]').inputValue());
 }
 expect(palettes.size).toBe(6);
 await page.getByRole('button',{name:'Reset settings',exact:true}).click();
 await expect(page.getByRole('button',{name:'Terminal',exact:true})).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('[data-setting=ink]')).toHaveValue('#b9f4ba');
});
