// Doodle Friends drawing engine — full brush set ported from Doodle Zone,
// plus symmetry modes. Exposes one entry point: renderStroke(), called on
// every pointer move with the previous and current point.

export const BRUSHES = [
  { id: "pencil", label: "Pencil", icon: "✏️" },
  { id: "eraser", label: "Eraser", icon: "🧽" },
  { id: "rainbow", label: "Rainbow", icon: "🌈" },
  { id: "glitter", label: "Glitter", icon: "✨" },
  { id: "neon", label: "Neon", icon: "💡" },
  { id: "stamp", label: "Stamps", icon: "⭐" },
  { id: "wave", label: "Wave", icon: "🌊" },
  { id: "bubble", label: "Bubbles", icon: "🫧" },
  { id: "zigzag", label: "Zigzag", icon: "⚡" },
  { id: "confetti", label: "Confetti", icon: "🎉" },
  { id: "chaos", label: "Chaos", icon: "💥" },
  { id: "crayon", label: "Crayon", icon: "🖍️" },
  { id: "calligraphy", label: "Calligraphy", icon: "🖋️" },
  { id: "spiral", label: "Spiral", icon: "🌀" },
  { id: "stitch", label: "Stitch", icon: "🧵" },
  { id: "fill", label: "Fill bucket", icon: "🪣" },
];

export const STAMP_EMOJIS = ["⭐", "❤️", "🌸", "☁️", "🎵", "🐾"];

export const SYMMETRY_MODES = [
  { id: "normal", label: "Normal", icon: "◯" },
  { id: "mirror", label: "Mirror", icon: "⇋" },
  { id: "mirrorV", label: "Mirror ↕", icon: "⇕" },
  { id: "kaleido", label: "Kaleidoscope", icon: "✦" },
  { id: "radial6", label: "Radial 6", icon: "❋" },
  { id: "radial8", label: "Radial 8", icon: "✳" },
];

