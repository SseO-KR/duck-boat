(() => {
  const game = document.getElementById("game");
  const surface = document.getElementById("water");
  const scene = document.getElementById("scene");
  const introFrame = document.getElementById("intro-frame");
  const introTitle = document.getElementById("intro-title");
  const toolbar = document.getElementById("game-tools");
  const sound = document.getElementById("sound");
  const help = document.getElementById("help");
  const status = document.getElementById("announce");
  const crew = document.getElementById("crew");
  const clamp = value => Math.min(1, Math.max(0, value));
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const turnTempo = 1.15;

  // Each group gets a fixed hull and room for a long first hold.
  const boatsByGroup = {
    small: {scale: 0.74, minDucks: 100, maxDucks: 140},
    medium: {scale: 1.04, minDucks: 220, maxDucks: 280},
    large: {scale: 1.36, minDucks: 330, maxDucks: 420}
  };
  const ducks = [
    {size: 0.43, mass: 0.65}, {size: 0.71, mass: 1.12}, {size: 1.08, mass: 2.15, heavy: true}
  ];
  const maxSinkOffset = 10;
  function nominalDuckCount(boat, duck) {
    const heaviest = ducks.at(-1).mass, lightest = ducks[0].mass;
    const fraction = (1 / duck.mass - 1 / heaviest) / (1 / lightest - 1 / heaviest);
    return Math.round(boat.minDucks + fraction * (boat.maxDucks - boat.minDucks));
  }
  function pickDifferent(tiers, previous) {
    const choices = tiers.filter(tier => tier !== previous);
    return choices[Math.floor(Math.random() * choices.length)];
  }

  let state, owner = null, elapsed = 0, nextDuck = 0, runTime = 0, lastFrame = performance.now();
  const endingAudio = new Audio();
  endingAudio.preload = "auto";
  let endingUnlocked = false;
  let audio, soundOn = false;
  const endingLength = 4.90;
  const inEnding = () => state?.mode === "safe" || state?.mode === "sinking";

  function firstVisit() {
    for (const name of ["localStorage", "sessionStorage"]) {
      try {
        const storage = window[name];
        if (storage.getItem("pond.firstEntrySeen") === "true") return false;
        storage.setItem("pond.firstEntrySeen", "true");
        return true;
      } catch {}
    }
    return true;
  }

  async function loadEndingAudio() {
    const file = "false-clear.m4a";
    let src = file;
    if (location.protocol !== "file:") {
      try {
        // A buffered clip can seek on unmute even when the host lacks byte-range support.
        const response = await fetch(file);
        if (response.ok) src = URL.createObjectURL(await response.blob());
      } catch { /* The media element can still load the file directly. */ }
    }
    endingAudio.src = src;
    if (inEnding()) syncEndingAudio();
  }

  function syncEndingAudio() {
    if (!soundOn || document.hidden || help.open || !inEnding()) {
      endingAudio.pause();
      return;
    }
    if (!endingAudio.src) return;
    endingAudio.muted = false;
    endingAudio.playbackRate = turnTempo;
    endingAudio.currentTime = Math.min(elapsed, endingLength);
    endingAudio.play().catch(() => {});
  }

  try { soundOn = localStorage.getItem("pond.sound") === "true"; } catch {}
  function updateSound() {
    sound.setAttribute("aria-pressed", String(soundOn));
    sound.setAttribute("aria-label", soundOn ? "Mute sound" : "Turn sound on");
  }
  function wakeAudio() {
    if (!soundOn) return;
    // Unlock this media element from a gesture before the delayed verdict on mobile.
    if (!endingUnlocked && endingAudio.src && !inEnding()) {
      endingAudio.muted = true;
      endingAudio.play().then(() => {
        endingUnlocked = true;
        if (!inEnding() || !soundOn || document.hidden || help.open) endingAudio.pause();
      }).catch(() => {});
    }
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (Audio) { audio ??= new Audio(); audio.resume().catch(() => {}); }
    } catch {}
  }
  function note(from, to, duration, delay = 0, volume = .05, type = "sine") {
    if (!soundOn || audio?.state !== "running") return;
    const start = audio.currentTime + delay, gain = audio.createGain(), osc = audio.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(from, start);
    osc.frequency.exponentialRampToValueAtTime(to, start + duration);
    gain.gain.setValueAtTime(.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + .012);
    gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
    osc.connect(gain); gain.connect(audio.destination);
    osc.start(start); osc.stop(start + duration + .015);
  }
  sound.onclick = () => {
    soundOn = !soundOn;
    try { localStorage.setItem("pond.sound", String(soundOn)); } catch {}
    updateSound(); wakeAudio();
    if (inEnding() || !soundOn) syncEndingAudio();
    if (!inEnding()) note(440, 660, .1);
  };
  document.getElementById("help-button").addEventListener("click", () => {
    help.showModal();
    release(owner);
    syncEndingAudio();
  });
  document.getElementById("help-close").addEventListener("click", () => help.close());
  help.addEventListener("close", syncEndingAudio);

  function setMode(mode, announcement = "") {
    state.mode = game.dataset.state = mode;
    elapsed = 0;
    surface.setAttribute("aria-label", mode === "lost" ? "Play again" : "Hold to board ducks. Release to test the boat.");
    status.textContent = announcement;
    state.endingTime = 0;
    syncEndingAudio();
  }
  let lastGroupButton = null;
  function chooseGroup() {
    const boat = state?.boat ?? boatsByGroup.medium;
    const duck = pickDifferent(ducks, state?.duck);
    state = {boat, duck, columns: 1, clock: 1, quiet: reducedMotion, ducks: [], load: 0, moment: 0, ratio: 0,
      strain: 0, angle: 0, shift: 0, focus: 0, sink: 0, lastBeat: -1};
    owner = null;
    surface.disabled = true;
    crew.hidden = false;
    toolbar.hidden = false;
    setMode("group", "Choose your group size.");
    lastGroupButton?.focus({preventScroll: true});
  }
  for (const button of crew.querySelectorAll("button")) {
    button.addEventListener("click", () => startRound(button));
  }
  function startRound(button) {
    if (state.mode !== "group") return;
    const boat = boatsByGroup[button.dataset.group], duck = state.duck;
    state.boat = boat;
    state.columns = Math.max(3, Math.floor(boat.scale * 242 / (duck.size * 39)));
    const nominalCount = nominalDuckCount(boat, duck);
    const offset = Math.floor(Math.random() * (2 * maxSinkOffset + 1)) - maxSinkOffset;
    // Motion follows the rated load. Only the verdict uses the hidden, round-long threshold.
    state.ratedCapacity = nominalCount * state.duck.mass;
    state.sinkingCapacity = (nominalCount + offset) * state.duck.mass;
    state.limit = Math.max(Math.ceil(1.15 * nominalCount), nominalCount + maxSinkOffset);
    lastGroupButton = button;
    crew.hidden = true;
    surface.disabled = false;
    board(-2); board(-2);
    // Keep a consistent low side as players pass the boat around.
    state.direction = state.moment >= 0 ? 1 : -1;
    setMode("ready", "Hold anywhere on the water to board ducks.");
    surface.focus({preventScroll: true});
  }
  function board(born) {
    const s = state, i = s.ducks.length, columns = s.columns;
    const row = Math.floor(i / columns), seat = i % columns;
    // Alternate sides, then fill toward the middle so early boarders are easy to see.
    const slot = seat % 2 ? columns - 1 - Math.floor(seat / 2) : seat / 2;
    const x = (slot / (columns - 1) - .5) * 212 + (Math.random() - .5) * 5;
    const y = -22 - (row * 23 + 6) * s.duck.size / s.boat.scale + (Math.random() - .5) * 3;
    s.ducks.push({...s.duck, x, y, born, seed: Math.random() * 6});
    s.moment += x * s.duck.mass;
    s.load = s.ducks.length * s.duck.mass + Math.abs(s.moment) / 420;
    s.ratio = s.load / s.ratedCapacity;
    s.strain = clamp(s.ratio) ** 1.8;
  }
  function begin(id) {
    if (state.mode !== "ready" || owner !== null || help.open) return false;
    owner = id; setMode("hold"); wakeAudio();
    board(state.clock - .04); board(state.clock + .04);
    nextDuck = .135; note(530, 730, .055, 0, .025);
    return true;
  }
  function release(id) {
    const s = state;
    if (s.mode !== "hold" || id !== owner) return;
    owner = null;
    s.doomed = s.load >= s.sinkingCapacity;
    s.releaseAngle = s.angle;
    s.duration = 1.15 + 4.85 * s.strain;
    s.lastBeat = -1;
    setMode("balance", "The boat is rocking.");
  }
  surface.addEventListener("contextmenu", e => e.preventDefault());
  surface.addEventListener("pointerdown", e => {
    if (!e.isPrimary || e.button !== 0) return;
    if (begin(e.pointerId)) {
      e.preventDefault();
      try { surface.setPointerCapture(e.pointerId); } catch {}
    }
  });
  for (const event of ["pointerup", "pointercancel", "lostpointercapture"]) {
    window.addEventListener(event, e => release(e.pointerId), true);
  }
  surface.addEventListener("keydown", e => {
    if ((e.code !== "Space" && e.code !== "Enter") || state.mode === "lost") return;
    e.preventDefault();
    if (!e.repeat) begin(e.code);
  });
  surface.addEventListener("keyup", e => {
    if ((e.code !== "Space" && e.code !== "Enter") || state.mode === "lost") return;
    e.preventDefault(); release(e.code);
  });
  surface.addEventListener("click", e => {
    if (state.mode === "lost") chooseGroup();
    else if (e.detail === 0 && begin("assist")) release("assist");
  });
  function interrupt() { release(owner); lastFrame = performance.now(); }
  window.addEventListener("blur", interrupt);
  document.addEventListener("visibilitychange", () => {
    interrupt();
    syncEndingAudio();
  });

  function update(dt) {
    const s = state;
    elapsed += dt; runTime += dt;
    const speed = s.mode === "balance" ? .82 - .50 * s.strain : s.mode === "sinking" ? .46 : 1;
    s.clock += dt * speed;
    switch (s.mode) {
      case "ready":
      case "hold": {
        const boarding = s.mode === "hold";
        while (boarding && elapsed >= nextDuck && s.ducks.length < s.limit) {
          board(s.clock); nextDuck += .077;
          if (s.ducks.length % 3 === 0) note(450 + Math.random()*210, 880, .06, 0, .018);
        }
        const lean = s.direction * s.strain * (boarding ? .27 : .16);
        const sway = Math.sin(s.clock * 2.6) * s.strain * (boarding ? .105 : .06);
        const target = lean + sway * (s.quiet ? .24 : 1);
        s.angle += (target - s.angle) * (1 - Math.exp(-dt * 6));
        break;
      }
      case "balance": {
        const p = clamp(elapsed / s.duration);
        const maxAngle = (.014 + .56 * s.strain) * s.direction * (s.quiet ? .68 : 1);
        const q = PondScene.sequence(p, [[0,0],[.20,.52],[.37,.90],[.56,.26],[.65,.31],[.86,1.06],[.92,1.04],[1,.11]]);
        s.angle = s.releaseAngle*(1-clamp(p*4)) + maxAngle*q;
        s.shift = Math.sin(s.angle)*1.4; s.focus = clamp(p*4) * s.strain;
        const beat = p>.78 ? 2 : p>.52 ? 1 : p>.23 ? 0 : -1;
        if (beat !== s.lastBeat) {
          s.lastBeat = beat;
          note(92,49,.2,0,.09*s.strain); note(77,44,.14,.15,.045*s.strain);
        }
        if (p === 1) {
          s.beforeSink = s.angle;
          if (s.doomed) setMode("sinking", "The boat steadies for a moment.");
          else setMode("safe", "The boat held.");
        }
        break;
      }
      case "safe":
        s.endingTime = elapsed;
        s.angle *= Math.exp(-dt*5); s.shift *= Math.exp(-dt*5); s.focus *= Math.exp(-dt*5);
        if (elapsed >= 1.05) setMode("ready", "Pass the device. Hold to board more ducks.");
        break;
      case "sinking":
        s.endingTime = elapsed;
        // Relative to the preview's green check: flip at 1.21s, begin sinking at 1.32s.
        s.sink = PondScene.sequence(elapsed, [[1.32,0],[4.08,1]]);
        s.angle = s.beforeSink + s.direction * PondScene.sequence(elapsed,
          [[0,0],[.37,-.10],[1.05,-.09],[1.31,.03],[1.75,.59],[4.08,.91]]);
        if (elapsed >= endingLength) setMode("lost", "The boat sank. The last player loses. Tap to play again.");
        break;
    }
  }
  function frame(now) {
    const dt = Math.min(.1,Math.max(0,(now-lastFrame)/1000));
    lastFrame = now;
    if (state.mode === "intro") {
      if (!document.hidden) elapsed += dt;
      if (elapsed < 3.92) {
        if (elapsed >= 3.55) introTitle.classList.add("fading");
        PondScene.drawIntro(elapsed);
        requestAnimationFrame(frame);
        return;
      }
      // Fade the last underwater frame over the newly reset pond.
      introFrame.width = scene.width;
      introFrame.height = scene.height;
      introFrame.getContext("2d").drawImage(scene, 0, 0);
      introFrame.addEventListener("animationend", () => introFrame.remove(), {once: true});
      introFrame.hidden = false;
      introTitle.hidden = true;
      chooseGroup();
    }
    if (!document.hidden && !help.open) {
      // Advance the active turn and its ending audio at the same tempo.
      const turnInProgress = state.mode === "hold" || state.mode === "balance" || inEnding();
      update(dt * (turnInProgress ? turnTempo : 1));
    }
    if (inEnding() && !endingAudio.paused && endingAudio.readyState >= 2 &&
        Math.abs(endingAudio.currentTime - elapsed) > .20) {
      endingAudio.currentTime = Math.min(elapsed, endingLength);
    }
    PondScene.draw(state,runTime*1000); requestAnimationFrame(frame);
  }
  updateSound();
  if (firstVisit() && !reducedMotion) {
    state = {};
    setMode("intro");
    introTitle.hidden = false;
  } else {
    chooseGroup();
  }
  loadEndingAudio();
  requestAnimationFrame(frame);
})();
