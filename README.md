# ASCII Studio

Two browser playgrounds, one small rendering engine:

- **Donut kitchen** renders a shaded 3D torus as actual ASCII characters. Change its dough thickness, spin, tumble, lighting, size, alphabet, frosting, and sprinkles. Save frames or record a six-second spin.
- **Media studio** converts uploaded images and videos into character art. Customize detail, contrast, brightness, shadow lift, edge outlines, character density, custom printable ASCII alphabets, original colors, rainbow colors, or editable ink and paper colors.

Terminal, Candy shop, Newsprint, and Arcade presets give you starting points. Surprise me remixes the settings; Reset restores the defaults.

## Run

Node 22 or newer:

```sh
npm ci
npm run dev
```

Open the printed localhost URL. Use **Donut kitchen** and **Media studio** in the navigation. `npm run build` creates a static site in `dist`; `npm run preview` previews that build.

## Media and exports

Use **Upload image** or **Upload video**, or drop a browser-decodable image/video up to 250 MB. PNG, JPEG, WebP, MP4, and WebM are useful choices; exact codec support depends on the browser. Animated image files are treated as images; use a video for playback and video export.

- Video playback, pause, and scrubbing update the ASCII preview. Changing settings also updates paused frames.
- **Save PNG**, **Save text**, and **Copy text** use the current ASCII frame, even while viewing the original comparison.
- **Export video** records all remaining video from the playhead, or a chosen 6-, 15-, or 30-second clip. Scrub to the beginning to convert the whole video. Exports run in real time and contain no audio. Encoded output is capped at 256 MB; reduce Detail or choose a shorter clip if needed.
- The donut records six seconds; it is not guaranteed to be a seamless loop.
- Video export uses a supported MediaRecorder WebM or MP4 format. Keep the tab visible. Canceling, leaving the page, or hiding the tab releases the recording; a stalled source triggers a timeout. PNG and text remain available when the browser has no compatible video encoder.
- Character cells are 6 × 12 pixels. Detail is 40–180 columns in the UI; portrait rows are capped at 150, reducing columns when needed to preserve the image proportions.

All uploaded media stays on the device. No upload endpoint, analytics, account, cloud model, or network conversion is used. Object URLs, media playback, animation frames, and recording streams are released when the mounted app is disposed.

## Embed

The portfolio imports a pinned Git revision of this package. No runtime dependency is required.

```js
import { mountAscii } from '@zachshotamartin/ascii-studio';
const app = mountAscii(document.querySelector('#tool'), {
  mode: 'donut', // or 'studio'
  assetBase: '/assets/ascii/examples/',
});
// Copy public/examples to assetBase to enable the sample-video button.
// Call on route teardown:
app.dispose();
```

CSS is scoped under `.ascii-app`. The module is browser-only; mount after the DOM is available. The independent `@zachshotamartin/ascii-studio/engine` export is DOM-free except for the optional `renderAscii(canvas, ...)` painter.

## How it works

The donut samples a parametric torus, rotates its positions and surface normals, applies perspective projection, and resolves overlapping samples with a depth buffer. Lambert lighting selects characters along a density ramp. This implementation derives the torus from its geometry and uses no 3D library.

Media is downsampled into character cells. Rec. 709 luminance, contrast, brightness, gamma, optional Sobel edges, and optional inversion choose a glyph from the current ramp. RGB samples can color the glyphs; they remain printable ASCII even in color mode. Canvas paints the glyph grid, while text export uses the same grid directly. A bounded 24 fps loop updates video frames and the donut without a framework render on every frame.

Video encoding uses [Canvas captureStream](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/captureStream) and probes [MediaRecorder formats](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/isTypeSupported_static).

## Tests

```sh
npm test
npx playwright install chromium
npm run test:browser
npm run build
```

Unit tests cover density mapping, transparency, tone controls, edge extraction, grid limits, custom alphabets, deterministic torus projection, and sprinkles. Browser tests upload actual image/video files, decode an exported video to verify changing frames, exercise cancel/error recovery, verify downloads and settings, and check 1440/390/320 px layouts and reduced motion.

The still-life example is drawn locally by this project. The four-second Color parade video is an FFmpeg-generated test pattern, reproducible with:

```sh
ffmpeg -f lavfi -i 'testsrc2=size=480x320:rate=24:duration=4' \
  -c:v libvpx-vp9 -crf 38 -b:v 0 -an public/examples/motion.webm
```

The preview PNGs are exports from the actual ASCII renderer.
