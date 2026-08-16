import React, { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./supabaseClient";
import {
  BRUSHES, STAMP_EMOJIS, SYMMETRY_MODES,
  symmetryPoints, newStrokeState, renderStroke, renderStamp, floodFill,
} from "./drawEngine";

// ---------- palette ----------
const C = {
  purple: "#7C3AED",
  pink: "#EC4899",
  orange: "#F97316",
  yellow: "#FBBF24",
  green: "#10B981",
  red: "#EF4444",
  black: "#1F2937",
  bg: "#FBF6FF",
  card: "#FFFFFF",
  ink: "#3B2A55",
};
const BRUSH_COLORS = [
  { name: "Purple", hex: C.purple }, { name: "Pink", hex: C.pink },
  { name: "Blue", hex: "#3B82F6" }, { name: "Orange", hex: C.orange },
  { name: "Yellow", hex: C.yellow }, { name: "Green", hex: C.green },
  { name: "Red", hex: C.red }, { name: "Black", hex: C.black },
];
const AVATARS = ["🦄", "🐉", "🌈", "🎨", "🐶", "🐱", "🦋", "⭐", "🔥", "🍕", "🐢", "🌸"];
const EMPTY_MSG = {
  gallery: "Nothing here yet — every artist starts with a blank canvas. Go make your first masterpiece!",
  feed: "No friends' art yet. Add a friend to start seeing what they're creating!",
  friends: "No friends yet — search for someone below to add them.",
  search: "No one found with that name. Check the spelling, or ask them to make an account first!",
};

function timeAgo(ts) {
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
function describeError(e) {
  if (!e) return "unknown error";
  return e.message || String(e);
}

function Confetti({ show }) {
  if (!show) return null;
  const pieces = Array.from({ length: 18 });
  const colors = [C.purple, C.pink, "#3B82F6", C.orange, C.yellow, C.green];
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 60, overflow: "hidden" }}>
      {pieces.map((_, i) => {
        const left = Math.random() * 100;
        const color = colors[i % colors.length];
        const delay = Math.random() * 0.2;
        const dur = 0.9 + Math.random() * 0.6;
        const size = 6 + Math.random() * 6;
        return (
          <div key={i} style={{ position: "absolute", left: `${left}%`, top: "-10px", width: size, height: size, background: color, borderRadius: Math.random() > 0.5 ? "50%" : "2px", animation: `df-fall ${dur}s ease-in ${delay}s forwards` }} />
        );
      })}
      <style>{`@keyframes df-fall { to { transform: translateY(100vh) rotate(300deg); opacity: 0.3; } }`}</style>
    </div>
  );
}
function Logo({ size = 28 }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: size }}>🖍️</span>
      <span style={{ fontFamily: "Fredoka, sans-serif", fontWeight: 700, fontSize: size * 0.85, color: C.ink }}>Doodle Friends</span>
    </div>
  );
}
function Wobble() {
  return (
    <svg width="140" height="14" viewBox="0 0 140 14">
      <path d="M2 8 Q 12 2, 22 8 T 42 8 T 62 8 T 82 8 T 102 8 T 122 8 T 138 8" fill="none" stroke="url(#df-grad)" strokeWidth="4" strokeLinecap="round" />
      <defs>
        <linearGradient id="df-grad" x1="0" y1="0" x2="140" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={C.purple} /><stop offset="0.33" stopColor={C.pink} />
          <stop offset="0.66" stopColor={C.orange} /><stop offset="1" stopColor="#3B82F6" />
        </linearGradient>
      </defs>
    </svg>
  );
}
function AvatarBubble({ emoji, color, size = 44 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.5, boxShadow: "0 3px 0 rgba(0,0,0,0.12)", flexShrink: 0 }}>
      {emoji}
    </div>
  );
}
const btnGhost = {
  flex: 1, padding: "10px", borderRadius: 12, border: "2px solid #EDE4FB",
  background: "white", color: "#3B2A55", fontWeight: 600,
  fontFamily: "Fredoka, sans-serif", cursor: "pointer",
};