function hexToRgb(hex) {
  const n = parseInt(hex.replace("#", ""), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

// Returns an array of {x,y} points — the input point plus all its
// symmetry copies — for a canvas of size RES x RES.
export function symmetryPoints(x, y, mode, RES) {
  const cx = RES / 2, cy = RES / 2;
  switch (mode) {
    case "mirror":
      return [{ x, y }, { x: RES - x, y }];
    case "mirrorV":
      return [{ x, y }, { x, y: RES - y }];
    case "kaleido":
      return [{ x, y }, { x: RES - x, y }, { x, y: RES - y }, { x: RES - x, y: RES - y }];
    case "radial6":
    case "radial8": {
      const count = mode === "radial6" ? 6 : 8;
      const pts = [];
      const dx = x - cx, dy = y - cy;
      for (let k = 0; k < count; k++) {
        const a = (k * 2 * Math.PI) / count;
        const cos = Math.cos(a), sin = Math.sin(a);
        pts.push({ x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos });
      }
      return pts;
    }
    default:
      return [{ x, y }];
  }
}

// Per-stroke mutable state, created fresh on pointer-down.
export function newStrokeState() {
  return {
    distance: 0,
    lastStampAt: null,
    spiralAngle: 0,
    lastTime: performance.now(),
  };
}

// Draw one segment (p0 -> p1) for every symmetry copy, using the given tool.
export function renderStroke(ctx, p0, p1, tool, color, size, mode, RES, state, options = {}) {
  const dx = p1.x - p0.x, dy = p1.y - p0.y;
  const segDist = Math.hypot(dx, dy);
  state.distance += segDist;

  const p0s = symmetryPoints(p0.x, p0.y, mode, RES);
  const p1s = symmetryPoints(p1.x, p1.y, mode, RES);

  for (let i = 0; i < p1s.length; i++) {
    drawOne(ctx, p0s[i], p1s[i], tool, color, size, state, segDist, options);
  }
}

// Single point stamp (used for taps, and for fill bucket).
export function renderStamp(ctx, p, tool, color, size, mode, RES, state, extra = {}) {
  const pts = symmetryPoints(p.x, p.y, mode, RES);
  pts.forEach((pt) => stampOne(ctx, pt, tool, color, size, state, extra));
}

function drawOne(ctx, a, b, tool, color, size, state, segDist, options = {}) {
  ctx.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
  ctx.shadowBlur = 0;
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  switch (tool) {
    case "eraser": {
      ctx.strokeStyle = "#000";
      ctx.lineWidth = size;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      break;
    }
    case "rainbow": {
      const hue = (state.distance * 2.2) % 360;
      ctx.strokeStyle = `hsl(${hue}, 85%, 55%)`;
      ctx.lineWidth = size;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      break;
    }
    case "neon": {
      ctx.shadowColor = color;
      ctx.shadowBlur = size * 1.4;
      ctx.strokeStyle = color;
      ctx.lineWidth = size * 0.6;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = size * 0.22;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      break;
    }
    case "crayon": {
      const { r, g, b } = hexToRgb(color);
      for (let i = 0; i < 4; i++) {
        const jitter = (Math.random() - 0.5) * size * 0.5;
        const nx1 = a.x + jitter, ny1 = a.y + jitter;
        const nx2 = b.x + jitter, ny2 = b.y + jitter;
        ctx.globalAlpha = 0.18 + Math.random() * 0.15;
        ctx.strokeStyle = `rgb(${r},${g},${b})`;
        ctx.lineWidth = size * (0.5 + Math.random() * 0.5);
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(nx1, ny1);
        ctx.lineTo(nx2, ny2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      break;
    }
    case "calligraphy": {
      const now = performance.now();
      const dt = Math.max(1, now - state.lastTime);
      state.lastTime = now;
      const speed = segDist / dt; // px per ms
      const width = Math.max(size * 0.3, size * 1.6 - speed * size * 5);
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      break;
    }
    case "zigzag": {
      const segs = 3;
      let px = a.x, py = a.y;
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(2, size * 0.4);
      ctx.lineCap = "round";
      for (let i = 1; i <= segs; i++) {
        const t = i / segs;
        const jitter = (Math.random() - 0.5) * size * 1.5;
        const nx = a.x + (b.x - a.x) * t + jitter;
        const ny = a.y + (b.y - a.y) * t + jitter;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(nx, ny);
        ctx.stroke();
        px = nx; py = ny;
      }
      break;
    }
    case "wave": {
      const perp = Math.sin(state.distance * 0.15) * size * 0.9;
      const nx = Math.hypot(b.y - a.y, b.x - a.x) === 0 ? 0 : -(b.y - a.y);
      const ny = b.x - a.x;
      const len = Math.hypot(nx, ny) || 1;
      const ox = (nx / len) * perp, oy = (ny / len) * perp;
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(2, size * 0.5);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(a.x + ox, a.y + oy);
      ctx.lineTo(b.x + ox, b.y + oy);
      ctx.stroke();
      break;
    }
    case "stitch": {
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(2, size * 0.45);
      ctx.lineCap = "round";
      ctx.setLineDash([size * 0.8, size * 0.6]);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.setLineDash([]);
      break;
    }
    case "chaos": {
      for (let i = 0; i < 2; i++) {
        const jx = (Math.random() - 0.5) * size * 2;
        const jy = (Math.random() - 0.5) * size * 2;
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.5 + Math.random() * 0.4;
        ctx.lineWidth = Math.max(1, size * 0.3);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x + jx, b.y + jy);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      break;
    }
    case "glitter": {
      // base faint line + sparkle dots
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = Math.max(2, size * 0.35);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.globalAlpha = 1;
      if (Math.random() < 0.55) sparkle(ctx, b.x, b.y, size, color);
      break;
    }
    case "bubble": {
      if (Math.random() < 0.4) {
        const r = size * (0.4 + Math.random() * 0.8);
        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      break;
    }
    case "confetti": {
      if (Math.random() < 0.5) {
        const { r, g, b: bl } = hexToRgb(color);
        const shade = Math.random() < 0.5 ? `rgb(${r},${g},${bl})` : "#fff";
        ctx.save();
        ctx.translate(b.x + (Math.random() - 0.5) * size, b.y + (Math.random() - 0.5) * size);
        ctx.rotate(Math.random() * Math.PI);
        ctx.fillStyle = shade;
        const s = size * 0.3;
        ctx.fillRect(-s / 2, -s / 2, s, s);
        ctx.restore();
      }
      break;
    }
    case "spiral": {
      state.spiralAngle += 0.5;
      const r = size * 0.8;
      const ox = Math.cos(state.spiralAngle) * r;
      const oy = Math.sin(state.spiralAngle) * r;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(b.x + ox, b.y + oy, Math.max(2, size * 0.25), 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "stamp": {
      if (state.lastStampAt == null || Math.hypot(b.x - state.lastStampAt.x, b.y - state.lastStampAt.y) > size * 1.8) {
        stampOne(ctx, b, "stamp", color, size, state, { emoji: options.emoji });
        state.lastStampAt = { x: b.x, y: b.y };
      }
      break;
    }
    default: {
      // pencil
      ctx.strokeStyle = color;
      ctx.lineWidth = size;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }
}

function sparkle(ctx, x, y, size, color) {
  const r = Math.max(2, size * 0.4);
  ctx.save();
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(x - r, y); ctx.lineTo(x + r, y);
  ctx.moveTo(x, y - r); ctx.lineTo(x, y + r);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function stampOne(ctx, p, tool, color, size, state, extra) {
  const c = ctx;
  if (tool === "stamp") {
    const emoji = extra?.emoji || "⭐";
    c.font = `${Math.max(14, size * 2.2)}px sans-serif`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(emoji, p.x, p.y);
  }
}

// Flood fill from a single point (called once per symmetry copy by caller).
export function floodFill(ctx, RES, startX, startY, fillHex, tolerance = 40) {
  const img = ctx.getImageData(0, 0, RES, RES);
  const data = img.data;
  const sx = Math.floor(startX), sy = Math.floor(startY);
  if (sx < 0 || sy < 0 || sx >= RES || sy >= RES) return;

  const idx = (x, y) => (y * RES + x) * 4;
  const startIdx = idx(sx, sy);
  const startR = data[startIdx], startG = data[startIdx + 1], startB = data[startIdx + 2];

  const { r: fr, g: fg, b: fb } = hexToRgb(fillHex);
  if (Math.abs(startR - fr) < 5 && Math.abs(startG - fg) < 5 && Math.abs(startB - fb) < 5) return;

  const matches = (i) => {
    const dr = data[i] - startR, dg = data[i + 1] - startG, db = data[i + 2] - startB;
    return Math.sqrt(dr * dr + dg * dg + db * db) <= tolerance;
  };

  const stack = [[sx, sy]];
  const visited = new Uint8Array(RES * RES);
  let steps = 0;
  const MAX_STEPS = RES * RES * 2;

  while (stack.length && steps < MAX_STEPS) {
    steps++;
    const [x, y] = stack.pop();
    if (x < 0 || y < 0 || x >= RES || y >= RES) continue;
    const vIdx = y * RES + x;
    if (visited[vIdx]) continue;
    const i = idx(x, y);
    if (!matches(i)) continue;
    visited[vIdx] = 1;
    data[i] = fr; data[i + 1] = fg; data[i + 2] = fb; data[i + 3] = 255;
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  ctx.putImageData(img, 0, 0);
}

export { stampOne };
