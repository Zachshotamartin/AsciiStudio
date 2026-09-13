import test from 'node:test';
import assert from 'node:assert/strict';
import { randomizeSettings } from '../src/randomize.js';
import { RAMPS } from '../src/engine.js';
const seedRandom = () => { let seed = 42; return () => ((seed = Math.imul(seed, 1664525) + 1013904223 >>> 0) / 2 ** 32); };
test('surprises generate independent palettes and varied settings beyond four moods', () => {
  const random = seedRandom(), settings = { marker: 'preserved' }, palettes = new Set();
  for (let i = 0; i < 100; i++) {
    const next = randomizeSettings(settings, { random });
    palettes.add(`${next.ink}/${next.paper}`);
    assert.match(next.ink, /^#[0-9a-f]{6}$/); assert.match(next.paper, /^#[0-9a-f]{6}$/);
    assert.ok(Object.values(RAMPS).includes(next.ramp));
    assert.ok(next.columns >= 40 && next.columns <= 180 && next.columns % 10 === 0);
    assert.ok(next.contrast >= .75 && next.contrast <= 1.8);
    assert.ok(next.brightness >= -.2 && next.brightness <= .2);
    assert.ok(next.gamma >= .6 && next.gamma <= 1.6);
    assert.equal(next.marker, 'preserved'); assert.notEqual(next, settings);
  }
  assert.ok(palettes.size > 90); assert.deepEqual(settings, { marker: 'preserved' });
});
test('donut surprises vary geometry and spin within supported slider steps', () => {
  const random = seedRandom(), speeds = new Set();
  for (let i = 0; i < 100; i++) {
    const next = randomizeSettings({ brightness: .15 }, { donut: true, random });
    assert.ok(next.tube >= .25 && next.tube <= 1);
    assert.ok(next.zoom >= .6 && next.zoom <= 1.25);
    assert.ok(Math.abs(next.speed) >= .3 && Math.abs(next.speed) <= 1.8);
    assert.ok(next.tumble >= .2 && next.tumble <= 1.6);
    assert.ok(next.light >= -3 && next.light <= 3);
    assert.equal(next.brightness, .15); speeds.add(Math.sign(next.speed));
  }
  assert.deepEqual([...speeds].sort(), [-1, 1]);
});
