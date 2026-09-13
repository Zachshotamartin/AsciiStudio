import { RAMPS } from './engine.js';

function hslHex(hue, saturation, lightness) {
  const a = saturation * Math.min(lightness, 1 - lightness);
  const channel = n => {
    const k = (n + hue / 30) % 12;
    return Math.round(255 * (lightness - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))).toString(16).padStart(2, '0');
  };
  return `#${channel(0)}${channel(8)}${channel(4)}`;
}

/** Fresh combinations, independent of the named moods; ranges match the controls. */
export function randomizeSettings(settings, { donut = false, random = Math.random } = {}) {
  const between = (min, max) => min + random() * (max - min);
  const stepped = (min, max, step) => Number((min + Math.floor(random() * (Math.round((max - min) / step) + 1)) * step).toFixed(2));
  const pick = items => items[Math.floor(random() * items.length)];
  const lightPaper = random() < .2;
  const next = {
    ...settings,
    columns: stepped(40, 180, 10),
    ramp: pick(Object.values(RAMPS)),
    color: pick(['mono', 'source', 'rainbow']),
    // Opposing lightness ranges keep one-color characters readable.
    ink: hslHex(between(0, 360), between(.35, .85), lightPaper ? between(.1, .2) : between(.75, .9)),
    paper: hslHex(between(0, 360), between(.15, .45), lightPaper ? between(.9, .97) : between(.04, .1)),
  };
  if (donut) Object.assign(next, {
    tube: stepped(.25, 1, .05), speed: stepped(.3, 1.8, .1) * (random() < .5 ? -1 : 1),
    tumble: stepped(.2, 1.6, .1), zoom: stepped(.6, 1.25, .05),
    light: stepped(-3, 3, .1), sprinkles: random() < .5,
  });
  else Object.assign(next, {
    contrast: stepped(.75, 1.8, .05), brightness: stepped(-.2, .2, .05),
    gamma: stepped(.6, 1.6, .1), invert: random() < .5, edges: random() < .25,
  });
  return next;
}
