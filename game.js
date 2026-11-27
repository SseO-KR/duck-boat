(() => {
  const game = document.getElementById("game");
  const surface = document.getElementById("water");
  const sound = document.getElementById("sound");
  const count = document.getElementById("duckCount");
  const status = document.getElementById("announce");
  const clamp = value => Math.min(1, Math.max(0, value));
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const boats = [
    {scale: 0.74, capacity: 17}, {scale: 1.04, capacity: 29}, {scale: 1.36, capacity: 43}
  ];
  const ducks = [
    {size: 0.43, mass: 0.65}, {size: 0.71, mass: 1.12}, {size: 1.08, mass: 2.15, heavy: true}
  ];
  function pickDifferent(tiers, previous) {
    const choices = tiers.filter(tier => tier !== previous);
    return choices[Math.floor(Math.random() * choices.length)];
  }

  let state, owner = null, elapsed = 0, nextDuck = 0, runTime = 0, lastFrame = performance.now();
  let audio, soundOn = false;
  try { soundOn = localStorage.getItem("pond.sound") === "true"; } catch {}
  function updateSound() {
    sound.setAttribute("aria-pressed", String(soundOn));
    sound.setAttribute("aria-label", soundOn ? "Mute sound" : "Turn sound on");
  }
  function wakeAudio() {
    if (!soundOn) return;
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
    updateSound(); wakeAudio(); note(440, 660, .1);
  };

  function setMode(mode, announcement = "") {
    state.mode = game.dataset.state = mode;
    elapsed = 0;
    surface.setAttribute("aria-label", mode === "lost" ? "Play again" : "Hold to board ducks. Release to test the boat.");
    status.textContent = announcement;
  }
  function newRound() {
    const boat = pickDifferent(boats, state?.boat);
    const duck = pickDifferent(ducks, state?.duck);
    state = {boat, duck, clock: 1, quiet: reducedMotion, ducks: [], mass: 0, moment: 0, ratio: 0,
      angle: 0, shift: 0, focus: 0, sink: 0, lastBeat: -1};
    // Seats are boat-local; duck dimensions and weight are independent of hull size.
    state.columns = Math.max(3, Math.floor(boat.scale * 242 / (duck.size * 39)));
    state.limit = Math.ceil(1.45 * boat.capacity / duck.mass);
    owner = null;
    board(-2); board(-2);
    setMode("ready", "Hold anywhere on the water to board ducks.");
  }
  function board(born) {
    const s = state, i = s.ducks.length, columns = s.columns;
    const row = Math.floor(i / columns), seat = i % columns;
    // Alternate sides, then fill toward the middle so early boarders are easy to see.
    const slot = seat % 2 ? columns - 1 - Math.floor(seat / 2) : seat / 2;
    const x = (slot / (columns - 1) - .5) * 212 + (Math.random() - .5) * 5;
    const y = -22 - (row * 23 + 6) * s.duck.size / s.boat.scale + (Math.random() - .5) * 3;
    s.ducks.push({...s.duck, x, y, born, seed: Math.random() * 6});
    s.mass += s.duck.mass;
    s.moment += x * s.duck.mass;
    s.ratio = (s.mass + Math.abs(s.moment) / 420) / s.boat.capacity;
    count.value = String(s.ducks.length);
  }
  function begin(id) {
    if (state.mode !== "ready" || owner !== null) return false;
    owner = id; wakeAudio(); setMode("hold");
    board(state.clock - .04); board(state.clock + .04);
    nextDuck = .135; note(530, 730, .055, 0, .025);
    return true;
  }
  function release(id) {
    const s = state;
    if (s.mode !== "hold" || id !== owner) return;
    owner = null;
    s.doomed = s.ratio >= 1;
    s.releaseAngle = s.angle;
    s.direction = s.moment >= 0 ? 1 : -1;
    s.duration = 4.05 + 1.95 * clamp((s.ratio - .2) / .8);
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
    if (state.mode === "lost") newRound();
    else if (e.detail === 0 && begin("assist")) release("assist");
  });
  function interrupt() { release(owner); lastFrame = performance.now(); }
  window.addEventListener("blur", interrupt);
  document.addEventListener("visibilitychange", interrupt);

  function update(dt) {
    const s = state;
    elapsed += dt; runTime += dt;
    const speed = s.mode === "balance" ? .32 : s.mode === "sinking" ? .46 : 1;
    s.clock += dt * speed;
    switch (s.mode) {
      case "hold":
        while (elapsed >= nextDuck && s.ducks.length < s.limit) {
          board(s.clock); nextDuck += .077;
          if (s.ducks.length % 3 === 0) note(450 + Math.random()*210, 880, .06, 0, .018);
        }
        s.angle += (Math.sin(s.clock*6)*.021 + s.moment/s.mass*.0017 - s.angle) * Math.min(1, dt*4);
        break;
      case "balance": {
        const p = clamp(elapsed / s.duration);
        const maxAngle = (.09 + .39 * clamp(s.ratio)) * s.direction;
        const q = PondScene.sequence(p, [[0,0],[.20,.52],[.37,.90],[.56,.26],[.65,.31],[.86,1.06],[.92,1.04],[1,s.doomed ? 1.19 : .11]]);
        s.angle = s.releaseAngle*(1-clamp(p*4)) + maxAngle*q;
        s.shift = Math.sin(s.angle)*1.4; s.focus = clamp(p*4);
        const beat = p>.78 ? 2 : p>.52 ? 1 : p>.23 ? 0 : -1;
        if (beat !== s.lastBeat) {
          s.lastBeat = beat; note(92,49,.2,0,.09); note(77,44,.14,.15,.045);
        }
        if (p === 1) {
          s.beforeSink = s.angle;
          if (s.doomed) { setMode("sinking"); note(184,41,.92,0,.10,"triangle"); }
          else { setMode("safe","The boat held."); note(392,494,.12); note(494,587,.16,.12); }
        }
        break;
      }
      case "safe":
        s.angle *= Math.exp(-dt*5); s.shift *= Math.exp(-dt*5); s.focus = Math.max(0,1-elapsed);
        if (elapsed >= 1.05) setMode("ready", "Pass the device. Hold to board more ducks.");
        break;
      case "sinking":
        s.sink = clamp(elapsed / 3.45);
        s.angle = s.beforeSink + s.direction * PondScene.sequence(s.sink, [[0,0],[.18,-.09],[.34,.22],[.68,.47],[1,.59]]);
        if (s.sink > .84 && !s.quacked) { s.quacked = true; note(620,330,.125,0,.045,"sawtooth"); }
        if (s.sink === 1) setMode("lost", "The boat sank. The last player loses. Tap to play again.");
        break;
    }
  }
  function frame(now) {
    const dt = Math.min(.1,Math.max(0,(now-lastFrame)/1000));
    lastFrame = now;
    if (!document.hidden) update(dt);
    PondScene.draw(state,runTime*1000); requestAnimationFrame(frame);
  }
  updateSound(); newRound(); requestAnimationFrame(frame);
})();
