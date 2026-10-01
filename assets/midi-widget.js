(() => {
"use strict";

/* ===========================================================================
   1. CONFIG
   Art is native 6400 px / 16 bars, 525-526 px tall. It's scaled so the staff
   is STAFF_H px on screen; every distance below is in on-screen pixels.
   =========================================================================== */
const BPM           = 72;
const BEATS_PER_BAR = 4;
const BARS          = 16;
const SEC_PER_BEAT  = 60 / BPM;
const SEC_PER_BAR   = SEC_PER_BEAT * BEATS_PER_BAR;
const LOOP_DUR      = SEC_PER_BAR * BARS;            // 53.3333 s

const STAFF_H       = 300;                           // on-screen staff height (user)
const NAT_STAFF     = 526, NAT_CURSOR = 589, NAT_MASTER = 6400;
const S             = STAFF_H / NAT_STAFF;           // global scale ≈ 0.570
const MASTER_W      = Math.round(NAT_MASTER * S);    // one 16-bar loop, on-screen px ≈ 3650
const SCROLL_PPS    = MASTER_W / LOOP_DUR;           // ≈ 68.4 px/sec
const LANE_TOP      = Math.round((NAT_CURSOR - NAT_STAFF) / 2 * S);  // cursor overhang above the staff ≈ 18
const CURSOR_H      = Math.round(NAT_CURSOR * S);    // playhead scaled by S, centred on the staff ≈ 336
const STRIP_GAP     = 4;                             // staff bottom → drum/perc top
const STRIP_H       = Math.round(26 * S) + 4;        // drum/perc strip box ≈ 19
const STAGE_H       = LANE_TOP + STAFF_H + STRIP_GAP + Math.round(26 * S) + 3;

const FADE          = 0.005;                         // 5 ms — every audible audio cut
const MASTER_GAIN   = 2.6;                           // pre-limiter drive — raise for more loudness
const LIMIT_CEIL_DB = -1.0;                          // brick-wall ceiling so the sum never clips
                                                    // (2025-09-05 stems run ~5 dB hotter than the old
                                                    //  set: at 2.6, 2-4 stems sit ~-10 dBFS, all-on
                                                    //  ~-1 with the limiter doing 3-4 dB)
const DEFAULT_SYNC_PX = -4;                          // residual visual/perception offset (wired).
                                                    // Press T for the tuner; L toggles the
                                                    // AudioContext.outputLatency auto-compensation.
const TAP_HOLD_MS   = 300;                           // mobile tap highlight hold, then 1 s ease-out

const A = "/assets/";
const ASSET_REV = "2025-09-05d";                     // bump when the files in assets/ change
const asset = f => A + f + "?v=" + ASSET_REV;

/* tiled layers, bottom → top (z-order). every tile is one 16-bar loop wide.
   `strip` lanes (drums, perc) are thin and sit below the staff.               */
const LAYERS = [
  { id:"staff",      file:"staff.svg",         staff:true, stems:[] },
  { id:"drums",      file:"drums_midi.svg",    strip:true, stems:["drums"] },
  { id:"perc",       file:"perc_midi.svg",     strip:true, stems:["perc"] },   // on top of drums
  { id:"bass",       file:"bass_midi.svg",     stems:["bass","bass_distort"] },
  { id:"mm",         file:"mm_midi.svg",       stems:["mm"] },
  { id:"gtr_chords", file:"gtrchords_midi.svg",stems:["gtr_chords"] },          // above mm, below gtr_low
  { id:"gtr_low",    file:"gtrlow_midi.svg",   stems:["gtr_low"] },
  { id:"synth",      file:"synth_midi.svg",    stems:["synth","synth_fx"] },
  { id:"gtr_hi",     file:"gtrhi_midi.svg",    stems:["gtr_hi"] },
  { id:"mm_fx",      file:"mmfx_midi.svg",     stems:["mm_fx"] },
];
LAYERS.forEach(L => L.w = MASTER_W);                // all tiles are one loop wide

const STEMS = ["drums","perc","bass","bass_distort","gtr_low","gtr_hi","gtr_chords","mm","mm_fx","synth","synth_fx"];

/* the 5 instrument groups.
   dots[i] toggles stems[i] on/off.  icon = mute-all / restore.
   needsBase:i  → stems[i] (an fx/distort layer) can't play without stems[0].
   the PERC/DISTORT/FX text dot is used only for a stem with NO midi lane of its
   own (bass_distort, synth_fx). perc + mm_fx now have lanes → plain filled dot. */
const GROUPS = [
  { id:"drums",  icon:"icon_-_drum.svg",  stems:["drums","perc"],
    dots:["dot_-_filled.svg","dot_-_filled.svg"], tints:["--c-drums","--c-perc"] },

  { id:"bass",   icon:"icon_-_bass.svg",  stems:["bass","bass_distort"], needsBase:1,
    dots:["dot_-_filled.svg","dot_-_distort.svg"], tints:["--c-bass","--c-bass"] },   // distort dot = bass red

  { id:"guitar", icon:"icon_-_gtr.svg",   stems:["gtr_chords","gtr_low","gtr_hi"],
    dots:["dot_-_filled.svg","dot_-_filled.svg","dot_-_filled.svg"],
    tints:["--c-gtr-chords","--c-gtr","--c-gtr-hi"] },

  { id:"synth",  icon:"icon_-_synth.svg", stems:["synth","synth_fx"], needsBase:1,
    dots:["dot_-_filled.svg","dot_-_fx.svg"],      tints:["--c-synth","--c-synth"] },

  { id:"melodics", icon:"icon_-_mm.svg",  stems:["mm","mm_fx"],
    dots:["dot_-_filled.svg","dot_-_filled.svg"],  tints:["--c-mm","--c-mm-fx"] },
];
const groupById = id => GROUPS.find(g => g.id === id);
const FX_STEMS  = new Set(["bass_distort","synth_fx","mm_fx"]);   // never on at load

/* ===========================================================================
   2. STATE
   =========================================================================== */
const stemOn        = {};  STEMS.forEach(s => stemOn[s] = false);
const groupPrev     = {};  // group id -> stems that were on before the last mute-all
const voiceStartDist= {};  // stem -> scroll distance (px) at which its audio begins
const missing       = new Set();

let started = false;       // transport clock established (stays true)
let playing = false;       // transport actively running
let starting = false;
let previewing = null;     // group id currently focused, or null
let previewStem = null;    // specific stem id when a single dot is focused, else null
let previewFlash = false;  // true = one-shot flash (whole veil, no z-lift); false = hover spotlight
let flashActive = false;   // flash animation in progress → hover events are ignored
let flashT1 = 0, flashT2 = 0;
let seamK = -1;            // last loop-boundary index the 5 ms seam fade was scheduled for
let duckOn    = localStorage.getItem("mbw_duck") !== "0";        // dip non-focused tracks
let bumpOn    = localStorage.getItem("mbw_bump") === "1";        // lift the focused track
let duckFadeMs = +(localStorage.getItem("mbw_duckfade") || 5);   // fade-in/out time for both
let T0 = 0, raf = 0;
let pausedElapsed = 0;

let tunerShown = new URLSearchParams(location.search).has("tune");
let SYNC_OFFSET_PX = (() => {
  const v = parseFloat(localStorage.getItem("mbw_sync"));
  return Number.isFinite(v) ? v : DEFAULT_SYNC_PX;
})();

/* ===========================================================================
   3. ASSETS
   =========================================================================== */
const svgText = {};
async function fetchSVG(file){
  try{ const r = await fetch(asset(file)); if(!r.ok) throw 0; svgText[file] = await r.text(); }
  catch(e){ svgText[file] = null; }
}

/* ===========================================================================
   4. AUDIO  —  every stem loops, phase-locked to one transport clock.
   Each voice:  BufferSource(loop) → gMute (5 ms fades) → master
   =========================================================================== */
let AC = null, master = null, limiterNode = null;
const buffers = {}, voices = {};

async function loadAudio(){
  AC = new (window.AudioContext || window.webkitAudioContext)();

  // master bus:  voices → master(drive) → limiter(brick wall) → destination
  master = AC.createGain(); master.gain.value = MASTER_GAIN;
  const limiter = AC.createDynamicsCompressor();
  limiter.threshold.value = LIMIT_CEIL_DB;   // ceiling in dBFS
  limiter.knee.value      = 0;               // hard knee
  limiter.ratio.value     = 20;              // ∞:1 in practice
  limiter.attack.value    = 0.003;
  limiter.release.value   = 0.25;
  master.connect(limiter).connect(AC.destination);
  limiterNode = limiter;
  await Promise.all(STEMS.map(async id => {
    try{
      const r = await fetch(asset(id + ".mp3")); if(!r.ok) throw 0;
      buffers[id] = await AC.decodeAudioData(await r.arrayBuffer());
    }catch(e){ missing.add(id + ".mp3"); buffers[id] = null; }
  }));
}

const loopPos = () => ((AC.currentTime - T0) % LOOP_DUR + LOOP_DUR) % LOOP_DUR;

/* how far (px) the visual should trail the clock to match the real output path.
   AudioContext.outputLatency jumps when the user is on Bluetooth (~0.15-0.25 s)
   vs wired (~0.01-0.03 s). We compensate only for the part ABOVE a normal wired
   baseline, capped, so a bogus reading can't wildly desync the page. Set
   LAG_CAP to 0 to disable device compensation entirely. */
const LAG_BASELINE = 0.02, LAG_CAP = 0.30;
let lagComp = localStorage.getItem("mbw_lagcomp") !== "0";   // toggle with L in the tuner
function outputLagPx(){
  if(!lagComp) return 0;
  const l = AC && AC.outputLatency;
  if(typeof l !== "number" || !isFinite(l)) return 0;
  return Math.min(LAG_CAP, Math.max(0, l - LAG_BASELINE)) * SCROLL_PPS;
}

/* audio + its midi always enter at the start of the next bar */
function entryTime(){
  const now = AC.currentTime, pos = loopPos();
  const bar = Math.floor(pos / SEC_PER_BAR);
  let d = (bar + 1) * SEC_PER_BAR - pos;
  if(d <= 0) d += LOOP_DUR;
  return now + d;
}

const FOCUS_DUCK = Math.pow(10, -2   / 20);      // −2 dB for non-focused tracks
const FOCUS_BUMP = Math.pow(10, +0.3 / 20);      // +0.3 dB for the focused track

function enableStem(id, at){
  if(voices[id] || !buffers[id]) return;
  const buf = buffers[id];
  const src = AC.createBufferSource(); src.buffer = buf; src.loop = true;
  src.loopEnd = LOOP_DUR;                        // loop at the musical bar-16 point (ignore mp3 tail padding)
  const gMute  = AC.createGain(); gMute.gain.value = 0;     // user mute / 5 ms fades
  const gFocus = AC.createGain(); gFocus.gain.value = 1;    // −2 dB duck when another track is focused
  src.connect(gMute).connect(gFocus).connect(master);
  const offset = (((at - T0) % LOOP_DUR + LOOP_DUR) % LOOP_DUR) % buf.duration;
  src.start(at, offset);
  gMute.gain.setValueAtTime(0, at);
  gMute.gain.linearRampToValueAtTime(1, at + FADE);            // 5 ms fade-in
  voices[id] = { src, gMute, gFocus };
  // keep an existing catch-up origin (pause/resume) — only a fresh unmute sweeps in
  if(voiceStartDist[id] == null) voiceStartDist[id] = (at - T0) * SCROLL_PPS;
}
function disableStem(id){
  const v = voices[id]; if(!v) return;
  const now = AC.currentTime;
  v.gMute.gain.cancelScheduledValues(now);
  v.gMute.gain.setValueAtTime(v.gMute.gain.value, now);
  v.gMute.gain.linearRampToValueAtTime(0, now + FADE);        // 5 ms fade-out
  try{ v.src.stop(now + FADE + 0.02); }catch(e){}
  delete voices[id];
  delete voiceStartDist[id];
}

/* which stems are focused (highlighted) right now — used by the veil AND the duck */
function focusedStems(){
  if(!playing || previewFlash || !previewing) return null;
  const g = groupById(previewing);
  const stems = previewStem ? [previewStem] : g.stems;
  const p = stems.filter(s => stemOn[s]);
  return p.length ? new Set(p) : null;
}
/* on focus: non-focused tracks dip −2 dB (D toggle), focused track lifts +2 dB
   (B toggle), both with a [ ]-adjustable fade.  See the tuner (press T). */
function updateFocusDuck(){
  if(!started || !AC) return;
  const now = AC.currentTime;
  const foc = focusedStems();
  const ramp = Math.max(0.001, duckFadeMs / 1000);
  Object.keys(voices).forEach(id => {
    const v = voices[id]; if(!v) return;
    let target = 1;
    if(foc){
      if(foc.has(id))      target = bumpOn ? FOCUS_BUMP : 1;
      else if(duckOn)      target = FOCUS_DUCK;
    }
    v.gFocus.gain.cancelScheduledValues(now);
    v.gFocus.gain.setValueAtTime(v.gFocus.gain.value, now);
    v.gFocus.gain.linearRampToValueAtTime(target, now + ramp);
  });
}

/* 5 ms dip on the master bus at every loop boundary, so an imperfect loop seam
   never clicks. all stems are phase-locked, so one automation covers them all. */
function scheduleLoopSeams(){
  if(!AC || !master) return;
  const kNow = Math.floor((AC.currentTime - T0) / LOOP_DUR);
  for(let k = Math.max(kNow + 1, seamK + 1, 1); k <= kNow + 2; k++){   // k≥1: first seam is the first loop wrap
    seamK = k;
    const t = T0 + k * LOOP_DUR, g = master.gain;
    g.setValueAtTime(MASTER_GAIN, t - FADE);
    g.linearRampToValueAtTime(0.0001, t);
    g.linearRampToValueAtTime(MASTER_GAIN, t + FADE);
  }
}

function syncAudio(){
  if(!started || !playing) return;
  const at = entryTime();
  STEMS.forEach(id => {
    if(stemOn[id] && !voices[id]) enableStem(id, at);
    else if(!stemOn[id] && voices[id]) disableStem(id);
  });
}

/* ===========================================================================
   5. STAGE / LAYERS
   =========================================================================== */
const widget  = document.getElementById("widget");
const stage   = document.getElementById("stage");
const lanes   = document.getElementById("lanes");
const cursor  = document.getElementById("cursor");
const startEl = document.getElementById("start");
const layerEl = id => document.getElementById("layer-" + id);
const trackEl = id => layerEl(id).firstElementChild;

function cursorX(){
  return parseFloat(getComputedStyle(widget).getPropertyValue("--cursor-x")) || 36;
}

function applyGeometry(){
  const r = widget.style;
  r.setProperty("--stage-h",   STAGE_H + "px");
  r.setProperty("--lane-top",  LANE_TOP + "px");
  r.setProperty("--staff-h",   STAFF_H + "px");
  r.setProperty("--strip-top", (LANE_TOP + STAFF_H + STRIP_GAP) + "px");
  r.setProperty("--strip-h",   STRIP_H + "px");
  r.setProperty("--cursor-h",  CURSOR_H + "px");
}

function buildStage(){
  applyGeometry();
  LAYERS.forEach((L, i) => {
    const el = document.createElement("div");
    el.className = "layer" + (L.staff ? " staff" : "") + (L.strip ? " strip" : "");
    el.id = "layer-" + L.id;
    el.style.zIndex = i + 1;
    const track = document.createElement("div");
    track.className = "track";
    track.style.left = "calc(var(--cursor-x) - " + L.w + "px)";
    const copies = Math.ceil((window.innerWidth + 2 * L.w) / L.w) + 2;
    let html = "";
    for(let c = 0; c < copies; c++) html += `<img src="${asset(L.file)}" alt="" draggable="false" width="${L.w}">`;
    track.innerHTML = html;
    track.querySelectorAll("img").forEach(img =>
      img.addEventListener("error", () => { missing.add(L.file); updateBanner(); }, { once:true }));
    el.appendChild(track);
    lanes.appendChild(el);
  });

  const ci = new Image();
  ci.onload  = () => cursor.insertBefore(ci, cursor.firstChild);
  ci.onerror = () => { missing.add("cursor.svg"); updateBanner(); };
  ci.src = asset("cursor.svg");

  document.getElementById("startBtn").innerHTML =
    `<img src="${asset('icon_-_play.svg')}" alt="play" draggable="false">`;

  parkLayers();
}

/* pre-play / resize: park every ribbon at pattern-position 0, blank left of the cursor */
function parkLayers(){
  const cx = cursorX();
  LAYERS.forEach(L => {
    trackEl(L.id).style.transform = "translateX(0px)";
    layerEl(L.id).style.setProperty("--edge", cx + "px");
  });
}

const veilEl = document.getElementById("veil");
let litLayers = new Set();     // layer ids whose instrument is toggled on

function layerForStem(s){
  return LAYERS.find(L => L.stems.includes(s)).id;
}

/* which lanes the mix wants lit, plus the hover highlight.
   Actual .show for note lanes is gated on audio entry inside frame(). */
function refreshLayers(){
  const lit = {};
  STEMS.forEach(s => { if(stemOn[s]) lit[layerForStem(s)] = true; });
  litLayers = new Set(Object.keys(lit).filter(k => lit[k]));

  const foc = focusedStems();                    // hovering an instrument (its playing stems) or one dot
  const hiLayers = foc ? new Set([...foc].map(layerForStem)) : null;

  LAYERS.forEach(L => {
    const el = layerEl(L.id);
    if(L.staff) return;                           // staff never dims / never re-orders
    if(!playing) el.classList.toggle("show", litLayers.has(L.id));   // frame() owns it while playing
    el.classList.toggle("dim", !!(hiLayers && !hiLayers.has(L.id))); // the non-focused lanes recede
  });

  if(!flashActive) veilEl.classList.remove("slow", "on");   // veil is flash-only now
}

function frame(){
  if(!playing) return;
  const dist = (AC.currentTime - T0) * SCROLL_PPS + SYNC_OFFSET_PX - outputLagPx();
  const cx = cursorX();

  LAYERS.forEach(L => {
    const el = layerEl(L.id);
    el.firstElementChild.style.transform = "translateX(" + (-(dist % L.w)) + "px)";

    if(L.staff){
      const edge = cx - dist;                 // sweeps in once on first load, then seamless
      el.style.setProperty("--edge", (edge > 0 ? edge : 0) + "px");
      return;
    }

    // a note lane appears as soon as its audio is scheduled. --edge = the screen x
    // of the audio entry point: it sits N bars right of the cursor, scrolls in, and
    // reaches the cursor exactly as the audio starts — so no box crosses unheard.
    let startD = null;
    if(litLayers.has(L.id)){
      const ds = L.stems.filter(s => stemOn[s] && voiceStartDist[s] != null).map(s => voiceStartDist[s]);
      if(ds.length) startD = Math.min(...ds);
    }
    el.classList.toggle("show", startD != null);
    const edge = startD != null ? cx - (dist - startD) : cx;
    el.style.setProperty("--edge", (edge > 0 ? edge : 0) + "px");
  });

  scheduleLoopSeams();
  if(tunerShown) drawTuner();
  raf = requestAnimationFrame(frame);
}

/* ===========================================================================
   6. INSTRUMENT RACK
   =========================================================================== */
const rack = document.getElementById("rack");

function buildRack(){
  GROUPS.forEach(g => {
    const grp = document.createElement("div");
    grp.className = "group";
    grp.dataset.id = g.id;
    grp.innerHTML =
      `<button class="icon" type="button" aria-label="${g.id}">
         <img src="${asset(g.icon)}" alt="" draggable="false">
       </button>
       <span class="dots">` +
       g.stems.map((s, i) => `<button class="slot" type="button" data-slot="${i}" aria-label="${s}"></button>`).join("") +
       `</span>`;

    const icon = grp.querySelector(".icon");
    icon.addEventListener("click", () => toggleInstrument(g.id));
    grp.querySelectorAll(".slot").forEach((el, i) => {
      el.addEventListener("click", () => toggleDot(g.id, i));
      // hovering a dot → focus just that stem (if it's playing)
      el.addEventListener("pointerenter", e => { if(e.pointerType !== "touch") setPreview(g.id, g.stems[i]); });
    });
    // hovering the illustration → focus the whole instrument
    icon.addEventListener("pointerenter", e => { if(e.pointerType !== "touch") setPreview(g.id, null); });
    grp.addEventListener("pointerleave",  e => { if(e.pointerType !== "touch") setPreview(null, null); });
    // tap (touch) anywhere on the group → flash
    grp.addEventListener("pointerup",     e => { if(e.pointerType === "touch") flashHighlight(g.id); });

    rack.appendChild(grp);
  });
  renderRack();
}

function setPreview(id, stem){
  if(flashActive) return;                           // a running flash has priority
  stem = stem || null;
  if(previewing === id && previewStem === stem && !previewFlash) return;
  previewFlash = false;
  previewing = id;
  previewStem = stem;
  refreshLayers();                                  // .dim eases in/out via the .layer transition
  updateFocusDuck();
}

/* one-shot flash: whole stage veils to ~12%, holds TAP_HOLD_MS, then eases back
   over 1 s. Fires on a mobile tap AND whenever a track is unmuted, on desktop
   too, independent of hover. Hover is ignored until the flash finishes; the
   hover spotlight only returns on the first fresh pointer-enter after that. */
function flashHighlight(id){
  if(!playing) return;
  clearTimeout(flashT1); clearTimeout(flashT2);
  flashActive = true;
  previewFlash = true;
  previewing = id;
  previewStem = null;
  veilEl.classList.remove("slow");
  veilEl.classList.add("on");                       // whole-stage veil, no z-lift
  refreshLayers();
  updateFocusDuck();
  flashT1 = setTimeout(() => {
    veilEl.classList.add("slow");
    veilEl.classList.remove("on");                  // veil eases out over 1 s
    previewing = null;
    flashT2 = setTimeout(() => {
      veilEl.classList.remove("slow");
      previewFlash = false;
      flashActive = false;
      refreshLayers();
    }, 1000);
  }, TAP_HOLD_MS);
}

function renderRack(){
  GROUPS.forEach(g => {
    const grp = rack.querySelector(`[data-id="${g.id}"]`);
    g.stems.forEach((stem, i) => {
      const slot = grp.querySelector(`[data-slot="${i}"]`);
      const on = !!stemOn[stem];
      const art = svgText[on ? g.dots[i] : "dot_-_empty.svg"];
      slot.classList.toggle("filled", on);
      slot.style.setProperty("--tint", on ? `var(${g.tints[i]})` : "transparent");
      if(art){ slot.classList.remove("css"); slot.innerHTML = art; }
      else   { slot.classList.add("css");    slot.innerHTML = ""; }
    });
  });
}

function afterMixChange(){ renderRack(); refreshLayers(); syncAudio(); updateFocusDuck(); }

function toggleDot(gid, i){
  const g = groupById(gid);
  const stem = g.stems[i];
  const turningOn = !stemOn[stem];
  stemOn[stem] = turningOn;
  if(g.needsBase != null){                            // fx/distort can't sound without its base
    if(i === g.needsBase && turningOn) stemOn[g.stems[0]] = true;
    if(i === 0 && !turningOn)          stemOn[g.stems[g.needsBase]] = false;
  }
  // muting the group down to nothing via dots → next instrument-click starts fresh (first dot)
  if(!g.stems.some(s => stemOn[s])) delete groupPrev[gid];
  afterMixChange();
  if(turningOn) flashHighlight(gid);
}

function toggleInstrument(gid){
  const g = groupById(gid);
  const on = g.stems.filter(s => stemOn[s]);
  let unmuted = false;
  if(on.length){
    groupPrev[gid] = on.slice();               // remember for restore
    g.stems.forEach(s => stemOn[s] = false);
  }else{
    let restore = groupPrev[gid];
    if(!restore || !restore.length) restore = [g.stems[0]];   // fresh → first dot only
    restore.forEach(s => stemOn[s] = true);
    if(g.needsBase != null && stemOn[g.stems[g.needsBase]]) stemOn[g.stems[0]] = true;
    unmuted = true;
  }
  afterMixChange();
  if(unmuted) flashHighlight(gid);
}

/* ===========================================================================
   7. TRANSPORT — start / pause / resume
   =========================================================================== */
function seedRandom(){
  const target = 2 + (Math.random() * 2 | 0);           // 2–3 stems on at load
  const bag = STEMS.filter(s => !FX_STEMS.has(s))       // no fx / distort at load
                   .sort(() => Math.random() - 0.5);
  for(let i = 0; i < target && i < bag.length; i++) stemOn[bag[i]] = true;
}

async function ensureStarted(){
  if(started || starting) return;
  starting = true;
  startEl.classList.add("hidden");

  await loadAudio();
  if(AC.state === "suspended") await AC.resume();
  updateBanner();

  T0 = AC.currentTime + 0.08;                   // audio always starts from the top
  seamK = -1;
  started = true;
  playing = true;
  widget.classList.add("playing");

  STEMS.forEach(id => { if(stemOn[id]) enableStem(id, T0); });
  raf = requestAnimationFrame(frame);
}

function pauseTransport(){
  if(!playing) return;
  playing = false;
  cancelAnimationFrame(raf);
  previewing = null; previewStem = null; previewFlash = false;
  const now = AC.currentTime;
  pausedElapsed = now - T0;
  Object.values(voices).forEach(v => {          // 5 ms fade, then stop
    if(!v) return;
    v.gMute.gain.cancelScheduledValues(now);
    v.gMute.gain.setValueAtTime(v.gMute.gain.value, now);
    v.gMute.gain.linearRampToValueAtTime(0, now + FADE);
  });
  setTimeout(() => {
    Object.keys(voices).forEach(id => { try{ voices[id].src.stop(); }catch(e){} delete voices[id]; });
    // keep voiceStartDist so resume shows the full left side (no fresh sweep-in)
    if(AC) AC.suspend();
  }, 25);
  widget.classList.remove("playing");
  startEl.classList.remove("hidden");
  refreshLayers();
}

async function resumeTransport(){
  if(!started || playing) return;
  startEl.classList.add("hidden");
  widget.classList.add("playing");
  if(AC && AC.state === "suspended") await AC.resume();
  T0 = AC.currentTime - pausedElapsed;           // pick the transport back up in place
  seamK = -1;
  playing = true;
  STEMS.forEach(id => { if(stemOn[id]) enableStem(id, AC.currentTime); });
  raf = requestAnimationFrame(frame);
}

function toggleTransport(){
  if(!started) ensureStarted();
  else if(playing) pauseTransport();
  else resumeTransport();
}

startEl.addEventListener("click", toggleTransport);
stage.addEventListener("pointerdown", e => { if(!e.target.closest(".start")) toggleTransport(); });
addEventListener("keydown", e => {
  const typing = /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(e.target.tagName);
  if(e.code === "Space" && !typing){ e.preventDefault(); toggleTransport(); return; }
  if(e.code === "KeyT" && !typing){ tunerShown = !tunerShown; drawTuner(); return; }
  if(e.code === "KeyI" && !typing){
    introShown = !introShown;
    if(introShown) buildIntroPanel(); else if(introPanel) introPanel.hidden = true;
    return;
  }
  if(!tunerShown) return;
  if(e.code === "ArrowLeft" || e.code === "ArrowRight"){
    e.preventDefault();
    SYNC_OFFSET_PX += (e.code === "ArrowRight" ? 1 : -1) * (e.shiftKey ? 10 : 1);
    localStorage.setItem("mbw_sync", SYNC_OFFSET_PX);
    drawTuner();
  }
  if(e.code === "Digit0"){ SYNC_OFFSET_PX = 0; localStorage.setItem("mbw_sync", 0); drawTuner(); }
  if(e.code === "KeyL"){
    lagComp = !lagComp; localStorage.setItem("mbw_lagcomp", lagComp ? "1" : "0"); drawTuner();
  }
  if(e.code === "KeyD"){
    duckOn = !duckOn; localStorage.setItem("mbw_duck", duckOn ? "1" : "0"); updateFocusDuck(); drawTuner();
  }
  if(e.code === "KeyB"){
    bumpOn = !bumpOn; localStorage.setItem("mbw_bump", bumpOn ? "1" : "0"); updateFocusDuck(); drawTuner();
  }
  if(e.code === "BracketLeft" || e.code === "BracketRight"){
    duckFadeMs = Math.max(0, duckFadeMs + (e.code === "BracketRight" ? 5 : -5));
    localStorage.setItem("mbw_duckfade", duckFadeMs); drawTuner();
  }
});

/* ===========================================================================
   8. SYNC TUNER  —  ?tune  or press  T  to toggle
   =========================================================================== */
let tunerEl = null;
function drawTuner(){
  if(!tunerShown){ if(tunerEl) tunerEl.hidden = true; return; }
  if(!tunerEl){
    tunerEl = document.createElement("div");
    tunerEl.className = "tuner";
    document.body.appendChild(tunerEl);
  }
  tunerEl.hidden = false;
  const lag = AC ? Math.round(outputLagPx()) : 0;
  tunerEl.innerHTML =
    `sync <b>${SYNC_OFFSET_PX} px</b>  ·  ← → nudge (⇧=10) · 0 reset<br>` +
    `device-lag comp <b>${lagComp ? "on" : "off"}</b> (−${lag}px) · L toggle<br>` +
    `focus: duck others <b>${duckOn ? "on" : "off"}</b> −2dB (D) · bump focused <b>${bumpOn ? "on" : "off"}</b> +0.3dB (B) · fade ${duckFadeMs}ms ([ ])<br>` +
    `I = intro panel`;
}

/* ===========================================================================
   8b. INTRO  —  each element pops in from a random vector.  Press I to tweak.
   =========================================================================== */
let introShown = new URLSearchParams(location.search).has("intro");
let introTimer = 0, introTimer2 = 0, introPanel = null;
const introDefaults = {
  dur:1, blur:0, stagger:0.4, pop:24, ease:"ease",                       // phase 1 — pop-in
  settle:1.2, playDelay:0, playFade:0.4,                                 // phase 2 — settle + play
};
const introCfg = {};
Object.keys(introDefaults).forEach(k => {
  const v = localStorage.getItem("mbw_i_" + k);
  introCfg[k] = v == null ? introDefaults[k] : (k === "ease" ? v : +v);
});

/* phase 1 pops these in from random vectors, at 100% opacity */
function introItems(){
  return [
    ...LAYERS.map(L => layerEl(L.id)).filter(el => el.classList.contains("show") || el.classList.contains("staff")),
    cursor, rack,
  ];
}

function runIntro(){
  clearTimeout(introTimer); clearTimeout(introTimer2);
  const reduce = matchMedia("(prefers-reduced-motion:reduce)").matches;
  const dur  = reduce ? 0.25 : introCfg.dur;
  const stag = reduce ? 0 : introCfg.stagger;
  const r = widget.style;
  r.setProperty("--i-dur",  dur + "s");
  r.setProperty("--i-blur", (reduce ? 0 : introCfg.blur) + "px");
  r.setProperty("--i-ease", introCfg.ease);
  r.setProperty("--i-settle",   (reduce ? 0.2 : introCfg.settle) + "s");
  r.setProperty("--i-play-fade",(reduce ? 0.2 : introCfg.playFade) + "s");

  const items = introItems();
  items.forEach(el => {
    if(reduce){ el.style.removeProperty("--dx"); el.style.removeProperty("--dy"); el.style.animationDelay = ""; }
    else{
      const ang = Math.random() * Math.PI * 2;
      const mag = introCfg.pop * (0.45 + Math.random() * 0.55);   // random vector per element
      el.style.setProperty("--dx", (Math.cos(ang) * mag).toFixed(1) + "px");
      el.style.setProperty("--dy", (Math.sin(ang) * mag).toFixed(1) + "px");
      el.style.animationDelay = (Math.random() * stag).toFixed(3) + "s";
    }
  });
  startEl.style.removeProperty("--dx"); startEl.style.removeProperty("--dy");
  startEl.style.animationDelay = (reduce ? 0 : introCfg.playDelay) + "s";

  widget.classList.remove("intro-run", "settle");
  widget.classList.add("intro");
  void widget.offsetWidth;                       // force reflow so the animation restarts
  widget.classList.replace("intro", "intro-run");

  const phase1 = (dur + stag) * 1000;
  introTimer = setTimeout(() => widget.classList.add("settle"), phase1);   // phase 2: settle + play

  const total = phase1 + Math.max(introCfg.settle, introCfg.playDelay + introCfg.playFade) * 1000 + 250;
  introTimer2 = setTimeout(() => {
    widget.classList.remove("intro-run", "settle");
    [...items, startEl].forEach(el => { el.style.animationDelay = ""; el.style.removeProperty("--dx"); el.style.removeProperty("--dy"); });
  }, total);
}

function buildIntroPanel(){
  if(introPanel){ introPanel.hidden = false; return; }
  introPanel = document.createElement("div");
  introPanel.className = "ipanel";
  introPanel.innerHTML =
    `<b>phase 1 — illustration pop-in</b>` +
    `<label>duration (s)<input type="number" step="0.1" min="0.1" data-k="dur"></label>` +
    `<label>blur (px)<input type="number" step="1" min="0" data-k="blur"></label>` +
    `<label>stagger (s)<input type="number" step="0.05" min="0" data-k="stagger"></label>` +
    `<label>pop distance (px)<input type="number" step="4" min="0" data-k="pop"></label>` +
    `<label>easing<select data-k="ease">` +
      `<option value="cubic-bezier(.2,.65,.15,1)">ease-out soft</option>` +
      `<option value="cubic-bezier(.16,1,.3,1)">ease-out strong</option>` +
      `<option value="cubic-bezier(.34,1.56,.64,1)">overshoot</option>` +
      `<option value="cubic-bezier(.4,0,.2,1)">ease-in-out</option>` +
      `<option value="ease">ease</option>` +
      `<option value="linear">linear</option>` +
    `</select></label>` +
    `<b style="margin-top:6px">phase 2 — settle + play button</b>` +
    `<label>settle to idle (s)<input type="number" step="0.05" min="0.05" data-k="settle"></label>` +
    `<label>play button delay (s)<input type="number" step="0.05" min="0" data-k="playDelay"></label>` +
    `<label>play button fade (s)<input type="number" step="0.05" min="0.05" data-k="playFade"></label>` +
    `<button data-a="replay">▶ replay intro</button>`;
  document.body.appendChild(introPanel);
  introPanel.querySelectorAll("[data-k]").forEach(inp => {
    inp.value = introCfg[inp.dataset.k];
    inp.addEventListener("input", () => {
      const k = inp.dataset.k;
      introCfg[k] = inp.tagName === "SELECT" ? inp.value : +inp.value;
      localStorage.setItem("mbw_i_" + k, introCfg[k]);
    });
  });
  introPanel.querySelector("[data-a=replay]").addEventListener("click", runIntro);
}

/* ===========================================================================
   9. BANNER + BOOT
   =========================================================================== */
function updateBanner(){
  const b = document.getElementById("banner");
  const isFile = location.protocol === "file:";
  if(!isFile && !missing.size){ b.classList.remove("show"); return; }
  b.classList.add("show");
  b.innerHTML =
    (isFile
      ? "This page is open as a local <b>file://</b> — browsers block its assets there. "
      : "Couldn't load " + missing.size + " asset" + (missing.size>1?"s":"") + ". ") +
    "Serve it over http <b>from this folder</b>, then open the page. Works as-is on GitHub Pages / Vercel.";
}

window.__widget = { get info(){ return {
  acState: AC && AC.state, started, playing, previewing,
  pos: (started && AC) ? loopPos() : null,
  sync: SYNC_OFFSET_PX,
  on: STEMS.filter(s => stemOn[s]),
  voices: Object.keys(voices).filter(k => voices[k]),
  limiterReductionDb: limiterNode ? +limiterNode.reduction.toFixed(2) : null,
  focusGains: Object.fromEntries(Object.entries(voices).map(([k,v]) => [k, v ? +v.gFocus.gain.value.toFixed(3) : null])),
  preview: { group: previewing, stem: previewStem, flash: previewFlash },
}; } };

(async function boot(){
  const files = new Set(["dot_-_empty.svg"]);
  GROUPS.forEach(g => g.dots.forEach(d => files.add(d)));
  await Promise.all([...files].map(fetchSVG));

  seedRandom();
  buildStage();
  buildRack();
  refreshLayers();
  updateBanner();
  drawTuner();

  addEventListener("resize", () => { if(!playing) parkLayers(); });

  if(introShown) buildIntroPanel();

  // intro: wait for the layer artwork to actually decode, then run the pop-in
  const imgs = LAYERS.map(L => layerEl(L.id).querySelector("img")).filter(Boolean);
  await Promise.race([
    Promise.all(imgs.map(i => (i.decode ? i.decode() : Promise.resolve()).catch(() => {}))),
    new Promise(r => setTimeout(r, 1500)),
  ]);
  // rAF gets us a clean first paint; the timeout is a fallback for
  // background/non-composited tabs where rAF can stall indefinitely.
  let introKicked = false;
  const kickIntro = () => { if(introKicked) return; introKicked = true; runIntro(); };
  requestAnimationFrame(kickIntro);
  setTimeout(kickIntro, 200);
})();

})();
