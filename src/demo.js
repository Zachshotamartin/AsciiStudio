import { mountAscii } from './index.js';
let app;
function open() { app?.dispose(); const mode=location.hash==='#studio'?'studio':'donut';app=mountAscii(document.querySelector('#app'),{mode});document.querySelectorAll('nav a').forEach(a=>a.setAttribute('aria-current',String(a.hash===(mode==='studio'?'#studio':'#donut')))); }
addEventListener('hashchange',open);open();
