import test from 'node:test';
import assert from 'node:assert/strict';
import { imageToAscii, donutFrame, gridSize, cleanRamp, toText } from '../src/engine.js';
const pixels = (...values) => new Uint8ClampedArray(values.flatMap(v => [v,v,v,255]));
test('luminance maps black, mid-gray and white in density order',()=>{
 assert.equal(toText(imageToAscii(pixels(0,128,255),3,1,{ramp:' .@'})),' .@');
 assert.equal(toText(imageToAscii(pixels(0,128,255),3,1,{ramp:' .@',invert:true})),'@. ');
});
test('transparent pixels do not leak hidden color',()=>{
 assert.equal(toText(imageToAscii(new Uint8ClampedArray([255,255,255,0]),1,1,{ramp:' @'})),' ');
});
test('contrast, brightness and gamma change character selection without changing input',()=>{
 const input=pixels(60,100,150,200), snapshot=input.slice(), baseline=toText(imageToAscii(input,4,1));
 for(const options of [{contrast:3},{brightness:0.4},{gamma:2.5}])assert.notEqual(toText(imageToAscii(input,4,1,options)),baseline);
 assert.deepEqual(input,snapshot);
});
test('edge mode leaves uniform regions empty and marks a boundary',()=>{
 assert.equal(toText(imageToAscii(pixels(...new Array(9).fill(100)),3,3,{edges:true})).trim(),'');
 const boundary=imageToAscii(pixels(0,0,255,0,0,255,0,0,255),3,3,{edges:true});
 assert.notEqual(toText(boundary).trim(),'');
});
test('character aspect ratio and portrait resource bounds are honored',()=>{
 assert.deepEqual(gridSize(1200,800,120),{cols:120,rows:40});
 assert.equal(gridSize(100,10000,180).rows,150);
 assert.throws(()=>gridSize(0,0));assert.throws(()=>imageToAscii(pixels(1),2,2));
});
test('ramps contain printable ASCII only and preserve intentional leading space',()=>{
 assert.equal(cleanRamp(' .x@'),' .x@');assert.equal(cleanRamp('a\nb'),'ab');
 assert.equal(cleanRamp('x'.repeat(100)).length,64);assert.ok(cleanRamp('♥').length>1);
});
test('donut is deterministic, bounded, shaded, and changes with rotation and dough',()=>{
 const opts={columns:100,a:.8,b:.4};const first=donutFrame(opts),text=toText(first);
 assert.equal(text,toText(donutFrame(opts)));
 assert.ok(first.chars.filter(c=>c!==' ').length>200);
 assert.ok(new Set(first.chars).size>=5);
 assert.notEqual(text,toText(donutFrame({...opts,a:1.8})));
 assert.notEqual(text,toText(donutFrame({...opts,tube:.3})));
 assert.equal(text.split('\n').length,first.rows);
 assert.ok(text.split('\n').every(row=>row.length===first.cols));
 assert.ok(first.colors.every(value=>value>=0&&value<=255));
});
test('sprinkles produce visible stars without changing the torus silhouette',()=>{
 const a=donutFrame({sprinkles:false}),b=donutFrame({sprinkles:true});
 assert.notEqual(toText(a),toText(b));assert.deepEqual(a.chars.map(c=>c===' '),b.chars.map(c=>c===' '));
});
