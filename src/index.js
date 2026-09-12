import { RAMPS, cleanRamp, gridSize, imageToAscii, donutFrame, renderAscii, toText, clamp } from './engine.js';
import './style.css';

const DEFAULTS = { columns: 120, ramp: RAMPS.classic, contrast: 1.15, brightness: 0, gamma: 1, invert: false, edges: false, color: 'mono', ink: '#b9f4ba', paper: '#101b20', tube: 0.65, speed: 0.7, tumble: 0.4, zoom: 1, light: 0.7, sprinkles: false };
const PRESETS = {
  terminal: { label: 'Terminal', color: 'mono', ink: '#b9f4ba', paper: '#101b20', ramp: RAMPS.classic, contrast: 1.15 },
  candy: { label: 'Candy shop', color: 'source', ink: '#ffbdd6', paper: '#231c29', ramp: RAMPS.bubbles, contrast: 1.25, sprinkles: true },
  newsprint: { label: 'Newsprint', color: 'mono', ink: '#253131', paper: '#f3efe4', ramp: RAMPS.soft, contrast: 1.6 },
  arcade: { label: 'Arcade', color: 'rainbow', ink: '#ffb985', paper: '#131c2b', ramp: RAMPS.binary, contrast: 1.35 },
};
const range = (key, title, min, max, step, hint = '') => `<label class="ascii-field"><span>${title}<output data-output="${key}"></output></span><input data-setting="${key}" type="range" min="${min}" max="${max}" step="${step}" aria-label="${title}">${hint ? `<small>${hint}</small>` : ''}</label>`;
const checkbox = (key, title) => `<label class="ascii-check"><input type="checkbox" data-setting="${key}"><span>${title}</span></label>`;
const timeLabel = value => `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, '0')}`;

