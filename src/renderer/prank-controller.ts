interface PrankAPI {
  onPrankStart: (cb: (data: any) => void) => void;
  onPrankStop: (cb: (data: any) => void) => void;
  onCursorPosition: (cb: (pos: { x: number; y: number }) => void) => void;
  onCursorClick: (cb: (pos: { x: number; y: number }) => void) => void;
  onKeystrokeReaction: (cb: (data: any) => void) => void;
  onMercyMessage: (cb: (data: any) => void) => void;
  triggerPranks: (prankIds: string[], delay: number) => void;
}
declare var prankAPI: PrankAPI;

// ── State ───────────────────────────────────────────────────
const canvas = document.getElementById('effects-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
let cursorPos = { x: 0, y: 0 };
let animFrameId: number | null = null;
const activePranks = new Set<string>();

// Track individual prank animation state
const prankState: Record<string, any> = {};

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// ── Cursor tracking ─────────────────────────────────────────
prankAPI.onCursorPosition((pos) => {
  cursorPos = pos;
});

prankAPI.onCursorClick((pos) => {
  cursorPos = pos;
  handleClick(pos);
});

// ── Mercy messages ──────────────────────────────────────────
prankAPI.onMercyMessage((data) => {
  console.log('[PrankController] Mercy message: ' + data.text);
  showMercyMessage(data);
});

// ── Keystroke reactions ──────────────────────────────────────
prankAPI.onKeystrokeReaction((data) => {
  console.log('[PrankController] Keystroke reaction: ' + data.pattern);
  showReaction(data.response);
});

// ── Prank start/stop ────────────────────────────────────────
console.log('[PrankController] Loaded and listening for IPC');

prankAPI.onPrankStart((data) => {
  const { prank, config, screenCapture } = data;
  console.log('[PrankController] START received: ' + prank);
  activePranks.add(prank);
  startPrank(prank, config, screenCapture);
  ensureAnimLoop();
});

prankAPI.onPrankStop((data) => {
  const { prank } = data;
  activePranks.delete(prank);
  stopPrank(prank);
  if (activePranks.size === 0 && animFrameId) {
    cancelAnimationFrame(animFrameId);
    animFrameId = null;
  }
});

// ── Animation loop ──────────────────────────────────────────
function ensureAnimLoop() {
  if (animFrameId) return;
  function loop() {
    // Clear canvas for canvas-based pranks
    const needsCanvasClear = ['cursorTrail', 'matrixRain', 'staticGlitch', 'pixelDecay', 'mouseMagnet']
      .some(p => activePranks.has(p));

    if (needsCanvasClear) {
      // Don't full-clear for matrix (it uses alpha fade)
      if (!activePranks.has('matrixRain')) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    for (const prank of activePranks) {
      renderPrank(prank);
    }
    animFrameId = requestAnimationFrame(loop);
  }
  animFrameId = requestAnimationFrame(loop);
}

// ── Click handler for cursor-text ───────────────────────────
function handleClick(pos: { x: number; y: number }) {
  if (activePranks.has('cursorText') && prankState.cursorText) {
    spawnWord(pos, prankState.cursorText.config);
  }
}

// ═══════════════════════════════════════════════════════════
// PRANK IMPLEMENTATIONS
// ═══════════════════════════════════════════════════════════

function startPrank(id: string, config: any, screenCapture?: string) {
  switch (id) {
    case 'cursorText': startCursorText(config); break;
    case 'unclosable': startUnclosable(config); break;
    case 'screenFlip': startScreenFlip(config, screenCapture); break;
    case 'cursorTrail': startCursorTrail(config); break;
    case 'screenTilt': startScreenTilt(config, screenCapture); break;
    case 'fakeBsod': startFakeBsod(config); break;
    case 'screenShake': startScreenShake(config); break;
    case 'colorInversion': startColorInversion(config); break;
    case 'matrixRain': startMatrixRain(config); break;
    case 'jumpscare': startJumpscare(config); break;
    case 'mouseMagnet': startMouseMagnet(config); break;
    case 'pixelDecay': startPixelDecay(config, screenCapture); break;
    case 'staticGlitch': startStaticGlitch(config); break;
  }
}

function stopPrank(id: string) {
  switch (id) {
    case 'cursorText': stopCursorText(); break;
    case 'unclosable': stopUnclosable(); break;
    case 'screenFlip': stopScreenFlip(); break;
    case 'cursorTrail': stopCursorTrail(); break;
    case 'screenTilt': stopScreenTilt(); break;
    case 'fakeBsod': stopFakeBsod(); break;
    case 'screenShake': stopScreenShake(); break;
    case 'colorInversion': stopColorInversion(); break;
    case 'matrixRain': stopMatrixRain(); break;
    case 'jumpscare': stopJumpscare(); break;
    case 'mouseMagnet': stopMouseMagnet(); break;
    case 'pixelDecay': stopPixelDecay(); break;
    case 'staticGlitch': stopStaticGlitch(); break;
  }
}

function renderPrank(id: string) {
  switch (id) {
    case 'cursorTrail': renderCursorTrail(); break;
    case 'matrixRain': renderMatrixRain(); break;
    case 'staticGlitch': renderStaticGlitch(); break;
    case 'pixelDecay': renderPixelDecay(); break;
    case 'mouseMagnet': renderMouseMagnet(); break;
    case 'screenShake': renderScreenShake(); break;
    case 'screenTilt': renderScreenTilt(); break;
  }
}

// ─── 1. CURSOR TEXT (one word at a time, 3 variants) ────────
interface ActiveWord {
  el: HTMLDivElement;
  variant: string;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  startTime: number;
  wordDuration: number;
  followOffsetX: number;
  followOffsetY: number;
  fallSpeed: number;
  fallRotation: boolean;
  bounceSpeed: number;
}

function resolveWordConfig(wordCfg: any, globalCfg: any) {
  return {
    text: wordCfg.text,
    color: wordCfg.color || globalCfg.defaultColor || '#ff0000',
    fontSize: wordCfg.fontSize || globalCfg.defaultFontSize || 48,
    fontFamily: wordCfg.fontFamily || globalCfg.defaultFontFamily || 'Impact, sans-serif',
    fontWeight: wordCfg.fontWeight || globalCfg.defaultFontWeight || 'bold',
    duration: wordCfg.duration || globalCfg.defaultDuration || 3000,
    chance: wordCfg.chance ?? 1,
    variant: wordCfg.variant || globalCfg.defaultVariant || 'random',
    opacity: wordCfg.opacity ?? globalCfg.defaultOpacity ?? 1,
    textShadow: wordCfg.textShadow || globalCfg.defaultTextShadow || '2px 2px 4px rgba(0,0,0,0.5)',
    bounceSpeed: wordCfg.bounceSpeed || globalCfg.defaultBounceSpeed || 5,
    followOffsetX: wordCfg.followOffsetX ?? globalCfg.defaultFollowOffsetX ?? 20,
    followOffsetY: wordCfg.followOffsetY ?? globalCfg.defaultFollowOffsetY ?? -30,
    fallSpeed: wordCfg.fallSpeed || globalCfg.defaultFallSpeed || 3,
    fallRotation: wordCfg.fallRotation ?? globalCfg.defaultFallRotation ?? true,
  };
}

function pickVariant(variant: string): string {
  if (variant === 'random') {
    const variants = ['bounce', 'follow', 'fall'];
    return variants[Math.floor(Math.random() * variants.length)];
  }
  return variant;
}

function startCursorText(config: any) {
  prankState.cursorText = {
    config,
    activeWord: null as ActiveWord | null,
    animInterval: null as any,
  };

  // Animation loop for active word
  prankState.cursorText.animInterval = setInterval(() => {
    const state = prankState.cursorText;
    if (!state || !state.activeWord) return;

    const w = state.activeWord as ActiveWord;
    const now = Date.now();
    const elapsed = now - w.startTime;

    // Duration check — remove word when done
    if (elapsed >= w.wordDuration) {
      w.el.remove();
      state.activeWord = null;
      return;
    }

    // Fade out in last 500ms
    const remaining = w.wordDuration - elapsed;
    if (remaining < 500) {
      w.el.style.opacity = String((remaining / 500) * parseFloat(w.el.dataset.baseOpacity || '1'));
    }

    const sw = window.innerWidth;
    const sh = window.innerHeight;

    if (w.variant === 'bounce') {
      let x = parseFloat(w.el.style.left);
      let y = parseFloat(w.el.style.top);
      x += w.vx;
      y += w.vy;

      const elW = w.el.offsetWidth || 100;
      const elH = w.el.offsetHeight || 50;

      if (x <= 0) { x = 0; w.vx = Math.abs(w.vx); }
      if (x + elW >= sw) { x = sw - elW; w.vx = -Math.abs(w.vx); }
      if (y <= 0) { y = 0; w.vy = Math.abs(w.vy); }
      if (y + elH >= sh) { y = sh - elH; w.vy = -Math.abs(w.vy); }

      w.el.style.left = x + 'px';
      w.el.style.top = y + 'px';
    }
    else if (w.variant === 'follow') {
      const targetX = cursorPos.x + w.followOffsetX;
      const targetY = cursorPos.y + w.followOffsetY;
      const curX = parseFloat(w.el.style.left);
      const curY = parseFloat(w.el.style.top);
      // Smooth follow with lerp
      const lerpFactor = 0.08;
      w.el.style.left = (curX + (targetX - curX) * lerpFactor) + 'px';
      w.el.style.top = (curY + (targetY - curY) * lerpFactor) + 'px';
    }
    else if (w.variant === 'fall') {
      let y = parseFloat(w.el.style.top);
      y += w.fallSpeed;
      w.el.style.top = y + 'px';

      if (w.fallRotation) {
        w.rotation += w.rotationSpeed;
        w.el.style.transform = `rotate(${w.rotation}deg)`;
      }

      // Reset to top if falls off screen
      if (y > sh + 50) {
        w.el.style.top = '-60px';
        w.el.style.left = (Math.random() * (sw - 200)) + 'px';
      }
    }
  }, 16);
}

function spawnWord(pos: { x: number; y: number }, config: any) {
  const state = prankState.cursorText;
  if (!state) return;

  // Only one word at a time
  if (state.activeWord) return;

  const words = config.words || [
    { text: 'LOL', color: '#ff0000', variant: 'bounce' },
    { text: 'HACKED', color: '#00ff00', variant: 'follow' },
    { text: 'OOPS', color: '#ff00ff', variant: 'fall' },
  ];

  // Pick a random word, check its individual chance
  const rawWord = words[Math.floor(Math.random() * words.length)];
  const word = resolveWordConfig(rawWord, config);

  if (Math.random() > word.chance) return;

  const variant = pickVariant(word.variant);
  const layer = document.getElementById('cursor-text-layer')!;

  const el = document.createElement('div');
  el.className = 'cursor-particle';
  el.textContent = word.text;
  el.style.fontSize = word.fontSize + 'px';
  el.style.fontFamily = word.fontFamily;
  el.style.fontWeight = word.fontWeight;
  el.style.color = word.color;
  el.style.opacity = String(word.opacity);
  el.style.textShadow = word.textShadow;
  el.style.position = 'absolute';
  el.style.whiteSpace = 'nowrap';
  el.style.pointerEvents = 'none';
  el.style.zIndex = '9999';
  el.dataset.baseOpacity = String(word.opacity);

  // Starting position depends on variant
  const sw = window.innerWidth;
  const sh = window.innerHeight;

  if (variant === 'bounce') {
    // Start at click position
    el.style.left = pos.x + 'px';
    el.style.top = pos.y + 'px';
  } else if (variant === 'follow') {
    el.style.left = pos.x + word.followOffsetX + 'px';
    el.style.top = pos.y + word.followOffsetY + 'px';
  } else if (variant === 'fall') {
    // Start at top, random x
    el.style.left = (Math.random() * (sw - 200)) + 'px';
    el.style.top = '-60px';
  }

  layer.appendChild(el);

  // Random bounce direction
  const angle = Math.random() * Math.PI * 2;
  const speed = word.bounceSpeed;

  state.activeWord = {
    el,
    variant,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    rotation: 0,
    rotationSpeed: (Math.random() - 0.5) * 4,
    startTime: Date.now(),
    wordDuration: word.duration,
    followOffsetX: word.followOffsetX,
    followOffsetY: word.followOffsetY,
    fallSpeed: word.fallSpeed,
    fallRotation: word.fallRotation,
    bounceSpeed: word.bounceSpeed,
  } as ActiveWord;

  // Trigger other pranks if configured for this word
  if (rawWord.triggerPranks && rawWord.triggerPranks.length > 0) {
    prankAPI.triggerPranks(rawWord.triggerPranks, rawWord.triggerDelay || 0);
  }
}

function stopCursorText() {
  if (prankState.cursorText?.animInterval) clearInterval(prankState.cursorText.animInterval);
  if (prankState.cursorText?.activeWord) {
    prankState.cursorText.activeWord.el.remove();
  }
  const layer = document.getElementById('cursor-text-layer')!;
  layer.innerHTML = '';
  delete prankState.cursorText;
}

// ─── 2. UNCLOSABLE OVERLAY ──────────────────────────────────
function startUnclosable(config: any) {
  const layer = document.getElementById('unclosable-layer')!;
  layer.innerHTML = '';

  const msg = document.createElement('div');
  msg.className = 'unclosable-message';
  msg.style.color = config.textColor || '#ff0000';
  msg.textContent = config.message || 'Your system has been compromised.';
  layer.appendChild(msg);

  if (config.showFakeButtons !== false) {
    const btnContainer = document.createElement('div');
    const btnTexts = config.fakeButtonTexts || ['OK', 'Cancel', 'Close', 'Help'];
    for (const text of btnTexts) {
      const btn = document.createElement('button');
      btn.className = 'fake-btn';
      btn.textContent = text;
      btn.addEventListener('click', () => {
        // Spawn more messages on click
        const extra = document.createElement('div');
        extra.className = 'unclosable-message';
        extra.style.color = config.textColor || '#ff0000';
        extra.style.fontSize = '18px';
        extra.textContent = ['Nice try!', 'That won\'t work.', 'Nope.', 'Haha.'][Math.floor(Math.random() * 4)];
        layer.insertBefore(extra, btnContainer);
      });
      btnContainer.appendChild(btn);
    }
    layer.appendChild(btnContainer);
  }

  layer.style.background = config.backgroundColor || 'rgba(0,0,0,0.95)';
  layer.classList.add('active');

  // Block keyboard
  prankState.unclosable = {
    keyHandler: (e: KeyboardEvent) => { e.preventDefault(); e.stopPropagation(); },
  };
  document.addEventListener('keydown', prankState.unclosable.keyHandler, true);
}

function stopUnclosable() {
  const layer = document.getElementById('unclosable-layer')!;
  layer.classList.remove('active');
  layer.innerHTML = '';
  if (prankState.unclosable?.keyHandler) {
    document.removeEventListener('keydown', prankState.unclosable.keyHandler, true);
  }
  delete prankState.unclosable;
}

// ─── 3. SCREEN FLIP ────────────────────────────────────────
function startScreenFlip(config: any, screenCapture?: string) {
  const layer = document.getElementById('screen-capture-layer')!;
  if (screenCapture) {
    const img = document.createElement('img');
    img.src = screenCapture;
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'cover';
    img.style.transition = `transform ${config.animationDuration || 2000}ms ease-in-out`;
    layer.appendChild(img);
    layer.style.display = 'block';
    // Trigger flip after a frame
    requestAnimationFrame(() => {
      img.style.transform = `rotate(${config.angle || 180}deg)`;
    });
  }
  prankState.screenFlip = { config };
}

function stopScreenFlip() {
  const layer = document.getElementById('screen-capture-layer')!;
  layer.innerHTML = '';
  layer.style.display = 'none';
  delete prankState.screenFlip;
}

// ─── 4. CURSOR TRAIL ───────────────────────────────────────
interface TrailPoint {
  x: number;
  y: number;
  time: number;
}

function hslToRgba(h: number, s: number, l: number, a: number): string {
  return `hsla(${h}, ${s}%, ${l}%, ${a})`;
}

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return [h * 360, s * 100, l * 100];
}

function startCursorTrail(config: any) {
  prankState.cursorTrail = {
    config,
    points: [] as TrailPoint[],
    hueOffset: 0,
  };
}

function renderCursorTrail() {
  const state = prankState.cursorTrail;
  if (!state) return;
  const config = state.config;
  const points = state.points as TrailPoint[];
  const maxPoints = config.particleCount || 30;
  const particleSize = config.particleSize || 8;
  const fadeSpeed = config.fadeSpeed || 0.05;
  const trailType = config.trailType || 'circles';
  const colors = config.colors || ['#ff0000', '#ff7700', '#ffff00', '#00ff00', '#0000ff', '#8b00ff'];
  const now = Date.now();

  // Add current cursor position
  const last = points[points.length - 1];
  if (!last || Math.hypot(cursorPos.x - last.x, cursorPos.y - last.y) > 2) {
    points.push({ x: cursorPos.x, y: cursorPos.y, time: now });
  }

  // Trim old points
  while (points.length > maxPoints * 2) {
    points.shift();
  }

  // Slowly rotate hue for rainbow effect
  state.hueOffset = (state.hueOffset + 0.5) % 360;

  if (trailType === 'emoji') {
    // Emoji trail
    const emojis = config.emojis || ['✨', '💫', '⭐', '🔥', '💀'];
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const age = (now - p.time) / 1000;
      const lifespan = maxPoints * 0.016 / fadeSpeed;
      const progress = Math.min(age / lifespan, 1);
      if (progress >= 1) continue;

      const alpha = 1 - progress;
      const scale = 0.3 + (1 - progress) * 0.7;
      const emojiIdx = Math.floor((i * 0.3) % emojis.length);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = `${particleSize * 2 * scale}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(emojis[emojiIdx], p.x, p.y);
      ctx.restore();
    }
    return;
  }

  if (points.length < 2) return;

  // ── Smooth ribbon trail ──────────────────────────────
  if (trailType === 'ribbon' || trailType === 'circles' || trailType === 'sparkles' || trailType === 'stars') {

    // Draw glow layer first (underneath)
    for (let i = 1; i < points.length; i++) {
      const p = points[i];
      const progress = i / points.length; // 0=oldest, 1=newest
      const age = (now - p.time) / 1000;
      const lifespan = maxPoints * 0.016 / fadeSpeed;
      const ageAlpha = Math.max(0, 1 - age / lifespan);
      const alpha = progress * ageAlpha;
      if (alpha <= 0) continue;

      const size = particleSize * progress;
      const hue = (state.hueOffset + (i / points.length) * 360) % 360;

      // Pick color: cycle through provided colors or use rainbow
      let color: string;
      if (colors.length > 0) {
        const colorIdx = (i / points.length) * (colors.length - 1);
        const cIdx = Math.floor(colorIdx);
        const cNext = Math.min(cIdx + 1, colors.length - 1);
        const t = colorIdx - cIdx;
        // Interpolate between two colors via HSL
        const [h1, s1, l1] = hexToHsl(colors[cIdx]);
        const [h2, s2, l2] = hexToHsl(colors[cNext]);
        // Handle hue wrap
        let dh = h2 - h1;
        if (dh > 180) dh -= 360;
        if (dh < -180) dh += 360;
        const h = ((h1 + dh * t + state.hueOffset) % 360 + 360) % 360;
        const s = s1 + (s2 - s1) * t;
        const l = l1 + (l2 - l1) * t;
        color = hslToRgba(h, s, l, alpha);
      } else {
        color = hslToRgba(hue, 100, 60, alpha);
      }

      // Outer glow
      ctx.save();
      ctx.globalAlpha = alpha * 0.3;
      ctx.shadowColor = color;
      ctx.shadowBlur = size * 3;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, size * 0.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Draw main trail on top
    for (let i = 1; i < points.length; i++) {
      const p = points[i];
      const prev = points[i - 1];
      const progress = i / points.length;
      const age = (now - p.time) / 1000;
      const lifespan = maxPoints * 0.016 / fadeSpeed;
      const ageAlpha = Math.max(0, 1 - age / lifespan);
      const alpha = progress * ageAlpha;
      if (alpha <= 0) continue;

      const size = particleSize * progress;
      const hue = (state.hueOffset + (i / points.length) * 360) % 360;

      let color: string;
      if (colors.length > 0) {
        const colorIdx = (i / points.length) * (colors.length - 1);
        const cIdx = Math.floor(colorIdx);
        const cNext = Math.min(cIdx + 1, colors.length - 1);
        const t = colorIdx - cIdx;
        const [h1, s1, l1] = hexToHsl(colors[cIdx]);
        const [h2, s2, l2] = hexToHsl(colors[cNext]);
        let dh = h2 - h1;
        if (dh > 180) dh -= 360;
        if (dh < -180) dh += 360;
        const h = ((h1 + dh * t + state.hueOffset) % 360 + 360) % 360;
        const s = s1 + (s2 - s1) * t;
        const l = l1 + (l2 - l1) * t;
        color = hslToRgba(h, s, l, alpha);
      } else {
        color = hslToRgba(hue, 100, 60, alpha);
      }

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;

      if (trailType === 'stars') {
        // Draw star shape
        const spikes = 5;
        const outerR = size;
        const innerR = size * 0.45;
        ctx.beginPath();
        for (let s = 0; s < spikes * 2; s++) {
          const r = s % 2 === 0 ? outerR : innerR;
          const angle = (s * Math.PI) / spikes - Math.PI / 2;
          const sx = p.x + Math.cos(angle) * r;
          const sy = p.y + Math.sin(angle) * r;
          s === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
        }
        ctx.closePath();
        ctx.fill();
      } else if (trailType === 'sparkles') {
        // Multiple small dots scattered around the point
        const count = 3;
        for (let s = 0; s < count; s++) {
          const ox = (Math.random() - 0.5) * size * 2;
          const oy = (Math.random() - 0.5) * size * 2;
          const sparkSize = size * (0.2 + Math.random() * 0.4);
          ctx.beginPath();
          ctx.arc(p.x + ox, p.y + oy, sparkSize, 0, Math.PI * 2);
          ctx.fill();
        }
        // Central bright dot
        ctx.fillStyle = hslToRgba(hue, 100, 90, alpha);
        ctx.beginPath();
        ctx.arc(p.x, p.y, size * 0.3, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Smooth connected trail (circles + line segments)
        // Line to previous point for smooth connection
        if (i > 0) {
          ctx.strokeStyle = color;
          ctx.lineWidth = size * 1.6;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(prev.x, prev.y);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        }
        // Bright core dot
        ctx.fillStyle = hslToRgba(
          colors.length > 0 ? parseFloat(color.match(/\d+/)?.[0] || '0') : hue,
          100, 85, alpha
        );
        ctx.beginPath();
        ctx.arc(p.x, p.y, size * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }
}

function stopCursorTrail() {
  delete prankState.cursorTrail;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// ─── 5. SCREEN TILT ────────────────────────────────────────
function startScreenTilt(config: any, screenCapture?: string) {
  const layer = document.getElementById('screen-capture-layer')!;
  prankState.screenTilt = { config, angle: 0, direction: 1, startTime: Date.now() };
  if (screenCapture) {
    const img = document.createElement('img');
    img.id = 'tilt-image';
    img.src = screenCapture;
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'cover';
    img.style.transformOrigin = 'center center';
    // Scale up to hide edges when tilted
    img.style.transform = 'scale(1.2)';
    layer.appendChild(img);
    layer.style.display = 'block';
    layer.style.overflow = 'hidden';
  }
}

function renderScreenTilt() {
  const state = prankState.screenTilt;
  if (!state) return;
  const img = document.getElementById('tilt-image') as HTMLImageElement;
  if (!img) return;

  const speed = state.config.speed || 0.5;
  const maxAngle = state.config.maxAngle || 15;

  state.angle += speed * state.direction * 0.016; // ~60fps
  if (Math.abs(state.angle) >= maxAngle) state.direction *= -1;

  img.style.transform = `scale(1.2) rotate(${state.angle}deg)`;
}

function stopScreenTilt() {
  const layer = document.getElementById('screen-capture-layer')!;
  layer.innerHTML = '';
  layer.style.display = 'none';
  delete prankState.screenTilt;
}

// ─── 6. FAKE BSOD ──────────────────────────────────────────
function startFakeBsod(config: any) {
  const layer = document.getElementById('bsod-layer')!;
  layer.innerHTML = `
    <div class="bsod-sad">:(</div>
    <div class="bsod-title">Your PC ran into a problem and needs to restart.</div>
    <div class="bsod-info">We're just collecting some error info, and then we'll restart for you.</div>
    <div class="bsod-info" id="bsod-percent">${config.percentage || 0}% complete</div>
    <div class="bsod-code">Stop code: ${config.errorCode || 'CRITICAL_PROCESS_DIED'}</div>
  `;
  layer.classList.add('active');

  // Animate percentage
  if (config.collectingInfo !== false) {
    prankState.fakeBsod = { percent: config.percentage || 0 };
    prankState.fakeBsod.interval = setInterval(() => {
      const s = prankState.fakeBsod;
      if (!s) return;
      s.percent += Math.random() * 2;
      if (s.percent > 99) s.percent = 99; // Never reaches 100
      const el = document.getElementById('bsod-percent');
      if (el) el.textContent = `${Math.floor(s.percent)}% complete`;
    }, 1000);
  }

  // Block keyboard
  prankState.fakeBsod = prankState.fakeBsod || {};
  prankState.fakeBsod.keyHandler = (e: KeyboardEvent) => { e.preventDefault(); e.stopPropagation(); };
  document.addEventListener('keydown', prankState.fakeBsod.keyHandler, true);
}

function stopFakeBsod() {
  const layer = document.getElementById('bsod-layer')!;
  layer.classList.remove('active');
  layer.innerHTML = '';
  if (prankState.fakeBsod?.interval) clearInterval(prankState.fakeBsod.interval);
  if (prankState.fakeBsod?.keyHandler) {
    document.removeEventListener('keydown', prankState.fakeBsod.keyHandler, true);
  }
  delete prankState.fakeBsod;
}

// ─── 7. SCREEN SHAKE ───────────────────────────────────────
function startScreenShake(config: any) {
  prankState.screenShake = { config, startTime: Date.now() };
}

function renderScreenShake() {
  const state = prankState.screenShake;
  if (!state) return;
  const mag = state.config.magnitude || 10;
  const x = (Math.random() - 0.5) * 2 * mag;
  const y = (Math.random() - 0.5) * 2 * mag;
  document.body.style.transform = `translate(${x}px, ${y}px)`;
}

function stopScreenShake() {
  document.body.style.transform = '';
  delete prankState.screenShake;
}

// ─── 8. COLOR INVERSION ────────────────────────────────────
function startColorInversion(config: any) {
  const layer = document.getElementById('inversion-layer')!;
  if (config.animateTransition) {
    layer.style.transition = `opacity ${config.transitionDuration || 500}ms ease`;
    layer.style.opacity = '0';
    layer.classList.add('active');
    requestAnimationFrame(() => { layer.style.opacity = '1'; });
  } else {
    layer.classList.add('active');
  }
}

function stopColorInversion() {
  const layer = document.getElementById('inversion-layer')!;
  layer.classList.remove('active');
  layer.style.transition = '';
  layer.style.opacity = '';
}

// ─── 9. MATRIX RAIN ────────────────────────────────────────
function startMatrixRain(config: any) {
  const cols = Math.floor(canvas.width / (config.fontSize || 14));
  const drops: number[] = new Array(cols).fill(1);

  prankState.matrixRain = { config, drops };

  // Fill black initially
  ctx.fillStyle = 'rgba(0, 0, 0, 1)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function renderMatrixRain() {
  const state = prankState.matrixRain;
  if (!state) return;
  const config = state.config;
  const drops = state.drops as number[];
  const fontSize = config.fontSize || 14;
  const chars = config.characters || 'abcdefghijklmnopqrstuvwxyz0123456789$@#&';
  const speed = (config.speed || 5) / 5;

  // Fade effect
  ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = config.color || '#00ff00';
  ctx.font = `${fontSize}px monospace`;

  for (let i = 0; i < drops.length; i++) {
    if (Math.random() > (config.density || 0.5)) continue;

    const char = chars[Math.floor(Math.random() * chars.length)];
    ctx.fillText(char, i * fontSize, drops[i] * fontSize);

    if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
      drops[i] = 0;
    }
    drops[i] += speed;
  }
}

function stopMatrixRain() {
  delete prankState.matrixRain;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// ─── 10. JUMPSCARE ──────────────────────────────────────────
function startJumpscare(config: any) {
  const container = document.getElementById('prank-container')!;
  const div = document.createElement('div');
  div.id = 'jumpscare-layer';
  div.style.cssText = `
    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
    background: #000; display: flex; justify-content: center; align-items: center;
    z-index: 10000; pointer-events: all;
  `;

  if (config.imageUrl) {
    const img = document.createElement('img');
    img.src = config.imageUrl;
    img.style.maxWidth = '100%';
    img.style.maxHeight = '100%';
    div.appendChild(img);
  } else {
    // Default: big scary text
    div.innerHTML = `<div style="font-size:200px;color:red;text-shadow:0 0 50px red">💀</div>`;
  }

  container.appendChild(div);

  // Audio
  if (config.soundUrl) {
    const audio = new Audio(config.soundUrl);
    audio.volume = config.volume || 0.8;
    audio.play().catch(() => {});
    prankState.jumpscare = { audio };
  }

  // Flash effect
  setTimeout(() => {
    div.style.background = 'white';
    setTimeout(() => { div.style.background = '#000'; }, 50);
  }, 100);
}

function stopJumpscare() {
  const el = document.getElementById('jumpscare-layer');
  el?.remove();
  prankState.jumpscare?.audio?.pause();
  delete prankState.jumpscare;
}

// ─── 11. MOUSE MAGNET ──────────────────────────────────────
function startMouseMagnet(config: any) {
  // Hide real cursor
  document.body.style.cursor = 'none';

  // Generate zones
  let zones = config.zones || [];
  if (config.randomZones && zones.length === 0) {
    const count = config.zoneCount || 3;
    for (let i = 0; i < count; i++) {
      zones.push({
        x: Math.random() * 100,
        y: Math.random() * 100,
        radius: 150 + Math.random() * 150,
        strength: 0.3 + Math.random() * 0.4,
      });
    }
  }

  prankState.mouseMagnet = { config, zones, fakeCursorPos: { ...cursorPos } };
}

function renderMouseMagnet() {
  const state = prankState.mouseMagnet;
  if (!state) return;

  const zones = state.zones;
  let dx = 0, dy = 0;

  for (const zone of zones) {
    const zx = (zone.x / 100) * canvas.width;
    const zy = (zone.y / 100) * canvas.height;
    const dist = Math.hypot(cursorPos.x - zx, cursorPos.y - zy);

    if (dist < zone.radius) {
      const force = zone.strength * (1 - dist / zone.radius);
      dx += (zx - cursorPos.x) * force;
      dy += (zy - cursorPos.y) * force;
    }
  }

  const fakeX = cursorPos.x + dx;
  const fakeY = cursorPos.y + dy;

  // Draw fake cursor
  ctx.save();
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(fakeX, fakeY);
  ctx.lineTo(fakeX, fakeY + 18);
  ctx.lineTo(fakeX + 5, fakeY + 14);
  ctx.lineTo(fakeX + 10, fakeY + 22);
  ctx.lineTo(fakeX + 13, fakeY + 20);
  ctx.lineTo(fakeX + 8, fakeY + 12);
  ctx.lineTo(fakeX + 14, fakeY + 12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function stopMouseMagnet() {
  document.body.style.cursor = '';
  delete prankState.mouseMagnet;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// ─── 12. PIXEL DECAY ───────────────────────────────────────
function startPixelDecay(config: any, screenCapture?: string) {
  if (!screenCapture) return;

  const img = new Image();
  img.onload = () => {
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const chunkSize = config.chunkSize || 8;
    const cols = Math.ceil(canvas.width / chunkSize);
    const rows = Math.ceil(canvas.height / chunkSize);
    const chunks: { col: number; row: number; offsetY: number; falling: boolean; vy: number }[] = [];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        chunks.push({ col: c, row: r, offsetY: 0, falling: false, vy: 0 });
      }
    }

    prankState.pixelDecay = { config, imageData, chunks, chunkSize, decayIndex: 0 };
  };
  img.src = screenCapture;
}

function renderPixelDecay() {
  const state = prankState.pixelDecay;
  if (!state) return;

  const { imageData, chunks, chunkSize, config } = state;
  const speed = config.speed || 5;

  // Start decaying new chunks
  for (let i = 0; i < speed; i++) {
    if (state.decayIndex < chunks.length) {
      // Pick random non-falling chunk
      const remaining = chunks.filter((c: any) => !c.falling);
      if (remaining.length > 0) {
        const pick = remaining[Math.floor(Math.random() * remaining.length)];
        pick.falling = true;
        pick.vy = 1 + Math.random() * 2;
      }
      state.decayIndex++;
    }
  }

  // Clear and redraw
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Create temp canvas for source
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  const tempCtx = tempCanvas.getContext('2d')!;
  tempCtx.putImageData(imageData, 0, 0);

  for (const chunk of chunks) {
    const sx = chunk.col * chunkSize;
    const sy = chunk.row * chunkSize;
    const sw = Math.min(chunkSize, canvas.width - sx);
    const sh = Math.min(chunkSize, canvas.height - sy);

    if (chunk.falling) {
      chunk.vy += 0.5;
      chunk.offsetY += chunk.vy;

      if (chunk.offsetY > canvas.height) continue; // Off screen
    }

    ctx.drawImage(tempCanvas, sx, sy, sw, sh, sx, sy + chunk.offsetY, sw, sh);
  }
}

function stopPixelDecay() {
  delete prankState.pixelDecay;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// ─── 13. STATIC / GLITCH ───────────────────────────────────
function startStaticGlitch(config: any) {
  prankState.staticGlitch = {
    config,
    lastGlitch: 0,
  };
  canvas.style.opacity = String(config.opacity || 0.3);
}

function renderStaticGlitch() {
  const state = prankState.staticGlitch;
  if (!state) return;
  const config = state.config;
  const now = Date.now();
  const interval = 1000 / (config.glitchFrequency || 10);

  if (now - state.lastGlitch < interval) return;
  state.lastGlitch = now;

  const w = canvas.width;
  const h = canvas.height;
  const imageData = ctx.createImageData(w, h);
  const data = imageData.data;

  // Static noise
  for (let i = 0; i < data.length; i += 4) {
    const v = Math.random() * 255;
    if (config.colorShift) {
      data[i] = v + (Math.random() - 0.5) * 50;
      data[i + 1] = v + (Math.random() - 0.5) * 50;
      data[i + 2] = v + (Math.random() - 0.5) * 50;
    } else {
      data[i] = data[i + 1] = data[i + 2] = v;
    }
    data[i + 3] = 255;
  }

  // Scanlines
  if (config.scanlines) {
    for (let y = 0; y < h; y += 4) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        data[idx] *= 0.5;
        data[idx + 1] *= 0.5;
        data[idx + 2] *= 0.5;
      }
    }
  }

  // Horizontal glitch slices
  const sliceCount = Math.floor(Math.random() * 5) + 1;
  for (let s = 0; s < sliceCount; s++) {
    const sliceY = Math.floor(Math.random() * h);
    const sliceH = Math.floor(Math.random() * 20) + 5;
    const shift = Math.floor((Math.random() - 0.5) * 40);

    for (let y = sliceY; y < Math.min(sliceY + sliceH, h); y++) {
      for (let x = 0; x < w; x++) {
        const srcX = Math.max(0, Math.min(w - 1, x + shift));
        const dstIdx = (y * w + x) * 4;
        const srcIdx = (y * w + srcX) * 4;
        data[dstIdx] = data[srcIdx];
        data[dstIdx + 1] = data[srcIdx + 1];
        data[dstIdx + 2] = data[srcIdx + 2];
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

function stopStaticGlitch() {
  canvas.style.opacity = '1';
  delete prankState.staticGlitch;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// ═══════════════════════════════════════════════════════════
// KEYSTROKE REACTIONS
// ═══════════════════════════════════════════════════════════

function showReaction(response: any) {
  const container = document.getElementById('prank-container')!;

  const el = document.createElement('div');
  el.className = 'keystroke-reaction';
  el.style.position = 'absolute';
  el.style.zIndex = '10000';
  el.style.pointerEvents = 'none';
  el.style.whiteSpace = 'nowrap';

  // Content
  if (response.type === 'image' && response.imageUrl) {
    const img = document.createElement('img');
    img.src = response.imageUrl;
    img.style.width = (response.imageWidth || 200) + 'px';
    img.style.height = (response.imageHeight || 200) + 'px';
    img.style.objectFit = 'contain';
    el.appendChild(img);
  } else {
    // emoji or text
    el.textContent = response.content || '👋';
    el.style.fontSize = (response.fontSize || 100) + 'px';
    el.style.fontFamily = response.fontFamily || 'sans-serif';
    el.style.fontWeight = response.fontWeight || 'bold';
    el.style.color = response.color || '#ffffff';
    el.style.textShadow = response.textShadow || '2px 2px 8px rgba(0,0,0,0.7)';
  }

  if (response.backgroundColor) {
    el.style.backgroundColor = response.backgroundColor;
    el.style.borderRadius = response.borderRadius || '10px';
    el.style.padding = response.padding || '20px';
  }

  el.style.opacity = '0';
  container.appendChild(el);

  // Position
  const sw = window.innerWidth;
  const sh = window.innerHeight;
  const elW = el.offsetWidth || 100;
  const elH = el.offsetHeight || 100;

  const pos = response.position || 'center';
  switch (pos) {
    case 'center':
      el.style.left = ((sw - elW) / 2) + 'px';
      el.style.top = ((sh - elH) / 2) + 'px';
      break;
    case 'cursor':
      el.style.left = (cursorPos.x + 20) + 'px';
      el.style.top = (cursorPos.y - elH - 10) + 'px';
      break;
    case 'random':
      el.style.left = (Math.random() * (sw - elW)) + 'px';
      el.style.top = (Math.random() * (sh - elH)) + 'px';
      break;
    case 'top':
      el.style.left = ((sw - elW) / 2) + 'px';
      el.style.top = '40px';
      break;
    case 'bottom':
      el.style.left = ((sw - elW) / 2) + 'px';
      el.style.top = (sh - elH - 40) + 'px';
      break;
    case 'left':
      el.style.left = '40px';
      el.style.top = ((sh - elH) / 2) + 'px';
      break;
    case 'right':
      el.style.left = (sw - elW - 40) + 'px';
      el.style.top = ((sh - elH) / 2) + 'px';
      break;
  }

  // Animation
  const anim = response.animation || 'pop';
  const speed = response.animationSpeed || 1;
  const duration = response.duration || 2000;
  const baseMs = 300 / speed;

  // Sound
  if (response.soundUrl) {
    const audio = new Audio(response.soundUrl);
    audio.volume = response.soundVolume || 0.5;
    audio.play().catch(() => {});
  }

  // Animate in
  animateReactionIn(el, anim, baseMs, response.opacity ?? 1);

  // Animate out and remove
  setTimeout(() => {
    animateReactionOut(el, anim, baseMs, () => {
      el.remove();
    });
  }, duration - baseMs);
}

function animateReactionIn(el: HTMLElement, anim: string, ms: number, targetOpacity: number) {
  // Set initial state based on animation type
  switch (anim) {
    case 'pop':
      el.style.transform = 'scale(0)';
      el.style.transition = `all ${ms}ms cubic-bezier(0.175, 0.885, 0.32, 1.275)`;
      requestAnimationFrame(() => {
        el.style.opacity = String(targetOpacity);
        el.style.transform = 'scale(1)';
      });
      break;
    case 'fade':
      el.style.transition = `opacity ${ms}ms ease`;
      requestAnimationFrame(() => {
        el.style.opacity = String(targetOpacity);
      });
      break;
    case 'slideUp':
      el.style.transform = 'translateY(100px)';
      el.style.transition = `all ${ms}ms ease-out`;
      requestAnimationFrame(() => {
        el.style.opacity = String(targetOpacity);
        el.style.transform = 'translateY(0)';
      });
      break;
    case 'slideDown':
      el.style.transform = 'translateY(-100px)';
      el.style.transition = `all ${ms}ms ease-out`;
      requestAnimationFrame(() => {
        el.style.opacity = String(targetOpacity);
        el.style.transform = 'translateY(0)';
      });
      break;
    case 'slideLeft':
      el.style.transform = 'translateX(100px)';
      el.style.transition = `all ${ms}ms ease-out`;
      requestAnimationFrame(() => {
        el.style.opacity = String(targetOpacity);
        el.style.transform = 'translateX(0)';
      });
      break;
    case 'slideRight':
      el.style.transform = 'translateX(-100px)';
      el.style.transition = `all ${ms}ms ease-out`;
      requestAnimationFrame(() => {
        el.style.opacity = String(targetOpacity);
        el.style.transform = 'translateX(0)';
      });
      break;
    case 'bounce':
      el.style.transform = 'scale(0)';
      el.style.transition = `all ${ms}ms cubic-bezier(0.68, -0.55, 0.265, 1.55)`;
      requestAnimationFrame(() => {
        el.style.opacity = String(targetOpacity);
        el.style.transform = 'scale(1)';
      });
      break;
    case 'grow':
      el.style.transform = 'scale(0.1)';
      el.style.transition = `all ${ms * 2}ms ease-out`;
      requestAnimationFrame(() => {
        el.style.opacity = String(targetOpacity);
        el.style.transform = 'scale(1)';
      });
      break;
    case 'spin':
      el.style.transform = 'rotate(-720deg) scale(0)';
      el.style.transition = `all ${ms * 1.5}ms ease-out`;
      requestAnimationFrame(() => {
        el.style.opacity = String(targetOpacity);
        el.style.transform = 'rotate(0deg) scale(1)';
      });
      break;
    case 'shake':
      el.style.opacity = String(targetOpacity);
      el.style.transition = `transform 50ms ease`;
      let shakeCount = 0;
      const shakeInterval = setInterval(() => {
        const x = (Math.random() - 0.5) * 20;
        const y = (Math.random() - 0.5) * 20;
        el.style.transform = `translate(${x}px, ${y}px)`;
        shakeCount++;
        if (shakeCount > ms / 50) {
          clearInterval(shakeInterval);
          el.style.transform = 'translate(0, 0)';
        }
      }, 50);
      break;
    case 'explode':
      el.style.transform = 'scale(5)';
      el.style.opacity = '0';
      el.style.transition = `all ${ms}ms ease-out`;
      requestAnimationFrame(() => {
        el.style.opacity = String(targetOpacity);
        el.style.transform = 'scale(1)';
      });
      break;
    default:
      el.style.opacity = String(targetOpacity);
  }
}

function animateReactionOut(el: HTMLElement, anim: string, ms: number, onDone: () => void) {
  switch (anim) {
    case 'pop':
    case 'bounce':
      el.style.transition = `all ${ms}ms ease-in`;
      el.style.transform = 'scale(0)';
      el.style.opacity = '0';
      break;
    case 'fade':
      el.style.transition = `opacity ${ms}ms ease`;
      el.style.opacity = '0';
      break;
    case 'slideUp':
      el.style.transition = `all ${ms}ms ease-in`;
      el.style.transform = 'translateY(-100px)';
      el.style.opacity = '0';
      break;
    case 'slideDown':
      el.style.transition = `all ${ms}ms ease-in`;
      el.style.transform = 'translateY(100px)';
      el.style.opacity = '0';
      break;
    case 'slideLeft':
      el.style.transition = `all ${ms}ms ease-in`;
      el.style.transform = 'translateX(-100px)';
      el.style.opacity = '0';
      break;
    case 'slideRight':
      el.style.transition = `all ${ms}ms ease-in`;
      el.style.transform = 'translateX(100px)';
      el.style.opacity = '0';
      break;
    case 'grow':
      el.style.transition = `all ${ms}ms ease-in`;
      el.style.transform = 'scale(3)';
      el.style.opacity = '0';
      break;
    case 'spin':
      el.style.transition = `all ${ms}ms ease-in`;
      el.style.transform = 'rotate(720deg) scale(0)';
      el.style.opacity = '0';
      break;
    case 'shake':
    case 'explode':
      el.style.transition = `all ${ms}ms ease-in`;
      el.style.transform = 'scale(3)';
      el.style.opacity = '0';
      break;
    default:
      el.style.opacity = '0';
  }

  setTimeout(onDone, ms + 50);
}

// ═══════════════════════════════════════════════════════════
// MERCY MESSAGES
// ═══════════════════════════════════════════════════════════

function showMercyMessage(data: any) {
  const container = document.getElementById('prank-container')!;
  const sw = window.innerWidth;
  const sh = window.innerHeight;

  // Full-screen semi-transparent backdrop
  const backdrop = document.createElement('div');
  backdrop.style.cssText = `
    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0); z-index: 20000; pointer-events: none;
    display: flex; flex-direction: column; justify-content: center; align-items: center;
    transition: background 600ms ease;
  `;

  // Emoji
  const emoji = document.createElement('div');
  emoji.textContent = data.emoji || '';
  emoji.style.cssText = `
    font-size: ${(data.fontSize || 48) * 2}px;
    opacity: 0; transform: scale(0);
    transition: all 500ms cubic-bezier(0.175, 0.885, 0.32, 1.275);
    margin-bottom: 20px;
  `;

  // Text
  const text = document.createElement('div');
  text.textContent = data.text || '';
  text.style.cssText = `
    font-size: ${data.fontSize || 48}px;
    font-family: 'Segoe UI', -apple-system, sans-serif;
    font-weight: bold;
    color: ${data.color || '#00ff00'};
    text-shadow: 0 0 20px ${data.color || '#00ff00'}, 0 0 40px ${data.color || '#00ff00'}44;
    text-align: center;
    opacity: 0; transform: translateY(30px);
    transition: all 600ms ease-out 200ms;
    padding: 0 40px;
  `;

  backdrop.appendChild(emoji);
  backdrop.appendChild(text);
  container.appendChild(backdrop);

  // Animate in
  requestAnimationFrame(() => {
    backdrop.style.background = 'rgba(0,0,0,0.7)';
    emoji.style.opacity = '1';
    emoji.style.transform = 'scale(1)';
    text.style.opacity = '1';
    text.style.transform = 'translateY(0)';
  });

  // Animate out
  const duration = data.duration || 4000;
  setTimeout(() => {
    backdrop.style.transition = 'all 800ms ease';
    backdrop.style.opacity = '0';
    setTimeout(() => backdrop.remove(), 900);
  }, duration - 800);
}
