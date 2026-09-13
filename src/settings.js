// Only rendering controls are serialized. Uploaded media never enters storage or links.
const ranges = {columns:[40,180,10],contrast:[.2,3,.05],brightness:[-.5,.5,.05],gamma:[.3,3,.1],tube:[.25,1,.05],speed:[-2,2,.1],tumble:[0,2,.1],zoom:[.6,1.25,.05],light:[-3,3,.1]};
const modeKey = mode => mode === 'studio' ? 'image' : mode;
const storageKey = mode => `ascii-settings:v1:${modeKey(mode)}`;
export function sanitizeSettings(value, defaults) {
  const result = {...defaults};
  if (!value || typeof value !== 'object' || Array.isArray(value)) return result;
  for (const key of Object.keys(defaults)) {
    const item = value[key];
    if (ranges[key] && typeof item === 'number' && Number.isFinite(item)) {
      const [min,max,step] = ranges[key];
      result[key] = Number(Math.min(max, Math.max(min, min + Math.round((item-min)/step)*step)).toFixed(2));
    } else if (['ink','paper'].includes(key) && typeof item === 'string' && /^#[0-9a-f]{6}$/i.test(item)) result[key] = item.toLowerCase();
    else if (key === 'ramp' && typeof item === 'string' && /^[\x20-\x7e]{2,64}$/.test(item)) result[key] = item;
    else if (key === 'color' && ['mono','source','rainbow'].includes(item)) result[key] = item;
    else if (typeof defaults[key] === 'boolean' && typeof item === 'boolean') result[key] = item;
  }
  return result;
}
function decode(text, mode, defaults) {
  if (!text || text.length > 2048) return null;
  try {
    const value = JSON.parse(text);
    if (value.v !== 1 || value.mode !== modeKey(mode) || !value.settings || typeof value.settings !== 'object' || Array.isArray(value.settings)) return null;
    return sanitizeSettings(value.settings, defaults);
  } catch { return null; }
}
const encode = (settings, mode, defaults) => JSON.stringify({v:1,mode:modeKey(mode),settings:sanitizeSettings(settings,defaults)});
export function restoreSettings(defaults, mode, url, getStorage = () => globalThis.localStorage) {
  const shared = decode(new URL(url).searchParams.get('ascii'), mode, defaults);
  if (shared) return {settings:shared, source:'link'};
  try {
    const saved = decode(getStorage().getItem(storageKey(mode)), mode, defaults);
    if (saved) return {settings:saved, source:'device'};
  } catch { /* Private browsing and disabled storage still support the editor. */ }
  return {settings:{...defaults}, source:null};
}
export function saveSettings(settings, mode, defaults, getStorage = () => globalThis.localStorage) {
  try {getStorage().setItem(storageKey(mode), encode(settings,mode,defaults));return true;} catch {return false;}
}
export function settingsLink(settings, mode, defaults, currentURL) {
  const url = new URL(currentURL);
  url.searchParams.set('mode',modeKey(mode));
  url.searchParams.set('ascii',encode(settings,mode,defaults));
  return url.href;
}