export function mountAscii(host, { mode = 'studio', assetBase = '/examples/' } = {}) {
  const donut = mode === 'donut', abort = new AbortController(), signal = abort.signal;
  let disposed = false, raf = 0, frameCount = 0, lastTick = 0, dirty = true, running = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  let settings = { ...DEFAULTS }, a = 0.85, b = 0.35, currentFrame, source, sourceKind = 'sample', sourceName = 'Studio still life';
  let sourceURL, loadVersion = 0, loading = false, record = null, dragDepth = 0, lastSourceTime = -1;
  const pendingURLs = new Set(), downloadURLs = new Set();
  host.innerHTML = `<section class="ascii-app" data-mode="${mode}" aria-label="${donut ? 'ASCII donut kitchen' : 'ASCII media studio'}">
    <header class="ascii-intro"><div><h2>${donut ? 'Freshly rendered.' : 'Every pixel, a character.'}</h2><p>${donut ? 'A little dough. A little math. A lot of spinning.' : 'Drop in a photo or video. Give it a whole new alphabet.'}</p></div><span class="ascii-stamp" aria-hidden="true">${donut ? '(@)' : 'Aa'}</span></header>
    <div class="ascii-layout"><div class="ascii-workspace">
      ${donut ? '' : `<div class="ascii-upload"><label class="ascii-upload-button">Upload image<input class="ascii-file" type="file" accept="image/*" aria-label="Upload image"></label><label class="ascii-upload-button">Upload video<input class="ascii-file" type="file" accept="video/*" aria-label="Upload video"></label><button type="button" data-action="sample">Try a still life</button><button type="button" data-action="sample-video">Try a video</button><p>Or drop a file here. Files stay on your device. Up to 250 MB.</p></div>`}
      <div class="ascii-stage" data-stage>
        <div class="ascii-stage-bar"><span data-source-name>${donut ? 'Donut kitchen' : 'Studio still life'}</span><div>${donut ? '' : '<button type="button" data-action="source" aria-pressed="false">Show original</button>'}<button type="button" data-action="play">${donut ? (running ? 'Pause spin' : 'Spin donut') : 'Play video'}</button></div></div>
        <div class="ascii-screen"><canvas data-ascii-canvas role="img" aria-label="${donut ? 'Live shaded donut rendered with ASCII characters' : 'Media converted into ASCII characters'}"></canvas><canvas data-original-canvas role="img" aria-label="Original media for comparison" hidden></canvas></div>
        <div class="ascii-readout"><span data-grid>Preparing characters…</span><span data-state>${donut ? 'Made of math' : 'Sample illustration'}</span></div>
      </div>
      ${donut ? '' : `<div class="ascii-timeline" hidden><label><span>Video position <output data-time>0:00 / 0:00</output></span><input data-seek type="range" min="0" max="1" step="0.01" value="0" aria-label="Video position"></label><label class="ascii-field"><span>Export length</span><select data-duration aria-label="Export length"><option value="remaining">All remaining video</option><option value="6">6-second clip</option><option value="15">15-second clip</option><option value="30">30-second clip</option></select></label></div>`}
      <div class="ascii-export"><button type="button" data-action="png">Save PNG</button><button type="button" data-action="text">Save text</button><button type="button" data-action="copy">Copy text</button><button type="button" data-action="record">${donut ? 'Record 6-second spin' : 'Export video'}</button><button type="button" data-action="cancel" hidden>Cancel export</button></div>
      <p class="ascii-export-note">${donut ? 'Save the current frame, or record six seconds of spinning.' : 'Video export starts at the playhead and has no audio. Choose the whole remaining video or a short clip. Keep this tab visible.'}</p>
      <p class="ascii-status" role="status" aria-live="polite">${donut ? 'Try a recipe, then make it yours.' : 'Start with the sample, or bring your own pixels.'}</p>
      <p class="ascii-error" role="alert" hidden></p>
    </div><aside class="ascii-controls" aria-label="ASCII customization">
      <fieldset><legend>${donut ? 'Pick a recipe' : 'Pick a mood'}</legend><div class="ascii-presets">${Object.entries(PRESETS).map(([key,p]) => `<button type="button" data-preset="${key}" aria-pressed="${key === 'terminal'}">${p.label}</button>`).join('')}</div></fieldset>
      ${donut ? `<fieldset><legend>In the mixing bowl</legend>${range('tube','Dough thickness',0.25,1,0.05)}${range('speed','Spin speed',-2,2,0.1,'Negative values reverse the spin.')}${range('tumble','Tumble',0,2,0.1)}${range('zoom','Serving size',0.6,1.25,0.05)}${range('light','Light direction',-3,3,0.1)}${checkbox('sprinkles','Rainbow sprinkles')}</fieldset>` : `<fieldset><legend>Develop the picture</legend>${range('contrast','Contrast',0.2,3,0.05)}${range('brightness','Brightness',-0.5,0.5,0.05)}${range('gamma','Shadow lift',0.3,3,0.1)}${checkbox('edges','Outline mode')}${checkbox('invert','Invert character density')}</fieldset>`}
      <fieldset><legend>The alphabet department</legend>${range('columns','Detail',40,180,10,'More columns, smaller characters.')}<label class="ascii-field"><span>Character set</span><select data-ramp aria-label="Character set"><option value="classic">Classic · .:-=+*#%@</option><option value="soft">Soft ink · .,:;ox%#@</option><option value="binary">Binary · 01</option><option value="bubbles">Bubbles · .oO@</option><option value="blocks">Bold · .-=+#@</option><option value="custom">My own alphabet</option></select></label><label class="ascii-field ascii-custom" hidden><span>Custom characters</span><input data-custom type="text" maxlength="64" value=" .:-=+*#%@" aria-label="Custom characters" spellcheck="false"><small>2–64 printable ASCII characters, light to dense. Spaces count.</small></label></fieldset>
      <fieldset><legend>${donut ? 'Choose your glaze' : 'Ink & paper'}</legend><label class="ascii-field"><span>Color treatment</span><select data-setting="color" aria-label="Color treatment"><option value="mono">One-color ink</option><option value="source">${donut ? 'Strawberry frosting' : 'Original colors'}</option><option value="rainbow">Rainbow arcade</option></select></label><div class="ascii-colors"><label>Ink<input type="color" data-setting="ink" aria-label="Ink color"><input type="text" data-hex="ink" aria-label="Ink hex code" maxlength="7" spellcheck="false"></label><label>Paper<input type="color" data-setting="paper" aria-label="Paper color"><input type="text" data-hex="paper" aria-label="Paper hex code" maxlength="7" spellcheck="false"></label></div></fieldset>
      <div class="ascii-control-actions"><button type="button" data-action="surprise">Surprise me</button><button type="button" data-action="reset">Reset settings</button></div>
    </aside></div>
    <details class="ascii-text-details"><summary>Read the current ASCII frame as text</summary><pre data-text tabindex="0" aria-label="Current ASCII frame as text"></pre></details>
  </section>`;
  const root = host.firstElementChild, $ = selector => root.querySelector(selector);
  const canvas = $('[data-ascii-canvas]'), original = $('[data-original-canvas]'), sampleCanvas = document.createElement('canvas');
  const sampleContext = sampleCanvas.getContext('2d', { willReadFrequently: true });
  const status = message => { if (!disposed) $('.ascii-status').textContent = message; };
  const fail = message => { if (!disposed) { $('.ascii-error').hidden = !message; $('.ascii-error').textContent = message; } };
  const listen = (target, type, handler) => target.addEventListener(type, handler, { signal });
  function syncControls() {
    for (const el of root.querySelectorAll('[data-setting]')) {
      const value = settings[el.dataset.setting];
      if (el.type === 'checkbox') el.checked = value; else el.value = value;
      const output = $(`[data-output="${el.dataset.setting}"]`);
      if (output) output.textContent = el.dataset.setting === 'columns' ? `${value} cols` : `${Number(value).toFixed(2).replace(/\.?0+$/, '') || '0'}`;
    }
    root.querySelectorAll('[data-hex]').forEach(el => { el.value = settings[el.dataset.hex]; el.setCustomValidity(''); });
    const name = Object.keys(RAMPS).find(key => RAMPS[key] === settings.ramp) || 'custom';
    $('[data-ramp]').value = name; $('.ascii-custom').hidden = name !== 'custom'; $('[data-custom]').value = settings.ramp;
    dirty = true;
  }
  function clearPreset() { root.querySelectorAll('[data-preset]').forEach(el => el.setAttribute('aria-pressed', 'false')); }
  function setPreset(key) {
    settings = { ...settings, ...PRESETS[key], edges: false, invert: false, brightness: 0, gamma: 1, sprinkles: Boolean(PRESETS[key].sprinkles) };
    root.querySelectorAll('[data-preset]').forEach(el => el.setAttribute('aria-pressed', String(el.dataset.preset === key)));
    syncControls(); status(`${PRESETS[key].label} is on the menu.`);
  }
  function drawSource() {
    const w = source.videoWidth || source.naturalWidth || source.width, h = source.videoHeight || source.naturalHeight || source.height;
    const size = gridSize(w,h,settings.columns);
    sampleCanvas.width = size.cols; sampleCanvas.height = size.rows;
    sampleContext.fillStyle = '#000'; sampleContext.fillRect(0,0,size.cols,size.rows);
    sampleContext.drawImage(source,0,0,size.cols,size.rows);
    currentFrame = imageToAscii(sampleContext.getImageData(0,0,size.cols,size.rows).data,size.cols,size.rows,settings);
    if (!original.hidden) {
      original.width = size.cols*6; original.height = size.rows*12;
      const ctx = original.getContext('2d');ctx.fillStyle='#000';ctx.fillRect(0,0,original.width,original.height);ctx.drawImage(source,0,0,original.width,original.height);
    }
  }
  function draw() {
    if (disposed || (!donut && !source)) return;
    if (donut) currentFrame = donutFrame({ ...settings, a, b }); else drawSource();
    renderAscii(canvas, currentFrame, { ...settings, color: donut && settings.sprinkles ? 'source' : settings.color });
    canvas.dataset.frame = String(++frameCount); canvas.dataset.columns = String(currentFrame.cols);
    $('[data-grid]').textContent = `${currentFrame.cols} × ${currentFrame.rows} characters`;
    if ($('.ascii-text-details').open) $('[data-text]').textContent = toText(currentFrame);
    dirty = false;
  }
  function releaseSource() {
    if (sourceKind === 'video' && source) { source.pause(); source.removeAttribute('src'); source.load(); }
    if (sourceURL) URL.revokeObjectURL(sourceURL);
    sourceURL = null;
  }
  function updatePlayback() {
    const video = sourceKind === 'video', play = $('[data-action="play"]');
    play.hidden = !donut && !video;
    play.textContent = donut ? (running ? 'Pause spin' : 'Spin donut') : (video && !source.paused ? 'Pause video' : 'Play video');
    if (!donut) { $('.ascii-timeline').hidden = !video; $('[data-action="record"]').hidden = !video; }
  }
  function makeSample() {
    loadVersion++; loading=false; releaseSource();
    source=document.createElement('canvas');source.width=960;source.height=640;sourceKind='sample';sourceName='Studio still life';
    const c=source.getContext('2d'); c.fillStyle='#102a36';c.fillRect(0,0,960,640);
    c.fillStyle='#89b8ac';c.fillRect(0,450,960,190);
    c.fillStyle='#e9dfbd';c.beginPath();c.moveTo(230,200);c.lineTo(390,200);c.lineTo(440,470);c.quadraticCurveTo(310,535,180,470);c.closePath();c.fill();
    c.strokeStyle='#afd277';c.lineWidth=15;c.beginPath();c.moveTo(310,230);c.bezierCurveTo(255,70,370,100,350,30);c.stroke();
    for (let i=0;i<5;i++){c.save();c.translate(315+Math.sin(i)*22,60+i*30);c.rotate(i%2?0.4:-0.6);c.fillStyle=i%2?'#d5ea9a':'#84ad74';c.beginPath();c.ellipse(i%2?38:-32,0,48,17,0,0,7);c.fill();c.restore();}
    const g=c.createRadialGradient(600,330,5,650,405,135);g.addColorStop(0,'#ffe48a');g.addColorStop(0.4,'#f59b47');g.addColorStop(1,'#b83d32');c.fillStyle=g;c.beginPath();c.arc(650,405,125,0,7);c.fill();
    c.fillStyle='#f3e8ca';c.font='bold 86px monospace';c.fillText('Aa',730,190);
    c.fillStyle='#75afaa';for(let i=0;i<7;i++)c.fillRect(540+i*28,560,12,35);
    $('[data-source-name]').textContent=sourceName; $('[data-state]').textContent='Sample illustration';fail('');updatePlayback();dirty=true;
  }
  async function loadMedia(input, kind, name, owned = false) {
    if (record) return;
    const version=++loadVersion;loading=true;fail('');status(`Opening ${name}…`);
    if (owned) pendingURLs.add(input);
    const media=document.createElement(kind === 'video' ? 'video' : 'img');
    if(kind === 'video') {media.muted=true;media.playsInline=true;media.loop=true;media.preload='auto';}
    try {
      await new Promise((resolve,reject)=>{
        const timer=setTimeout(()=>{cleanup();reject(new Error('This file took too long to decode. Try a smaller file or another format.'));},20000);
        const cleanup=()=>{clearTimeout(timer);media.onload=null;media.onloadeddata=null;media.onerror=null;};
        const ready=()=>{cleanup();resolve();};
        media.onload=ready;media.onloadeddata=ready;media.onerror=()=>{cleanup();reject(new Error('This browser cannot decode that file. Try a PNG/JPEG image or an MP4/WebM video.'));};media.src=input;
      });
      if(disposed || version!==loadVersion) {if(kind==='video'){media.removeAttribute('src');media.load();}return;}
      const w=media.videoWidth||media.naturalWidth,h=media.videoHeight||media.naturalHeight;
      if(!w||!h || (kind==='video'&&(!Number.isFinite(media.duration)||media.duration<=0))) throw new Error('The file has no readable picture or finite video duration.');
      releaseSource();source=media;sourceKind=kind;sourceName=name;sourceURL=owned?input:null;
      pendingURLs.delete(input); loading=false;lastSourceTime=-1;
      $('[data-source-name]').textContent=name; $('[data-state]').textContent=kind==='video'?'Video · local conversion':'Image · local conversion';
      if(kind==='video') {
        $('[data-seek]').max=source.duration;
        listen(source,'seeked',()=>{dirty=true;});
        listen(source,'ended',()=>{if(record)stopRecording();updatePlayback();});
        listen(source,'error',()=>{if(record)stopRecording(true);fail('Video playback failed. Try another video format.');});
      }
      updatePlayback();dirty=true;status(kind==='video'?'Video ready. Press Play, scrub to a frame, or export a clip.':'Image ready. Every setting updates the result.');
    } catch(error) {if(!disposed && version===loadVersion){loading=false;fail(error.message);status('Your previous result is still available.');}}
    finally {if(pendingURLs.has(input)){pendingURLs.delete(input);URL.revokeObjectURL(input);}}
  }
  function upload(file) {
    if(!file||record)return;
    if(file.size>250*1024*1024){fail('Choose a file smaller than 250 MB.');return;}
    const kind=file.type.startsWith('video/')||/\.(mp4|webm|mov|m4v|ogv)$/i.test(file.name)?'video':file.type.startsWith('image/')||/\.(png|jpg|jpeg|webp|gif|avif|bmp)$/i.test(file.name)?'image':null;
    if(!kind){fail('Choose an image or video file.');return;}
    loadMedia(URL.createObjectURL(file),kind,file.name,true);
  }
  function download(blob,extension) {
    const url=URL.createObjectURL(blob);downloadURLs.add(url);
    const link=document.createElement('a');link.href=url;link.download=`${donut?'ascii-donut':sourceName.replace(/\.[^.]+$/,'').replace(/[^\w-]+/g,'-').slice(0,70)||'ascii-media'}-ascii.${extension}`;
    link.click();setTimeout(()=>{URL.revokeObjectURL(url);downloadURLs.delete(url);},60000);
  }
  function exportFrame(kind) {
    draw();
    if(kind==='text')download(new Blob([toText(currentFrame)],{type:'text/plain;charset=utf-8'}),'txt');
    else canvas.toBlob(blob=>{if(blob&&!disposed)download(blob,'png');},'image/png');
    status(kind==='text'?'A fresh sheet of ASCII text, ready to save.':'Your current ASCII frame is ready as a PNG.');
  }
  function lock(locked) {
    root.querySelectorAll('.ascii-controls input,.ascii-controls select,.ascii-controls button,.ascii-upload button,.ascii-file,[data-action="play"],[data-seek],[data-duration],[data-action="record"]').forEach(el=>el.disabled=locked);
    $('[data-action="cancel"]').hidden=!locked;
  }
  function stopRecording(cancel=false) {
    if(!record)return;
    record.cancel=cancel;clearTimeout(record.watchdog);
    if(record.recorder.state!=='inactive')record.recorder.stop();
  }
  async function startRecording() {
    if(record||loading)return;
    fail('');
    const mime=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm','video/mp4'].find(t=>globalThis.MediaRecorder?.isTypeSupported(t));
    if(!mime||!canvas.captureStream){fail('Video export is unavailable in this browser. PNG and text still work; try a current Chrome, Firefox, or Safari for video.');return;}
    if(!donut&&sourceKind!=='video')return;
    const start=donut?0:source.currentTime;
    const limit=donut?6:$('[data-duration]').value;
    const duration=donut?6:Math.min(limit==='remaining'?Infinity:Number(limit),source.duration-start);
    if(duration<0.1){fail('Move the video playhead back before exporting.');return;}
    let stream;
    try {
      draw(); stream=canvas.captureStream(24);
      const recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:4500000});
      const chunks=[],session={recorder,stream,cancel:false,start,duration,started:performance.now(),wasRunning:running,wasPaused:sourceKind==='video'?source.paused:true};
      record=session;lock(true);running=true;
      let recordedBytes=0;
      recorder.ondataavailable=e=>{if(e.data.size){chunks.push(e.data);recordedBytes+=e.data.size;if(recordedBytes>256*1024*1024&&!session.cancel){session.cancel=true;stopRecording(true);fail('The export exceeded 256 MB. Choose a shorter clip or reduce Detail.');}}};
      recorder.onerror=()=>{session.cancel=true;fail('The browser could not finish this export. Try a shorter clip.');stopRecording(true);};
      recorder.onstop=()=>{
        stream.getTracks().forEach(track=>track.stop());clearTimeout(session.watchdog);
        if(disposed)return;
        running=session.wasRunning;
        if(sourceKind==='video'){source.loop=true;source.pause();}
        record=null;lock(false);updatePlayback();
        if(!session.cancel&&chunks.length){download(new Blob(chunks,{type:mime}),mime.startsWith('video/mp4')?'mp4':'webm');status('Your silent ASCII clip is ready.');}
        else status('Export canceled. Your media and settings are unchanged.');
      };
      recorder.start(250);
      if(!donut){source.loop=false;await source.play();}
      session.watchdog=setTimeout(()=>{if(record===session){stopRecording(true);fail('Export stopped because playback stalled. Try a shorter or smaller video.');}},(duration+20)*1000);
      status(`Recording ${duration.toFixed(1)} seconds of ASCII. Keep this tab visible…`);updatePlayback();
    }catch(error){if(record)stopRecording(true);else {stream?.getTracks().forEach(t=>t.stop());lock(false);}fail(`Export could not start: ${error.message}`);}
  }
  listen(root,'input',event=>{
    const el=event.target,key=el.dataset.setting;
    if(record)return;
    if(el.dataset.hex){if(!/^#[0-9a-f]{6}$/i.test(el.value)){el.setCustomValidity('Enter a six-digit hex color, such as #b9f4ba.');return;}el.setCustomValidity('');settings[el.dataset.hex]=el.value;if(el.dataset.hex==='ink')settings.color='mono';clearPreset();syncControls();}
    if(key){settings[key]=el.type==='checkbox'?el.checked:el.type==='range'?Number(el.value):el.value;if(key==='ink')settings.color='mono';clearPreset();syncControls();}
    if(el.matches('[data-custom]')) {
      const value=el.value;
      if(value.length<2||/[^\x20-\x7e]/.test(value)){el.setCustomValidity('Use 2–64 printable ASCII characters.');fail('Custom characters need 2–64 printable ASCII characters.');return;}
      el.setCustomValidity('');fail('');settings.ramp=cleanRamp(value);clearPreset();dirty=true;
    }
    if(el.matches('[data-seek]')&&sourceKind==='video'){source.currentTime=Number(el.value);dirty=true;}
  });
  listen($('[data-ramp]'),'change',event=>{
    const value=event.target.value;$('.ascii-custom').hidden=value!=='custom';
    if(value==='custom'){$('[data-custom]').focus();settings.ramp=cleanRamp($('[data-custom]').value);}else settings.ramp=RAMPS[value];clearPreset();dirty=true;
  });
  listen(root,'click',async event=>{
    const button=event.target.closest('button');if(!button)return;
    const action=button.dataset.action;
    if(button.dataset.preset){setPreset(button.dataset.preset);return;}
    if(action==='play') {
      if(donut)running=!running;
      else if(sourceKind==='video'){if(source.paused){try{await source.play();}catch{fail('Playback could not start. Try another video format.');}}else source.pause();}
      updatePlayback();
    }
    if(action==='sample')makeSample();
    if(action==='sample-video')loadMedia(`${assetBase}motion.webm`,'video','Color parade');
    if(action==='source'){const showing=original.hidden;original.hidden=!showing;canvas.hidden=showing;button.setAttribute('aria-pressed',String(showing));button.textContent=showing?'Show ASCII':'Show original';dirty=true;}
    if(action==='png'||action==='text')exportFrame(action);
    if(action==='copy'){draw();try{await navigator.clipboard.writeText(toText(currentFrame));status('Copied. Paste a little ASCII into the world.');}catch{fail('Clipboard access is unavailable. Use Save text instead.');}}
    if(action==='record')startRecording();
    if(action==='cancel')stopRecording(true);
    if(action==='reset'){settings={...DEFAULTS};a=0.85;b=0.35;setPreset('terminal');fail('');status('Back to the original recipe.');}
    if(action==='surprise'){const keys=Object.keys(PRESETS);setPreset(keys[Math.floor(Math.random()*keys.length)]);settings.columns=[70,100,140,160][Math.floor(Math.random()*4)];if(donut){settings.tube=0.3+Math.random()*0.6;settings.speed=0.3+Math.random()*1.5;settings.tumble=Math.random();}else{settings.contrast=0.8+Math.random()*1.1;settings.gamma=0.7+Math.random()*0.9;}syncControls();status('A new recipe. Adjust to taste.');}
  });
  listen($('.ascii-text-details'),'toggle',()=>{if(currentFrame&&$('.ascii-text-details').open)$('[data-text]').textContent=toText(currentFrame);});
  if(!donut){
    root.querySelectorAll('.ascii-file').forEach(input=>listen(input,'change',event=>{upload(event.target.files[0]);event.target.value='';}));
    listen(root,'dragover',event=>{event.preventDefault();});
    listen(root,'dragenter',event=>{event.preventDefault();dragDepth++;root.classList.add('ascii-dragging');});
    listen(root,'dragleave',()=>{if(--dragDepth<=0)root.classList.remove('ascii-dragging');});
    listen(root,'drop',event=>{event.preventDefault();dragDepth=0;root.classList.remove('ascii-dragging');upload(event.dataTransfer.files[0]);});
    makeSample();
  }
  listen(document,'visibilitychange',()=>{lastTick=0;if(document.hidden&&record){stopRecording(true);fail('Export canceled because the tab was hidden. Keep it visible while recording.');}});
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');listen(reducedMotion,'change',()=>{if(reducedMotion.matches&&!record){running=false;if(sourceKind==='video')source.pause();updatePlayback();}});
  function tick(now) {
    if(disposed)return;
    raf=requestAnimationFrame(tick);
    if(document.hidden)return;
    if(lastTick&&now-lastTick<1000/24)return;
    const dt=lastTick?Math.min((now-lastTick)/1000,0.1):0;lastTick=now;
    if(donut&&running){a+=dt*settings.tumble;b+=dt*settings.speed;dirty=true;}
    if(sourceKind==='video'&&source.readyState>=2){
      if(source.currentTime!==lastSourceTime){lastSourceTime=source.currentTime;dirty=true;}
      $('[data-seek]').value=source.currentTime;$('[data-time]').textContent=`${timeLabel(source.currentTime)} / ${timeLabel(source.duration)}`;
    }
    if(dirty)draw();
    if(record){const elapsed=donut?(now-record.started)/1000:source.currentTime-record.start;status(`Recording ASCII · ${Math.min(100,Math.round(elapsed/record.duration*100))}%`);if(elapsed>=record.duration)stopRecording();}
  }
  syncControls();updatePlayback();draw();raf=requestAnimationFrame(tick);
  return {
    dispose(){disposed=true;loadVersion++;abort.abort();cancelAnimationFrame(raf);if(record){clearTimeout(record.watchdog);record.cancel=true;if(record.recorder.state!=='inactive')record.recorder.stop();record.stream.getTracks().forEach(t=>t.stop());}releaseSource();for(const url of [...pendingURLs,...downloadURLs])URL.revokeObjectURL(url);host.replaceChildren();},
  };
}