// ============================================================
// LOGIN SCREEN
// ============================================================
function LoginScreen({ users, loading, onLogin, onCreate, onDeleteAccount }) {
  const [mode, setMode] = useState("pick");
  const [confirmDelete, setConfirmDelete] = useState("");
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState(AVATARS[0]);
  const [color, setColor] = useState(BRUSH_COLORS[0].hex);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) return setError("Type a name first!");
    if (users.some((u) => u.username.toLowerCase() === trimmed.toLowerCase())) return setError("That name's taken — try another!");
    setBusy(true);
    setError("");
    const res = await onCreate({ username: trimmed, emoji, color });
    setBusy(false);
    if (!res.ok) setError(res.reason || "Hmm, that didn't save — try again.");
  };

  return (
    <div style={{ minHeight: "100dvh", background: `linear-gradient(160deg, ${C.bg} 0%, #F3E8FF 60%, #FCE7F3 100%)`, display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 20px", fontFamily: "Fredoka, sans-serif" }}>
      <div style={{ fontSize: 52, marginBottom: 4 }}>🎨</div>
      <div style={{ fontFamily: "Fredoka, sans-serif", fontWeight: 700, fontSize: 30, color: C.ink }}>Doodle Friends</div>
      <Wobble />
      <div style={{ color: "#8B7AA8", marginTop: 8, marginBottom: 28, textAlign: "center", fontSize: 15 }}>Draw. Share. Cheer each other on.</div>

      <div style={{ background: C.card, borderRadius: 24, padding: 22, width: "100%", maxWidth: 380, boxShadow: "0 8px 24px rgba(124,58,237,0.12)" }}>
        {mode === "pick" ? (
          <>
            <div style={{ fontWeight: 600, color: C.ink, marginBottom: 12 }}>Who's drawing today?</div>
            {loading ? (
              <div style={{ color: "#a89bc4", padding: "20px 0", textAlign: "center" }}>Loading profiles…</div>
            ) : users.length === 0 ? (
              <div style={{ color: "#a89bc4", padding: "10px 0 20px", textAlign: "center", fontSize: 14 }}>No accounts yet — be the first!</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 260, overflowY: "auto" }}>
                {users.map((u) => (
                  <div key={u.username} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 14, background: "#F7F3FF" }}>
                    <button onClick={() => onLogin(u.username)} style={{ flex: 1, display: "flex", alignItems: "center", gap: 12, border: "none", background: "none", cursor: "pointer", textAlign: "left", padding: 0 }}>
                      <AvatarBubble emoji={u.emoji} color={u.color} size={36} />
                      <span style={{ fontWeight: 600, color: C.ink }}>{u.username}</span>
                    </button>
                    {confirmDelete === u.username ? (
                      <div style={{ display: "flex", gap: 4 }}>
                        <button onClick={() => onDeleteAccount(u.username)} style={{ border: "none", background: C.red, color: "white", borderRadius: 10, padding: "6px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Delete</button>
                        <button onClick={() => setConfirmDelete("")} style={{ border: "none", background: "white", color: C.ink, borderRadius: 10, padding: "6px 10px", fontSize: 12, cursor: "pointer" }}>Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmDelete(u.username)} style={{ border: "none", background: "none", color: "#c4b5e0", fontSize: 12, cursor: "pointer" }}>delete</button>
                    )}
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setMode("create")} style={{ marginTop: 16, width: "100%", padding: "12px", borderRadius: 14, border: "none", background: `linear-gradient(90deg, ${C.purple}, ${C.pink})`, color: "white", fontWeight: 700, fontFamily: "Fredoka, sans-serif", cursor: "pointer" }}>
              + New account
            </button>
          </>
        ) : (
          <>
            <div style={{ fontWeight: 600, color: C.ink, marginBottom: 10 }}>Create your account</div>
            <input value={name} onChange={(e) => { setName(e.target.value); setError(""); }} placeholder="Your name or nickname" style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: "2px solid #EDE4FB", fontFamily: "Fredoka, sans-serif", fontSize: 15, outline: "none", boxSizing: "border-box" }} />
            <div style={{ fontSize: 13, color: "#8B7AA8", margin: "14px 0 6px" }}>Pick an avatar</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {AVATARS.map((a) => (
                <button key={a} onClick={() => setEmoji(a)} style={{ width: 40, height: 40, borderRadius: "50%", border: emoji === a ? `2px solid ${C.purple}` : "2px solid transparent", background: "#F7F3FF", fontSize: 19, cursor: "pointer" }}>{a}</button>
              ))}
            </div>
            <div style={{ fontSize: 13, color: "#8B7AA8", margin: "14px 0 6px" }}>Pick a color</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {BRUSH_COLORS.map((c) => (
                <button key={c.hex} onClick={() => setColor(c.hex)} style={{ width: 30, height: 30, borderRadius: "50%", background: c.hex, border: color === c.hex ? "3px solid #3B2A55" : "3px solid transparent", cursor: "pointer" }} />
              ))}
            </div>
            {error && <div style={{ color: C.red, fontSize: 13, marginTop: 10 }}>{error}</div>}
            <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
              <button onClick={() => setMode("pick")} style={{ flex: 1, padding: "12px", borderRadius: 14, border: "2px solid #EDE4FB", background: "white", fontWeight: 600, color: C.ink, fontFamily: "Fredoka, sans-serif", cursor: "pointer" }}>Back</button>
              <button onClick={handleCreate} disabled={busy} style={{ flex: 2, padding: "12px", borderRadius: 14, border: "none", background: `linear-gradient(90deg, ${C.purple}, ${C.pink})`, color: "white", fontWeight: 700, fontFamily: "Fredoka, sans-serif", cursor: "pointer", opacity: busy ? 0.7 : 1 }}>
                {busy ? "Creating…" : "Start drawing!"}
              </button>
            </div>
          </>
        )}
      </div>
      <div style={{ color: "#B7A9D1", fontSize: 12, marginTop: 22, textAlign: "center", maxWidth: 320 }}>
        This is just for friends &amp; family — no password. Anyone with this site's link can see the accounts here.
      </div>
    </div>
  );
}

