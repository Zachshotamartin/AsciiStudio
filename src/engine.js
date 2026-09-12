// Pure character-grid algorithms. No DOM, network, or dependencies.
export const RAMPS = Object.freeze({ classic: ' .:-=+*#%@', soft: ' .,:;ox%#@', binary: ' 01', bubbles: ' .oO@', blocks: ' .-=+#@' });
export const clamp = (v, low = 0, high = 1) => Math.max(low, Math.min(high, v));
export function cleanRamp(value) {
  const chars = [...String(value)].filter(c => c.charCodeAt(0) >= 32 && c.charCodeAt(0) <= 126).slice(0, 64).join('');
  return chars.length >= 2 ? chars : RAMPS.classic;
}
export function gridSize(width, height, columns = 120) {
  if (!(width > 0 && height > 0)) throw new Error('The source has no readable dimensions.');
  const cols = Math.round(clamp(Number(columns) || 120, 32, 200));
  // A character cell is 6 by 12 pixels. Cap portrait rows to bound work and exports.
  return { cols, rows: Math.round(clamp(cols * height / width * 0.5, 4, 150)) };
}
function frame(cols, rows) {
  return { cols, rows, chars: new Array(cols * rows).fill(' '), colors: new Uint8ClampedArray(cols * rows * 3) };
}
export function imageToAscii(pixels, cols, rows, options = {}) {
  if (!Number.isInteger(cols) || !Number.isInteger(rows) || cols < 1 || rows < 1 || cols * rows > 30000 || pixels.length !== cols * rows * 4) throw new Error('Invalid pixel grid.');
  const result = frame(cols, rows), ramp = cleanRamp(options.ramp ?? RAMPS.classic);
  const contrast = clamp(Number(options.contrast ?? 1), 0.2, 3);
  const brightness = clamp(Number(options.brightness ?? 0), -0.5, 0.5);
  const gamma = clamp(Number(options.gamma ?? 1), 0.3, 3);
  const lumas = new Float32Array(cols * rows);
  for (let i = 0; i < lumas.length; i++) {
    const a = pixels[i * 4 + 3] / 255;
    const rgb = [0, 1, 2].map(c => pixels[i * 4 + c] * a);
    result.colors.set(rgb, i * 3);
    lumas[i] = (rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722) / 255;
  }
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const i = y * cols + x;
    let light = lumas[i];
    if (options.edges) {
      const at = (dx, dy) => lumas[clamp(y + dy, 0, rows - 1) * cols + clamp(x + dx, 0, cols - 1)];
      const gx = -at(-1,-1) + at(1,-1) - 2*at(-1,0) + 2*at(1,0) - at(-1,1) + at(1,1);
      const gy = -at(-1,-1) - 2*at(0,-1) - at(1,-1) + at(-1,1) + 2*at(0,1) + at(1,1);
      light = clamp(Math.hypot(gx, gy));
    }
    light = Math.pow(clamp((light - 0.5) * contrast + 0.5 + brightness), 1 / gamma);
    if (options.invert) light = 1 - light;
    result.chars[i] = ramp[Math.round(light * (ramp.length - 1))];
  }
  return result;
}
function rotate(x, y, z, a, b) {
  const yy = y * Math.cos(a) - z * Math.sin(a), zz = y * Math.sin(a) + z * Math.cos(a);
  return [x * Math.cos(b) - yy * Math.sin(b), x * Math.sin(b) + yy * Math.cos(b), zz];
}
export function donutFrame(options = {}) {
  const cols = Math.round(clamp(Number(options.columns) || 120, 32, 200)), rows = Math.round(cols * 0.55);
  const result = frame(cols, rows), depth = new Float32Array(cols * rows).fill(-Infinity);
  const ramp = cleanRamp(options.ramp ?? RAMPS.classic), tube = clamp(Number(options.tube ?? 0.65), 0.25, 1);
  const a = Number(options.a ?? 0.65), b = Number(options.b ?? 0.3), zoom = clamp(Number(options.zoom ?? 1), 0.6, 1.25);
  const azimuth = Number(options.light ?? 0.7), light = [Math.cos(azimuth) * 0.6, -0.6, -Math.sin(azimuth) * 0.6 - 0.5];
  const ln = Math.hypot(...light); light.forEach((v, i) => light[i] = v / ln);
  for (let u = 0; u < Math.PI * 2; u += 0.035) for (let v = 0; v < Math.PI * 2; v += 0.035) {
    const cu = Math.cos(u), su = Math.sin(u), cv = Math.cos(v), sv = Math.sin(v);
    const [x,y,z] = rotate((1.5 + tube * cv) * cu, (1.5 + tube * cv) * su, tube * sv, a, b);
    const n = rotate(cv * cu, cv * su, sv, a, b), inverseZ = 1 / (7 + z);
    const xx = Math.round(cols / 2 + x * cols * 1.25 * zoom * inverseZ);
    const yy = Math.round(rows / 2 + y * cols * 0.625 * zoom * inverseZ);
    if (xx < 0 || xx >= cols || yy < 0 || yy >= rows) continue;
    const i = yy * cols + xx;
    if (inverseZ <= depth[i]) continue;
    depth[i] = inverseZ;
    let shade = clamp(0.16 + 0.84 * Math.max(0, n.reduce((s,value,j) => s + value * light[j], 0)));
    if (options.invert) shade = 1 - shade;
    const sprinkle = options.sprinkles && Math.sin(u * 31) * Math.cos(v * 17) > 0.94;
    result.chars[i] = sprinkle ? '*' : ramp[Math.max(1, Math.round(shade * (ramp.length - 1)))];
    result.colors.set(sprinkle ? [255, 225, 108] : [clamp(0.35 + shade) * 255, (0.28 + shade * 0.55) * 255, (0.48 + shade * 0.4) * 255], i * 3);
  }
  return result;
}
export function toText(result) {
  const lines = [];
  for (let y = 0; y < result.rows; y++) lines.push(result.chars.slice(y * result.cols, (y + 1) * result.cols).join(''));
  return lines.join('\n');
}
export function renderAscii(canvas, result, options = {}) {
  const width = result.cols * 6, height = result.rows * 12;
  if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = options.paper || '#101b20'; ctx.fillRect(0, 0, width, height);
  ctx.font = '10px monospace'; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
  for (let y = 0; y < result.rows; y++) for (let x = 0; x < result.cols; x++) {
    const i = y * result.cols + x, c = result.chars[i]; if (c === ' ') continue;
    if (options.color === 'source') ctx.fillStyle = `rgb(${result.colors[i*3]},${result.colors[i*3+1]},${result.colors[i*3+2]})`;
    else if (options.color === 'rainbow') ctx.fillStyle = `hsl(${(x / result.cols * 260 + y / result.rows * 100 + (options.hue || 0)) % 360} 85% 73%)`;
    else ctx.fillStyle = options.ink || '#b9f4ba';
    ctx.fillText(c, x * 6 + 3, y * 12 + 6);
  }
}
