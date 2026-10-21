// The stage (3D face, fixation stick, X-ray band, reading card, paddle, story) and the controls below it.
// Shared by every page that tells the story; the story engine mounts it into <div class="demo" id="demo">.
// Created by Dr Robert Burke
export const STAGE_HTML = `
<div class="stage" id="stage" role="group" aria-label="3D face illustrating the story above it">
  <canvas id="view" aria-hidden="true"></canvas>
  <svg class="fixstick" id="fixstick" aria-hidden="true" hidden>
    <defs>
      <radialGradient id="ball-shade" cx="36%" cy="32%" r="72%"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#eef1f5"/><stop offset="1" stop-color="#a3abb8"/></radialGradient>
      <linearGradient id="rod-shade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6f7784"/><stop offset=".4" stop-color="#e3e7ee"/><stop offset="1" stop-color="#5f6774"/></linearGradient>
    </defs>
    <ellipse id="stick-shadow" fill="rgba(0, 0, 0, .55)" style="filter: blur(6px)"/>
    <rect id="stick-rod" fill="url(#rod-shade)"/>
    <circle id="stick-ball" fill="url(#ball-shade)"/>
  </svg>
  <div class="xray" id="xray" hidden><span>X-ray: looking through the closed eyelids</span></div>
  <div class="veil" id="veil" hidden></div>
  <div class="selfdot" id="selfdot" hidden><i></i><span>Keep looking at the red dot</span></div>
  <svg class="nerves" id="nerves" aria-hidden="true" hidden></svg>
  <div class="target" id="target" hidden></div>
  <div class="target dim" id="target-b" hidden></div>
  <div class="card" id="card" hidden>
    <span class="tag">See-through card, so we can watch the eyes from behind it</span>
    <div class="card-text" id="card-text"></div>
  </div>
  <div class="ring od" id="ring-R" hidden></div>
  <div class="ring os" id="ring-L" hidden></div>
  <span class="ring-label od" id="label-R" hidden>right eye</span>
  <span class="ring-label os" id="label-L" hidden>left eye</span>
  <span class="tag stick-tag" id="stick-tag" hidden></span>
  <div class="paddle" id="paddle" tabindex="0" role="button" aria-label="Cover paddle. Drag it over an eye; click it to peek behind it." hidden>
    <svg viewBox="0 0 100 200" aria-hidden="true">
      <defs>
        <linearGradient id="paddle-solid" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4b5363"/><stop offset="1" stop-color="#1b1f27"/></linearGradient>
        <mask id="peek-mask" maskUnits="userSpaceOnUse" x="-10" y="-10" width="120" height="220"><rect x="-10" y="-10" width="120" height="220" fill="#fff"/><circle id="peek-cut" cx="50" cy="44" r="0" fill="#000"/></mask>
        <pattern id="scan" width="4" height="3" patternUnits="userSpaceOnUse"><rect width="4" height="1" fill="rgba(92, 255, 138, .28)"/></pattern>
      </defs>
      <rect class="stick" x="40" y="80" width="20" height="116" rx="8"/>
      <ellipse class="head" cx="50" cy="44" rx="47" ry="42" mask="url(#peek-mask)"/>
      <circle id="peek-glass" cx="50" cy="44" r="0" fill="url(#scan)"/>
      <circle id="peek-rim" cx="50" cy="44" r="0" fill="none" stroke="#5cff8a" stroke-width="2.5"/>
      <text id="peek-label" x="50.6" y="8.6" text-anchor="middle">X-RAY</text>
    </svg>
  </div>
  <div class="callout" id="callout" hidden></div>
  <div class="input-chip" id="input-chip" hidden><i></i><span></span></div>
  <div class="story" id="story">
    <p id="story-text" aria-live="polite"></p>
    <div class="story-nav">
      <button type="button" class="back" id="back">‹ Back</button>
      <span class="progress" id="progress"></span>
      <button type="button" class="next" id="next">Next ›</button>
    </div>
  </div>
  <a class="credit" href="https://calgaryvisioncentre.com/" target="_top" rel="author">Created by Dr Robert Burke</a>
  <div class="loader" id="loader">Loading… <span id="load-pct"></span></div>
</div>

<div class="nav">
  <div class="speed" id="speed" role="group" aria-label="Reading speed" hidden>
    <button type="button" data-slow="0" aria-pressed="true" title="About 150 words a minute, eye movements at true size">Full speed</button><button type="button" data-slow="1" aria-pressed="false" title="Slowed down and magnified">Slow motion</button>
  </div>
  <button class="linkish" type="button" id="drift">Show eyes that drift inward</button>
</div>
<p class="legend">Rings show where each eye is aiming: <i style="border-color:var(--od)"></i>right eye <i style="border-color:var(--os)"></i>left eye. Drifting eyes, slow motion and how far the eyes turn in to read are exaggerated so they're easy to see; at full speed, the misses are shown at true size.</p>
`;
