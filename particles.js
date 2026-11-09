function particleEngine(canvas, newCanvas) {
  const ctx = canvas.getContext("2d");
  const leafColors = ["#f2a516", "#e8781c", "#d4501e", "#f6c445", "#b8441a"];
  const raf = self.requestAnimationFrame ? (f) => self.requestAnimationFrame(f) : (f) => setTimeout(() => f(performance.now()), 16);
  const caf = self.cancelAnimationFrame ? (id) => self.cancelAnimationFrame(id) : (id) => clearTimeout(id);
  let mode = "none";
  let w = 0, h = 0, dpr = 1, items = [];
  let running = false;
  let rafId = 0;
  let last = 0;
  let sprites = new Map();

  function sprite(key, size, draw) {
    let s = sprites.get(key);
    if (!s) {
      s = newCanvas(Math.ceil(size * 2 * dpr));
      const c = s.getContext("2d");
      c.setTransform(dpr, 0, 0, dpr, size * dpr, size * dpr);
      draw(c);
      sprites.set(key, s);
    }
    return s;
  }

  function fill() {
    if (!w || mode === "none") return;
    const count = mode === "snow"
      ? Math.round(Math.min(70, Math.max(30, w / 22)))
      : Math.round(Math.min(18, Math.max(8, w / 90)));
    while (items.length < count) items.push(make(true));
    items.length = count;
  }

  function make(anywhere) {
    if (mode === "snow") {
      const r = 1.2 + Math.random() * 3.3;
      return {
        x: Math.random() * w,
        y: anywhere ? Math.random() * h : -10,
        r,
        speed: 0.3 + r * 0.18 + Math.random() * 0.3,
        sway: 0.3 + Math.random() * 0.8,
        phase: Math.random() * Math.PI * 2,
        angle: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 0.02,
        alpha: 0.6 + Math.random() * 0.4,
        star: r > 3.2,
      };
    }
    return {
      x: Math.random() * w,
      y: anywhere ? Math.random() * h : -30,
      size: 9 + Math.random() * 10,
      speed: 0.35 + Math.random() * 0.6,
      sway: 0.6 + Math.random() * 1.2,
      phase: Math.random() * Math.PI * 2,
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.03,
      flip: Math.random() * Math.PI * 2,
      color: leafColors[Math.floor(Math.random() * leafColors.length)],
      alpha: 0.55 + Math.random() * 0.35,
    };
  }

  const LEAF = 19;
  function leafSprite(color) {
    return sprite(color, LEAF * 1.4, (c) => {
      const s = LEAF;
      c.beginPath();
      c.moveTo(0, -s);
      c.bezierCurveTo(s * 0.8, -s * 0.5, s * 0.7, s * 0.5, 0, s);
      c.bezierCurveTo(-s * 0.7, s * 0.5, -s * 0.8, -s * 0.5, 0, -s);
      c.fillStyle = color;
      c.fill();
      c.beginPath();
      c.moveTo(0, -s * 0.85);
      c.lineTo(0, s * 1.25);
      c.strokeStyle = "rgba(90, 40, 10, 0.45)";
      c.lineWidth = 1;
      c.stroke();
    });
  }

  function drawLeaf(l) {
    const k = (l.size / LEAF) * dpr;
    const flip = Math.cos(l.flip);
    const cos = Math.cos(l.angle), sin = Math.sin(l.angle);
    const img = leafSprite(l.color);
    const half = img.width / dpr / 2;
    ctx.globalAlpha = l.alpha;
    ctx.setTransform(cos * k, sin * k, -sin * k * flip, cos * k * flip, l.x * dpr, l.y * dpr);
    ctx.drawImage(img, -half, -half, half * 2, half * 2);
  }

  function flakeSprite(f) {
    const r = Math.round(f.r * 10) / 10;
    return sprite(`${f.star ? "star" : "dot"}${r}`, r * 2.2 + 6, (c) => {
      if (f.star) {
        c.strokeStyle = "rgba(255, 255, 255, 0.95)";
        c.lineWidth = 1.3;
        c.shadowColor = "rgba(60, 120, 180, 0.6)";
        c.shadowBlur = 3;
        c.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI / 3) * i;
          c.moveTo(0, 0);
          c.lineTo(Math.cos(a) * r * 2.2, Math.sin(a) * r * 2.2);
        }
        c.stroke();
      } else {
        c.fillStyle = "rgba(255, 255, 255, 0.95)";
        c.shadowColor = "rgba(60, 120, 180, 0.55)";
        c.shadowBlur = 4;
        c.beginPath();
        c.arc(0, 0, r, 0, Math.PI * 2);
        c.fill();
      }
    });
  }

  function drawFlake(f) {
    const img = flakeSprite(f);
    const half = img.width / dpr / 2;
    const cos = f.star ? Math.cos(f.angle) * dpr : dpr;
    const sin = f.star ? Math.sin(f.angle) * dpr : 0;
    ctx.globalAlpha = f.alpha;
    ctx.setTransform(cos, sin, -sin, cos, f.x * dpr, f.y * dpr);
    ctx.drawImage(img, -half, -half, half * 2, half * 2);
  }

  function frame(now) {
    const dt = Math.min((now - last) / 16.67, 3);
    last = now;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const draw = mode === "snow" ? drawFlake : drawLeaf;
    for (let i = 0; i < items.length; i++) {
      const p = items[i];
      p.phase += 0.02 * dt;
      p.y += p.speed * dt;
      p.x += Math.sin(p.phase) * p.sway * dt * 0.6;
      p.angle += p.spin * dt;
      if (mode === "leaves") p.flip += 0.03 * dt;
      if (p.y > h + 30 || p.x < -40 || p.x > w + 40) items[i] = make(false);
      draw(items[i]);
    }
    rafId = raf(frame);
  }

  function clear() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  return {
    resize(width, height, ratio) {
      if (!width || !height) return;
      if (ratio !== dpr) sprites = new Map();
      dpr = ratio;
      w = width;
      h = height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      fill();
    },
    setMode(next) {
      mode = next;
      items = [];
      fill();
    },
    run(on) {
      caf(rafId);
      running = on && mode !== "none";
      if (running) {
        last = performance.now();
        rafId = raf(frame);
      } else {
        clear();
      }
    },
  };
}

function applyParticles(engine, data) {
  if (data.size) engine.resize(...data.size);
  if ("mode" in data) engine.setMode(data.mode);
  if ("run" in data) engine.run(data.run);
}

if (typeof document === "undefined") {
  let engine = null;
  self.onmessage = ({ data }) => {
    if (data.canvas) engine = particleEngine(data.canvas, (s) => new OffscreenCanvas(s, s));
    if (engine) applyParticles(engine, data);
  };
  self.postMessage("ready");
}