// ============================================================
// DRAW SCREEN
// ============================================================
function DrawScreen({ me, onSaved }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const lastPoint = useRef(null);
  const historyRef = useRef([]);
  const strokeStateRef = useRef(newStrokeState());
  const [color, setColor] = useState(C.purple);
  const [size, setSize] = useState(6);
  const [tool, setTool] = useState("pencil");
  const [symmetry, setSymmetry] = useState("normal");
  const [stampEmoji, setStampEmoji] = useState(STAMP_EMOJIS[0]);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [confetti, setConfetti] = useState(false);
  const [showTools, setShowTools] = useState(true);
  const RES = 500;

  useEffect(() => {
    const ctx = canvasRef.current.getContext("2d");
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, RES, RES);
  }, []);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: ((clientX - rect.left) / rect.width) * RES, y: ((clientY - rect.top) / rect.height) * RES };
  };
  const pushHistory = () => {
    historyRef.current.push(canvasRef.current.toDataURL());
    if (historyRef.current.length > 15) historyRef.current.shift();
  };

  const start = (e) => {
    e.preventDefault();
    pushHistory();
    const ctx = canvasRef.current.getContext("2d");
    const pos = getPos(e);

    if (tool === "fill") {
      const pts = symmetryPoints(pos.x, pos.y, symmetry, RES);
      pts.forEach((pt) => floodFill(ctx, RES, pt.x, pt.y, color, 40));
      return;
    }

    drawing.current = true;
    lastPoint.current = pos;
    strokeStateRef.current = newStrokeState();

    if (tool === "stamp") {
      renderStamp(ctx, pos, "stamp", color, size, symmetry, RES, strokeStateRef.current, { emoji: stampEmoji });
      strokeStateRef.current.lastStampAt = pos;
    } else {
      // seed a tiny dot so single taps still leave a mark
      renderStroke(ctx, pos, { x: pos.x + 0.01, y: pos.y + 0.01 }, tool, color, size, symmetry, RES, strokeStateRef.current);
    }
  };
  const move = (e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const pos = getPos(e);
    const ctx = canvasRef.current.getContext("2d");
    renderStroke(ctx, lastPoint.current, pos, tool, color, size, symmetry, RES, strokeStateRef.current, { emoji: stampEmoji });
    lastPoint.current = pos;
  };
  const end = () => { drawing.current = false; };

  const undo = () => {
    const ctx = canvasRef.current.getContext("2d");
    const prev = historyRef.current.pop();
    if (!prev) {
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, RES, RES);
      return;
    }
    const img = new Image();
    img.onload = () => { ctx.clearRect(0, 0, RES, RES); ctx.drawImage(img, 0, 0); };
    img.src = prev;
  };
  const clearAll = () => {
    pushHistory();
    const ctx = canvasRef.current.getContext("2d");
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, RES, RES);
  };

  const save = async () => {
    setSaving(true);
    setSaveError("");
    const dataUrl = canvasRef.current.toDataURL("image/jpeg", 0.72);
    const { error } = await supabase.from("drawings").insert({
      username: me.username,
      title: title.trim() || "Untitled doodle",
      data_url: dataUrl,
    });
    setSaving(false);
    if (error) {
      setSaveError(`Didn't save — ${describeError(error)}. Tap save again to retry.`);
      return;
    }
    setTitle("");
    setConfetti(true);
    setTimeout(() => setConfetti(false), 1400);
    onSaved && onSaved();
  };

  const chipStyle = (active) => ({
    display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
    padding: "6px 8px", borderRadius: 12, minWidth: 52,
    border: active ? `2px solid ${C.purple}` : "2px solid #EDE4FB",
    background: active ? "#F3E8FF" : "white", cursor: "pointer",
    fontFamily: "Fredoka, sans-serif",
  });

  return (
    <div style={{ padding: "14px 14px 100px", fontFamily: "Fredoka, sans-serif" }}>
      <Confetti show={confetti} />
      <div style={{ fontWeight: 600, color: C.ink, marginBottom: 10 }}>Draw something great, {me.username} 🎨</div>
      <div style={{ width: "94%", maxWidth: 480, margin: "0 auto", aspectRatio: "1 / 1", borderRadius: 20, overflow: "hidden", boxShadow: "0 6px 18px rgba(124,58,237,0.15)", border: `3px solid ${C.purple}`, touchAction: "none" }}>
        <canvas ref={canvasRef} width={RES} height={RES} style={{ width: "100%", height: "100%", display: "block", touchAction: "none" }}
          onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerLeave={end} />
      </div>

      <button onClick={() => setShowTools((s) => !s)} style={{ width: "100%", marginTop: 10, padding: "8px", border: "none", background: "none", color: "#8B7AA8", fontFamily: "Fredoka, sans-serif", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
        {showTools ? "▲ Hide tools" : "▼ Show tools"}
      </button>

      {showTools && (
        <>
          <div style={{ fontSize: 12, color: "#8B7AA8", fontWeight: 600, marginTop: 8, marginBottom: 6 }}>Brush</div>
          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4 }}>
            {BRUSHES.map((b) => (
              <button key={b.id} onClick={() => setTool(b.id)} style={chipStyle(tool === b.id)}>
                <span style={{ fontSize: 18 }}>{b.icon}</span>
                <span style={{ fontSize: 9, color: C.ink, whiteSpace: "nowrap" }}>{b.label}</span>
              </button>
            ))}
          </div>

          {tool === "stamp" && (
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              {STAMP_EMOJIS.map((em) => (
                <button key={em} onClick={() => setStampEmoji(em)} style={{ width: 32, height: 32, borderRadius: 10, fontSize: 16, border: stampEmoji === em ? `2px solid ${C.purple}` : "2px solid #EDE4FB", background: "white", cursor: "pointer" }}>{em}</button>
              ))}
            </div>
          )}

          <div style={{ fontSize: 12, color: "#8B7AA8", fontWeight: 600, marginTop: 12, marginBottom: 6 }}>Symmetry</div>
          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4 }}>
            {SYMMETRY_MODES.map((s) => (
              <button key={s.id} onClick={() => setSymmetry(s.id)} style={chipStyle(symmetry === s.id)}>
                <span style={{ fontSize: 16 }}>{s.icon}</span>
                <span style={{ fontSize: 9, color: C.ink, whiteSpace: "nowrap" }}>{s.label}</span>
              </button>
            ))}
          </div>

          <div style={{ fontSize: 12, color: "#8B7AA8", fontWeight: 600, marginTop: 12, marginBottom: 6 }}>Color</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {BRUSH_COLORS.map((c) => (
              <button key={c.hex} onClick={() => setColor(c.hex)} style={{ width: 32, height: 32, borderRadius: "50%", background: c.hex, border: color === c.hex ? "3px solid #3B2A55" : "3px solid white", boxShadow: "0 1px 4px rgba(0,0,0,0.2)", cursor: "pointer" }} />
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
            <span style={{ fontSize: 13, color: "#8B7AA8" }}>Brush size</span>
            <input type="range" min={2} max={40} value={size} onChange={(e) => setSize(Number(e.target.value))} style={{ flex: 1 }} />
            <div style={{ width: size + 6, height: size + 6, borderRadius: "50%", background: color }} />
          </div>
        </>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button onClick={undo} style={btnGhost}>↩️ Undo</button>
        <button onClick={clearAll} style={btnGhost}>🗑️ Clear</button>
      </div>

      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Give it a title…" style={{ width: "100%", marginTop: 14, padding: "12px 14px", borderRadius: 12, border: "2px solid #EDE4FB", fontFamily: "Fredoka, sans-serif", fontSize: 15, outline: "none", boxSizing: "border-box" }} />
      {saveError && <div style={{ color: C.red, fontSize: 13, marginTop: 8, fontWeight: 600 }}>{saveError}</div>}
      <button onClick={save} disabled={saving} style={{ width: "100%", marginTop: 10, padding: "14px", borderRadius: 16, border: "none", background: `linear-gradient(90deg, ${C.purple}, ${C.pink}, ${C.orange})`, color: "white", fontWeight: 700, fontSize: 16, fontFamily: "Fredoka, sans-serif", cursor: "pointer", opacity: saving ? 0.7 : 1 }}>
        {saving ? "Saving…" : "✨ Save & share with friends"}
      </button>
    </div>
  );
}

// ============================================================
// GALLERY SCREEN
// ============================================================
// ============================================================
// COMMENTS (used in Feed and the Gallery viewer)
// ============================================================
function Comments({ me, users, drawingId }) {
  const [comments, setComments] = useState(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from("comments").select("*").eq("drawing_id", drawingId).order("created_at", { ascending: true });
    setComments(data || []);
  }, [drawingId]);

  useEffect(() => { load(); }, [load]);

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setSending(true);
    const { error } = await supabase.from("comments").insert({
      drawing_id: drawingId, username: me.username, text: trimmed.slice(0, 200),
    });
    setSending(false);
    if (!error) {
      setText("");
      load();
    }
  };

  return (
    <div style={{ borderTop: "1px solid #F0E9FB", marginTop: 8, paddingTop: 8 }}>
      {comments === null ? (
        <div style={{ fontSize: 12, color: "#b7a9d1" }}>Loading comments…</div>
      ) : comments.length === 0 ? (
        <div style={{ fontSize: 12, color: "#b7a9d1", marginBottom: 6 }}>No comments yet — say something nice!</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
          {comments.map((c) => {
            const u = users.find((x) => x.username === c.username);
            return (
              <div key={c.id} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <AvatarBubble emoji={u?.emoji || "🎨"} color={u?.color || C.purple} size={24} />
                <div style={{ fontSize: 13, color: C.ink }}>
                  <span style={{ fontWeight: 700 }}>{c.username}</span>{" "}
                  <span>{c.text}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div style={{ display: "flex", gap: 6 }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") send(); }}
          placeholder="Say something nice…"
          maxLength={200}
          style={{ flex: 1, padding: "8px 12px", borderRadius: 10, border: "2px solid #EDE4FB", fontFamily: "Fredoka, sans-serif", fontSize: 13, outline: "none" }}
        />
        <button onClick={send} disabled={sending || !text.trim()} style={{ padding: "8px 14px", borderRadius: 10, border: "none", background: C.purple, color: "white", fontWeight: 700, fontSize: 13, cursor: "pointer", opacity: sending || !text.trim() ? 0.6 : 1 }}>
          Send
        </button>
      </div>
    </div>
  );
}


function GalleryScreen({ me, refreshKey, users }) {
  const [drawings, setDrawings] = useState(null);
  const [viewing, setViewing] = useState(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("drawings").select("*").eq("username", me.username).order("created_at", { ascending: false });
      setDrawings(data || []);
    })();
  }, [me.username, refreshKey]);

  const del = async (id) => {
    setDrawings(drawings.filter((d) => d.id !== id));
    await supabase.from("drawings").delete().eq("id", id);
    setViewing(null);
  };

  return (
    <div style={{ padding: "14px 14px 100px", fontFamily: "Fredoka, sans-serif" }}>
      <div style={{ fontWeight: 600, color: C.ink, marginBottom: 12 }}>My art 🖼️</div>
      {drawings === null ? (
        <div style={{ color: "#a89bc4", textAlign: "center", padding: 30 }}>Loading…</div>
      ) : drawings.length === 0 ? (
        <div style={{ color: "#a89bc4", textAlign: "center", padding: 30, fontSize: 14 }}>{EMPTY_MSG.gallery}</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {drawings.map((d) => (
            <button key={d.id} onClick={() => setViewing(d)} style={{ border: "none", padding: 0, background: "none", cursor: "pointer", textAlign: "left" }}>
              <img src={d.data_url} alt={d.title} style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover", borderRadius: 14, border: "2px solid #EDE4FB" }} />
              <div style={{ fontSize: 12, color: C.ink, marginTop: 4, fontWeight: 600 }}>{d.title}</div>
              <div style={{ fontSize: 11, color: "#b7a9d1" }}>{d.hearted_by?.length > 0 ? `❤️ ${d.hearted_by.length}` : "no hearts yet"}</div>
            </button>
          ))}
        </div>
      )}
      {viewing && (
        <div onClick={() => setViewing(null)} style={{ position: "fixed", inset: 0, background: "rgba(59,42,85,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "white", borderRadius: 20, padding: 16, maxWidth: 360, width: "100%", maxHeight: "85vh", overflowY: "auto" }}>
            <img src={viewing.data_url} alt={viewing.title} style={{ width: "100%", borderRadius: 14 }} />
            <div style={{ fontWeight: 700, color: C.ink, marginTop: 10 }}>{viewing.title}</div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button onClick={() => setViewing(null)} style={btnGhost}>Close</button>
              <button onClick={() => del(viewing.id)} style={{ ...btnGhost, color: C.red, borderColor: "#FBD5D5" }}>Delete</button>
            </div>
            <Comments me={me} users={users} drawingId={viewing.id} />
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// FRIENDS SCREEN
// ============================================================
function FriendsScreen({ me, users }) {
  const [friends, setFriends] = useState(null);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabase.from("friends").select("friend_username").eq("username", me.username);
    setFriends((data || []).map((r) => r.friend_username));
  }, [me.username]);

  useEffect(() => { load(); }, [load]);

  const addFriend = async (username) => {
    setBusy(username);
    await supabase.from("friends").insert([
      { username: me.username, friend_username: username },
      { username, friend_username: me.username },
    ]);
    setFriends((prev) => [...(prev || []), username]);
    setBusy("");
  };
  const removeFriend = async (username) => {
    setFriends((friends || []).filter((f) => f !== username));
    await supabase.from("friends").delete().or(
      `and(username.eq.${me.username},friend_username.eq.${username}),and(username.eq.${username},friend_username.eq.${me.username})`
    );
  };

  const results = query.trim() ? users.filter((u) => u.username.toLowerCase().includes(query.trim().toLowerCase()) && u.username !== me.username) : [];

  return (
    <div style={{ padding: "14px 14px 100px", fontFamily: "Fredoka, sans-serif" }}>
      <div style={{ fontWeight: 600, color: C.ink, marginBottom: 12 }}>Friends 👯</div>
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name to add a friend…" style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: "2px solid #EDE4FB", fontFamily: "Fredoka, sans-serif", fontSize: 15, outline: "none", boxSizing: "border-box" }} />
      {query.trim() && (
        <div style={{ marginTop: 10 }}>
          {results.length === 0 ? (
            <div style={{ color: "#a89bc4", fontSize: 13, padding: "10px 0" }}>{EMPTY_MSG.search}</div>
          ) : (
            results.map((u) => (
              <div key={u.username} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
                <AvatarBubble emoji={u.emoji} color={u.color} size={36} />
                <span style={{ flex: 1, fontWeight: 600, color: C.ink }}>{u.username}</span>
                {friends?.includes(u.username) ? (
                  <span style={{ fontSize: 12, color: "#8B7AA8" }}>Already friends</span>
                ) : (
                  <button onClick={() => addFriend(u.username)} disabled={busy === u.username} style={{ padding: "6px 14px", borderRadius: 20, border: "none", background: C.purple, color: "white", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                    {busy === u.username ? "…" : "Add"}
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}
      <div style={{ marginTop: 20, fontWeight: 600, color: C.ink, fontSize: 14 }}>My friends</div>
      {friends === null ? (
        <div style={{ color: "#a89bc4", padding: 20, textAlign: "center" }}>Loading…</div>
      ) : friends.length === 0 ? (
        <div style={{ color: "#a89bc4", fontSize: 13, padding: "14px 0" }}>{EMPTY_MSG.friends}</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
          {friends.map((f) => {
            const u = users.find((x) => x.username === f);
            return (
              <div key={f} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "#F7F3FF", borderRadius: 12 }}>
                <AvatarBubble emoji={u?.emoji || "🎨"} color={u?.color || C.purple} size={34} />
                <span style={{ flex: 1, fontWeight: 600, color: C.ink }}>{f}</span>
                <button onClick={() => removeFriend(f)} style={{ border: "none", background: "none", color: "#c4b5e0", cursor: "pointer", fontSize: 13 }}>remove</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================
// FEED SCREEN
// ============================================================
function FeedScreen({ me, users }) {
  const [items, setItems] = useState(null);

  const load = useCallback(async () => {
    const { data: friendRows } = await supabase.from("friends").select("friend_username").eq("username", me.username);
    const friendNames = (friendRows || []).map((r) => r.friend_username);
    if (friendNames.length === 0) return setItems([]);
    const { data } = await supabase.from("drawings").select("*").in("username", friendNames).order("created_at", { ascending: false }).limit(40);
    setItems(data || []);
  }, [me.username]);

  useEffect(() => { load(); }, [load]);

  const toggleHeart = async (item) => {
    const heartedBy = item.hearted_by || [];
    const has = heartedBy.includes(me.username);
    const next = has ? heartedBy.filter((n) => n !== me.username) : [...heartedBy, me.username];
    await supabase.from("drawings").update({ hearted_by: next }).eq("id", item.id);
    setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, hearted_by: next } : it)));
  };

  return (
    <div style={{ padding: "14px 14px 100px", fontFamily: "Fredoka, sans-serif" }}>
      <div style={{ fontWeight: 600, color: C.ink, marginBottom: 12 }}>Friends' art 🌈</div>
      {items === null ? (
        <div style={{ color: "#a89bc4", textAlign: "center", padding: 30 }}>Loading…</div>
      ) : items.length === 0 ? (
        <div style={{ color: "#a89bc4", textAlign: "center", padding: 30, fontSize: 14 }}>{EMPTY_MSG.feed}</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {items.map((d) => {
            const owner = users.find((u) => u.username === d.username);
            const hearted = d.hearted_by?.includes(me.username);
            return (
              <div key={d.id} style={{ background: "white", borderRadius: 18, overflow: "hidden", boxShadow: "0 4px 14px rgba(124,58,237,0.1)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px" }}>
                  <AvatarBubble emoji={owner?.emoji || "🎨"} color={owner?.color || C.purple} size={30} />
                  <span style={{ fontWeight: 600, color: C.ink, fontSize: 14 }}>{d.username}</span>
                  <span style={{ marginLeft: "auto", fontSize: 11, color: "#b7a9d1" }}>{timeAgo(d.created_at)}</span>
                </div>
                <img src={d.data_url} alt={d.title} style={{ width: "100%", display: "block" }} />
                <div style={{ padding: "10px 12px", display: "flex", alignItems: "center", gap: 10 }}>
                  <button onClick={() => toggleHeart(d)} style={{ border: "none", background: "none", fontSize: 20, cursor: "pointer", transform: hearted ? "scale(1.15)" : "scale(1)", transition: "transform 0.15s" }}>{hearted ? "❤️" : "🤍"}</button>
                  <span style={{ fontSize: 13, color: "#8B7AA8" }}>{d.hearted_by?.length || 0} cheering</span>
                  <span style={{ marginLeft: "auto", fontWeight: 600, color: C.ink, fontSize: 13 }}>{d.title}</span>
                </div>
                <div style={{ padding: "0 12px 12px" }}>
                  <Comments me={me} users={users} drawingId={d.id} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================
// APP SHELL
// ============================================================
export default function App() {
  const [me, setMe] = useState(null);
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [screen, setScreen] = useState("draw");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: true });
      const list = data || [];
      setUsers(list);
      setLoadingUsers(false);
      const savedName = localStorage.getItem("doodle-my-login");
      if (savedName) {
        const found = list.find((u) => u.username === savedName);
        if (found) setMe(found);
      }
    })();
  }, []);

  const handleCreate = async (profile) => {
    const { data: existing } = await supabase.from("profiles").select("username").eq("username", profile.username);
    if (existing && existing.length > 0) return { ok: false, reason: "That name got taken — try another." };
    const { error } = await supabase.from("profiles").insert(profile);
    if (error) return { ok: false, reason: `Couldn't save your profile. (${describeError(error)})` };
    setUsers((prev) => [...prev, profile]);
    localStorage.setItem("doodle-my-login", profile.username);
    setMe(profile);
    return { ok: true };
  };

  const handleLogin = (username) => {
    const found = users.find((u) => u.username === username);
    if (!found) return;
    localStorage.setItem("doodle-my-login", username);
    setMe(found);
  };

  const logout = () => {
    localStorage.removeItem("doodle-my-login");
    setMe(null);
    setScreen("draw");
  };

  const deleteAccount = async (username) => {
    setUsers((prev) => prev.filter((u) => u.username !== username));
    await supabase.from("profiles").delete().eq("username", username); // cascades friends/drawings
  };

  if (!me) {
    return <LoginScreen users={users} loading={loadingUsers} onLogin={handleLogin} onCreate={handleCreate} onDeleteAccount={deleteAccount} />;
  }

  const tabs = [
    { id: "draw", label: "Draw", icon: "🖌️" },
    { id: "gallery", label: "My art", icon: "🖼️" },
    { id: "friends", label: "Friends", icon: "👯" },
    { id: "feed", label: "Feed", icon: "🌈" },
  ];

  return (
    <div style={{ minHeight: "100dvh", background: C.bg }}>
      <div style={{ position: "sticky", top: 0, zIndex: 10, background: "white", borderBottom: "2px solid #F3ECFF", display: "flex", alignItems: "center", padding: "12px 14px", gap: 10 }}>
        <Logo size={20} />
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <AvatarBubble emoji={me.emoji} color={me.color} size={30} />
          <button onClick={logout} style={{ border: "none", background: "none", color: "#b7a9d1", fontSize: 12, cursor: "pointer" }}>switch</button>
        </div>
      </div>

      {screen === "draw" && <DrawScreen me={me} onSaved={() => setRefreshKey((k) => k + 1)} />}
      {screen === "gallery" && <GalleryScreen me={me} refreshKey={refreshKey} users={users} />}
      {screen === "friends" && <FriendsScreen me={me} users={users} />}
      {screen === "feed" && <FeedScreen me={me} users={users} />}

      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "white", borderTop: "2px solid #F3ECFF", display: "flex", padding: "8px 4px", zIndex: 10 }}>
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setScreen(t.id)} style={{ flex: 1, border: "none", background: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "6px 0", cursor: "pointer", color: screen === t.id ? C.purple : "#b7a9d1", fontFamily: "Fredoka, sans-serif", fontWeight: 600, fontSize: 11 }}>
            <span style={{ fontSize: 19 }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
