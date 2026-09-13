import test from 'node:test';
import assert from 'node:assert/strict';
import {sanitizeSettings,restoreSettings,saveSettings,settingsLink} from '../src/settings.js';
const defaults={columns:120,contrast:1.15,brightness:0,gamma:1,ramp:' .#',ink:'#b9f4ba',paper:'#101b20',color:'mono',invert:false,edges:false,sprinkles:false,tube:.65,speed:.7,tumble:.4,zoom:1,light:.7};
const memory=()=>{const data=new Map();return {getItem:key=>data.get(key),setItem:(key,value)=>data.set(key,value)};};
test('untrusted settings cannot inject fields, markup, nonfinite values, or excessive work',()=>{
 const result=sanitizeSettings(JSON.parse('{"columns":1000000,"contrast":null,"ramp":"x\\n<script>","ink":"red","color":"unknown","invert":"false","__proto__":{"polluted":true}}'),defaults);
 assert.equal(result.columns,180);assert.equal(result.contrast,1.15);assert.equal(result.ramp,defaults.ramp);assert.equal(result.ink,defaults.ink);assert.equal(result.invert,false);assert.equal({}.polluted,undefined);assert.deepEqual(Object.keys(result),Object.keys(defaults));
 assert.equal(sanitizeSettings({gamma:Infinity,light:-Infinity},defaults).gamma,1);
});
test('saved modes stay independent; a share link restores in a clean browser',()=>{
 const storage=memory(),get=()=>storage,custom={...defaults,columns:80,ramp:' XO',ink:'#f0aabb',speed:-1.2};
 assert.equal(saveSettings(custom,'image',defaults,get),true);
 assert.deepEqual(restoreSettings(defaults,'studio','https://example.test/',get).settings,custom);
 assert.deepEqual(restoreSettings(defaults,'donut','https://example.test/',get).settings,defaults);
 const url=settingsLink(custom,'image',defaults,'https://example.test/experiments/ascii-studio?mode=video');
 const restored=restoreSettings(defaults,'image',url,()=>memory());assert.deepEqual(restored.settings,custom);assert.equal(restored.source,'link');
 assert.deepEqual(restoreSettings(defaults,'video',url,()=>memory()).settings,defaults);
});
test('broken links fall back to saved settings and disabled storage is harmless',()=>{
 const unavailable=()=>{throw new Error('denied');};
 assert.equal(saveSettings(defaults,'image',defaults,unavailable),false);
 for(const ascii of ['{','null','[]',JSON.stringify({v:99,mode:'image',settings:defaults}),'x'.repeat(2049)]){
  const url=new URL('https://example.test/');url.searchParams.set('ascii',ascii);
  assert.deepEqual(restoreSettings(defaults,'image',url,unavailable).settings,defaults);
 }
 const storage=memory();saveSettings({...defaults,columns:80},'image',defaults,()=>storage);
 assert.equal(restoreSettings(defaults,'image','https://example.test/?ascii=broken',()=>storage).settings.columns,80);
});
