/* global React, DCSection, DCArtboard */
const { useState } = React;

// ----- Wireframe primitives (low-fi grayscale, annotated) -----

const PHONE_W = 360;
const PHONE_H = 720;

const wfStyles = {
  phone: {
    width: PHONE_W,
    height: PHONE_H,
    background: "#fafafa",
    border: "1.5px solid #2a2a2a",
    borderRadius: 22,
    padding: "14px 14px 18px",
    display: "flex",
    flexDirection: "column",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    color: "#1a1a1a",
    fontSize: 11,
    lineHeight: 1.35,
    overflow: "hidden",
    boxSizing: "border-box",
  },
  notch: {
    width: 80, height: 5, background: "#2a2a2a",
    borderRadius: 3, margin: "0 auto 10px",
  },
  h1: { fontSize: 18, fontWeight: 700, margin: "4px 0 6px", letterSpacing: -0.3 },
  h2: { fontSize: 14, fontWeight: 700, margin: "8px 0 4px" },
  caption: { fontSize: 10, color: "#666", fontStyle: "italic" },
  hr: { border: 0, borderTop: "1px dashed #bbb", margin: "8px 0" },
  pill: {
    display: "inline-flex", alignItems: "center", gap: 4,
    padding: "3px 8px", border: "1px solid #777",
    borderRadius: 999, fontSize: 10, background: "#fff",
  },
  btn: {
    border: "1.5px solid #1a1a1a", background: "#fff",
    padding: "8px 10px", borderRadius: 6, fontSize: 11,
    fontFamily: "inherit", textAlign: "center", fontWeight: 600,
  },
  btnPrimary: {
    border: "1.5px solid #1a1a1a", background: "#1a1a1a", color: "#fff",
    padding: "8px 10px", borderRadius: 6, fontSize: 11,
    fontFamily: "inherit", textAlign: "center", fontWeight: 600,
  },
  btnGhost: {
    border: "1px dashed #777", background: "transparent",
    padding: "6px 10px", borderRadius: 6, fontSize: 10,
    fontFamily: "inherit", textAlign: "center", color: "#444",
  },
  input: {
    border: "1.5px solid #1a1a1a", background: "#fff",
    padding: "8px 10px", borderRadius: 6, fontSize: 12,
    fontFamily: "inherit", letterSpacing: 4, textAlign: "center",
  },
  card: {
    border: "1px solid #999", borderRadius: 8, padding: 8,
    background: "#fff",
  },
  placeholder: {
    border: "1px dashed #999", background: "repeating-linear-gradient(135deg, #f3f3f3 0 6px, #fff 6px 12px)",
    color: "#666", fontSize: 10, textAlign: "center",
    padding: 12, borderRadius: 6,
  },
  annot: {
    position: "absolute", fontSize: 10, color: "#b35900",
    fontStyle: "italic", fontFamily: "ui-monospace, monospace",
  },
};

function Phone({ title, children, footer }) {
  return (
    <div style={wfStyles.phone}>
      <div style={wfStyles.notch} />
      {title && <div style={{ fontSize: 9, color: "#888", textAlign: "center", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>{title}</div>}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, overflow: "hidden" }}>
        {children}
      </div>
      {footer && <div style={{ marginTop: 8 }}>{footer}</div>}
    </div>
  );
}

function Btn({ children, primary, ghost, full, danger, small, style }) {
  const base = primary ? wfStyles.btnPrimary : ghost ? wfStyles.btnGhost : wfStyles.btn;
  return (
    <div style={{
      ...base,
      width: full ? "100%" : undefined,
      padding: small ? "5px 8px" : base.padding,
      fontSize: small ? 10 : base.fontSize,
      borderColor: danger ? "#a33" : base.borderColor || base.border,
      ...(danger && primary ? { background: "#a33" } : {}),
      ...style,
    }}>{children}</div>
  );
}

function Pill({ children, color, style }) {
  return <span style={{ ...wfStyles.pill, borderColor: color || "#777", color: color || "#1a1a1a", ...style }}>{children}</span>;
}

function Box({ children, style, dashed }) {
  return <div style={{ ...wfStyles.card, ...(dashed && { borderStyle: "dashed", borderColor: "#aaa" }), ...style }}>{children}</div>;
}

function Hr() { return <hr style={wfStyles.hr} />; }

function Note({ children }) {
  return <div style={{ fontSize: 9.5, color: "#666", fontStyle: "italic" }}>{children}</div>;
}

function Annotation({ children, style }) {
  return <div style={{ fontSize: 11, color: "#b35900", fontFamily: "ui-monospace, monospace", fontStyle: "italic", padding: "8px 12px", maxWidth: 260, lineHeight: 1.4, ...style }}>↳ {children}</div>;
}

// ============================================================
// HOME / LOBBY
// ============================================================

function HomeWF() {
  return (
    <Phone title="/ — Home">
      <div style={wfStyles.h1}>Boba Game Time!</div>
      <div style={{ fontSize: 11 }}>Welcome, <b>Aisha</b>!</div>
      <div style={{ flex: 1 }} />
      <Btn full primary>Create New Room</Btn>
      <div style={{ textAlign: "center", color: "#888", fontSize: 10 }}>or</div>
      <div style={{ display: "flex", gap: 6 }}>
        <input style={{ ...wfStyles.input, flex: 1 }} placeholder="ABCD" defaultValue="ABCD" readOnly />
      </div>
      <Btn full>Join Room</Btn>
      <div style={{ flex: 1 }} />
      <Note>Theme toggle (☼/☾) floats top-right on every screen.</Note>
    </Phone>
  );
}

function SetUsernameWF() {
  return (
    <Phone title="First-time / set username">
      <div style={wfStyles.h1}>Pick a name</div>
      <Note>Shown once per device — name is stored against the auth UID.</Note>
      <div style={{ flex: 1 }} />
      <input style={{ ...wfStyles.input, letterSpacing: 0, textAlign: "left" }} defaultValue="aisha" readOnly />
      <Btn full primary>Continue</Btn>
      <div style={{ flex: 1 }} />
    </Phone>
  );
}

function LobbyWF({ game = "things-in-rings" }) {
  const games = [
    ["things-in-rings", "Things in Rings", "2+"],
    ["scout", "Scout", "3–5"],
    ["werewords", "Werewords", "4–11"],
    ["order-overload", "Order Overload", "2–6"],
    ["deep-sea", "Deep Sea Adventure", "2–6"],
  ];
  const settingsByGame = {
    "things-in-rings": (
      <>
        <Note>3 rings: Context (red) · Attribute (blue) · Word (green)</Note>
        <div style={{ display: "flex", gap: 4 }}>
          <Btn small full primary>Competitive</Btn>
          <Btn small full>Co-op</Btn>
        </div>
        <Note>Host taps a player to assign Knower badge (K) inline.</Note>
      </>
    ),
    "scout": <Note>Scout: 3–5 players. 4 players — ready!</Note>,
    "werewords": (
      <>
        <Note>Werewords: 4–11 players · {`{N}`} players ready</Note>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10 }}><span>Mayor:</span><span>[Random ▾]</span></div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10 }}><span>Difficulty:</span><span>[Medium ▾]</span></div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10 }}><span>Timer:</span><span>4 min ━━━●━━</span></div>
        <div style={{ fontSize: 10 }}>☑ Limited tokens (36 Y/N · 10 Maybe)</div>
      </>
    ),
    "order-overload": (
      <>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10 }}><span>Deck:</span><span>[Café ▾]</span></div>
        <Note>2–6 players · ready!</Note>
      </>
    ),
    "deep-sea": <Note>Deep Sea: 2–6 players · ready!</Note>,
  };
  return (
    <Phone title={`/lobby/:code — ${game}`}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={wfStyles.h1}>Room: ABCD</div>
        <div style={{ fontSize: 10, color: "#666" }}>4 / 11</div>
      </div>

      <div style={wfStyles.h2}>Players</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        <Pill>Aisha <span style={{ background: "#1a1a1a", color: "#fff", padding: "0 4px", borderRadius: 3, fontSize: 9 }}>Host</span></Pill>
        <Pill>Bo <span style={{ background: "#a33", color: "#fff", padding: "0 4px", borderRadius: 3, fontSize: 9 }}>K</span></Pill>
        <Pill>Cy</Pill>
        <Pill>Devi</Pill>
      </div>

      <div style={wfStyles.h2}>Settings</div>
      <div style={{ fontSize: 10, color: "#666", marginBottom: 2 }}>Game</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
        {games.map(([id, name, p]) => (
          <div key={id} style={{
            border: id === game ? "1.5px solid #1a1a1a" : "1px solid #ccc",
            background: id === game ? "#eee" : "#fff",
            borderRadius: 6, padding: "5px 6px", fontSize: 10,
          }}>
            <div style={{ fontWeight: 600 }}>{name}</div>
            <div style={{ color: "#888", fontSize: 9 }}>{p} players</div>
          </div>
        ))}
      </div>

      <Hr />
      {settingsByGame[game]}

      <div style={{ flex: 1 }} />
      <Btn full primary>Start Game</Btn>
      <Btn full ghost danger>Leave Room</Btn>
    </Phone>
  );
}

// ============================================================
// THINGS IN RINGS
// ============================================================

function VennSketch({ ringLabels = ["context", "attribute", "word"], showLabels, cards = {}, pendingCard, pendingZone }) {
  // 3-ring venn at scaled coords
  const W = 240, H = 200;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 180 }}>
      <circle cx={95} cy={75} r={55} fill="rgba(200,80,80,0.15)" stroke="#c44" strokeWidth={1.5} />
      <circle cx={145} cy={75} r={55} fill="rgba(80,80,200,0.12)" stroke="#44c" strokeWidth={1.5} />
      <circle cx={120} cy={120} r={55} fill="rgba(80,160,80,0.12)" stroke="#393" strokeWidth={1.5} />
      {showLabels && (
        <>
          <text x={50} y={28} fontSize={9} fill="#c44" fontFamily="monospace">Context: {ringLabels[0]}</text>
          <text x={140} y={28} fontSize={9} fill="#44c" fontFamily="monospace">Attribute: {ringLabels[1]}</text>
          <text x={75} y={195} fontSize={9} fill="#393" fontFamily="monospace">Word: {ringLabels[2]}</text>
        </>
      )}
      {/* Sample played cards */}
      {Object.entries(cards).map(([pos, label], i) => {
        const [cx, cy] = pos.split(",").map(Number);
        return (
          <foreignObject key={i} x={cx - 25} y={cy - 8} width={50} height={16}>
            <div style={{ background: "#fff", border: "1px solid #777", borderRadius: 3, fontSize: 8, textAlign: "center", padding: "1px 2px", fontFamily: "monospace" }}>{label}</div>
          </foreignObject>
        );
      })}
      {pendingCard && pendingZone && (
        <foreignObject x={pendingZone[0] - 28} y={pendingZone[1] - 8} width={56} height={16}>
          <div style={{ background: "#fffbe5", border: "1.5px dashed #b35900", borderRadius: 3, fontSize: 8, textAlign: "center", padding: "1px 2px", fontFamily: "monospace", color: "#b35900" }}>{pendingCard}</div>
        </foreignObject>
      )}
    </svg>
  );
}

function TIRKnowerSetupWF() {
  return (
    <Phone title="TIR · Knower setup">
      <div style={wfStyles.h2}>Things in Rings · You're the Knower</div>
      <Note>Pick 3 cards from the deck and assign each ring a secret rule.</Note>
      <VennSketch ringLabels={["?", "?", "?"]} showLabels />
      <div style={{ fontSize: 10, fontWeight: 600 }}>Ring rules</div>
      <Box><span style={{ color: "#c44" }}>Context:</span> <input defaultValue="found in nature" style={{ width: "70%", border: "1px solid #ccc", padding: "2px 4px", fontFamily: "inherit", fontSize: 10 }} readOnly /></Box>
      <Box><span style={{ color: "#44c" }}>Attribute:</span> <input defaultValue="is round" style={{ width: "75%", border: "1px solid #ccc", padding: "2px 4px", fontFamily: "inherit", fontSize: 10 }} readOnly /></Box>
      <Box><span style={{ color: "#393" }}>Word:</span> <input defaultValue="2 syllables" style={{ width: "75%", border: "1px solid #ccc", padding: "2px 4px", fontFamily: "inherit", fontSize: 10 }} readOnly /></Box>
      <div style={{ flex: 1 }} />
      <Btn full primary>Lock rules & deal cards</Btn>
    </Phone>
  );
}

function TIRPlayerTurnWF() {
  return (
    <Phone title="TIR · Player turn">
      <div style={wfStyles.h2}>Things in Rings</div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", fontSize: 9 }}>
        <Pill style={{ background: "#1a1a1a", color: "#fff" }}>● Aisha (you) 5</Pill>
        <Pill>Bo K · 0</Pill>
        <Pill>Cy · 4</Pill>
        <Pill>Devi · 5</Pill>
      </div>
      <Box style={{ background: "#eef7ee", borderColor: "#393" }}>
        Your turn — select a card, then tap a zone.
      </Box>
      <VennSketch
        showLabels={false}
        cards={{ "70,75": "apple", "170,75": "stone", "120,150": "moon" }}
        pendingCard="orange"
        pendingZone={[120, 95]}
      />
      <div style={{ fontSize: 10, fontWeight: 600 }}>Your hand (5)</div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {["orange", "river", "echo", "cloud", "thunder"].map(c => (
          <span key={c} style={{
            border: c === "orange" ? "2px solid #1a1a1a" : "1px solid #aaa",
            background: c === "orange" ? "#fffbe5" : "#fff",
            padding: "3px 6px", borderRadius: 4, fontSize: 10,
          }}>{c}</span>
        ))}
      </div>
      <Note>Outside the rings = "None" zone (background tap target).</Note>
    </Phone>
  );
}

function TIRKnowerJudgeWF() {
  return (
    <Phone title="TIR · Knower judging">
      <div style={wfStyles.h2}>Knower's view (you)</div>
      <Box style={{ background: "#fffbe5", borderColor: "#b35900" }}>
        Cy placed <b>orange</b> in <b>Context ∩ Attribute</b>. Correct?
      </Box>
      <VennSketch
        showLabels
        ringLabels={["found in nature", "is round", "2 syllables"]}
        cards={{ "70,75": "apple", "170,75": "stone", "120,150": "moon" }}
        pendingCard="orange"
        pendingZone={[120, 75]}
      />
      <Note>Only the Knower sees the rule labels.</Note>
      <div style={{ flex: 1 }} />
      <div style={{ display: "flex", gap: 6 }}>
        <Btn full primary>✓ Correct</Btn>
        <Btn full danger>✗ Wrong (move + draw)</Btn>
      </div>
    </Phone>
  );
}

function TIRGameOverWF() {
  return (
    <Phone title="TIR · Game over">
      <div style={wfStyles.h1}>🏆 Cy wins!</div>
      <Note>First player to empty their hand. Co-op mode shows "team won/lost".</Note>
      <Box>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>Final hand counts</div>
        {[["Aisha", 2], ["Bo", "K"], ["Cy", 0], ["Devi", 3]].map(([n, c]) => (
          <div key={n} style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
            <span>{n}</span><span>{c} cards</span>
          </div>
        ))}
      </Box>
      <VennSketch showLabels ringLabels={["found in nature", "is round", "2 syllables"]} />
      <div style={{ flex: 1 }} />
      <Btn full primary>Play again (back to lobby)</Btn>
      <Btn full ghost>Leave</Btn>
    </Phone>
  );
}

// ============================================================
// SCOUT
// ============================================================

function ScoutCard({ top, bottom, hi, sm }) {
  return (
    <div style={{
      width: sm ? 22 : 28, height: sm ? 32 : 40,
      border: hi ? "2px solid #1a1a1a" : "1px solid #777",
      borderRadius: 4, background: "#fff",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between",
      padding: "2px 0", fontSize: sm ? 10 : 12, fontWeight: 700, fontFamily: "monospace",
    }}>
      <span>{top}</span>
      <span style={{ borderTop: "1px dashed #aaa", width: "70%" }} />
      <span style={{ transform: "rotate(180deg)" }}>{bottom}</span>
    </div>
  );
}

function ScoutSetupWF() {
  return (
    <Phone title="Scout · Hand setup">
      <div style={wfStyles.h2}>Round 1 — Choose orientation</div>
      <Note>Flip your whole hand once before the round starts. Numbers swap top/bottom and order reverses.</Note>
      <div style={{ display: "flex", gap: 4 }}>
        <Btn small full primary>Normal</Btn>
        <Btn small full>Flipped</Btn>
      </div>
      <Box style={{ overflowX: "auto" }}>
        <div style={{ display: "flex", gap: 3, justifyContent: "center" }}>
          {[[3,7],[7,5],[5,2],[2,8],[8,1],[1,9],[9,4]].map(([t,b],i) => <ScoutCard key={i} top={t} bottom={b} />)}
        </div>
      </Box>
      <div style={{ flex: 1 }} />
      <Btn full primary>Confirm Hand</Btn>
      <Note>Waits on others — see avatars below until everyone confirms.</Note>
    </Phone>
  );
}

function ScoutTurnWF() {
  return (
    <Phone title="Scout · Player turn">
      <div style={wfStyles.h2}>Round 1</div>
      <Note>Bo played a 2-card match.</Note>
      <Box style={{ background: "#eef7ee", borderColor: "#393" }}>Your turn!</Box>

      {/* Center pile */}
      <div style={{ fontSize: 10, color: "#666" }}>Center pile · 2-card match · by Bo</div>
      <Box style={{ display: "flex", gap: 4, justifyContent: "center", alignItems: "center" }}>
        <Btn small ghost>Take ↤</Btn>
        <ScoutCard top={5} bottom={3} />
        <ScoutCard top={5} bottom={7} />
        <Btn small ghost>Take ↦</Btn>
      </Box>

      <div style={{ fontSize: 10, fontWeight: 600 }}>Your hand</div>
      <div style={{ display: "flex", gap: 3, justifyContent: "center", overflowX: "auto" }}>
        {[[3,7],[6,5,true],[6,2,true],[2,8],[1,9],[9,4]].map(([t,b,hi],i) => <ScoutCard key={i} top={t} bottom={b} hi={hi} />)}
      </div>
      <Note>Tap consecutive cards to select; "+" slots appear between cards in scout mode.</Note>

      <div style={{ display: "flex", gap: 4 }}>
        <Btn small full primary>Play</Btn>
        <Btn small full>Scout</Btn>
        <Btn small full>Scout + Show</Btn>
      </div>

      <Box style={{ fontSize: 10 }}>
        <div style={{ fontWeight: 600 }}>Players</div>
        <div>● Aisha (you) — 6 cards · S&S · 0 / 0 · 0 pts</div>
        <div>Bo — 5 cards · S&S · 1 / 0 · 0 pts</div>
        <div>Cy — 6 cards · --- · 0 / 1 · 0 pts</div>
      </Box>
    </Phone>
  );
}

function ScoutRoundEndWF() {
  return (
    <Phone title="Scout · Round end">
      <div style={wfStyles.h1}>Round 1 Complete</div>
      <Note>Cy emptied their hand! (other reason: uncontested)</Note>
      <div style={wfStyles.h2}>Round Scores</div>
      {[
        ["Aisha", 1, 0, "-3 hand", -2],
        ["Bo", 2, 1, "-2 hand", 1],
        ["Cy", 4, 0, "-0 hand", 4],
        ["Devi", 0, 2, "-4 hand", -2],
      ].map(([n,cap,tok,pen,r]) => (
        <Box key={n}>
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600 }}>
            <span>{n}</span><span>= {r}</span>
          </div>
          <div style={{ fontSize: 9, color: "#666" }}>+{cap} captured · +{tok} tokens · {pen}</div>
        </Box>
      ))}
      <div style={{ flex: 1 }} />
      <Btn full primary>Next Round</Btn>
      <Note>Host-only — others see "Waiting for host…"</Note>
    </Phone>
  );
}

// ============================================================
// WEREWORDS
// ============================================================

function WWRoleRevealWF() {
  return (
    <Phone title="Werewords · Role reveal">
      <div style={wfStyles.h2}>Your secret role</div>
      <Box style={{ borderColor: "#c44", borderWidth: 2, textAlign: "center", padding: 18 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#c44" }}>WEREWOLF</div>
        <div style={{ fontSize: 10, marginTop: 6, color: "#666" }}>Fellow werewolves: <b>Cy</b></div>
      </Box>
      <Note>Other roles: Seer (sees magic word), Villager. Mayor sees a separate banner.</Note>
      <div style={{ flex: 1 }} />
      <Btn full primary>I've seen my role</Btn>
      <Box dashed>
        <div style={{ fontSize: 10, fontWeight: 600 }}>Waiting for…</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
          <Pill>Aisha</Pill><Pill>Devi</Pill>
        </div>
      </Box>
    </Phone>
  );
}

function WWWordSetupWF() {
  return (
    <Phone title="Werewords · Word setup (Mayor)">
      <div style={wfStyles.h2}>Choose the magic word</div>
      <Pill style={{ background: "#1a1a1a", color: "#fff" }}>You: Mayor</Pill>
      <Note>Pick one for the village to guess. Difficulty was set in lobby.</Note>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, justifyContent: "center" }}>
        {["volcano", "telescope", "marathon", "lighthouse"].map(w => (
          <Btn key={w} full>{w}</Btn>
        ))}
      </div>
      <Note>Non-mayors see "{`{Mayor}`} is choosing…"</Note>
    </Phone>
  );
}

function WWMayorPlayWF() {
  const guesses = [
    ["Aisha", ["yes", "no", "no"]],
    ["Cy (🐺)", ["maybe", "no"]],
    ["Devi", ["no"]],
  ];
  const colorMap = { yes: "#393", no: "#c44", maybe: "#b35900", "so-close": "#06b" };
  return (
    <Phone title="Werewords · Mayor view">
      <div style={wfStyles.h2}>Mayor's view (you)</div>
      <Box style={{ textAlign: "center" }}>
        Magic word: <b>volcano</b>
        <div style={{ fontSize: 14, marginTop: 4, color: "#c44" }}>3:24</div>
      </Box>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", fontSize: 10 }}>
        <span style={{ color: "#393" }}>Yes/No: 27</span>
        <span style={{ color: "#b35900" }}>Maybe: 8</span>
      </div>
      {guesses.map(([n, gs]) => (
        <Box key={n} style={{ padding: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontWeight: 600, fontSize: 11 }}>{n}</span>
            <span style={{ display: "flex", gap: 2 }}>
              {gs.map((g, i) => <span key={i} style={{ background: colorMap[g], color: "#fff", padding: "1px 4px", borderRadius: 3, fontSize: 9 }}>{g}</span>)}
            </span>
          </div>
          <div style={{ display: "flex", gap: 3, marginTop: 4, flexWrap: "wrap" }}>
            <Btn small style={{ background: "#393", color: "#fff", border: 0 }}>Yes</Btn>
            <Btn small style={{ background: "#c44", color: "#fff", border: 0 }}>No</Btn>
            <Btn small style={{ background: "#b35900", color: "#fff", border: 0 }}>Maybe</Btn>
            <Btn small style={{ background: "#06b", color: "#fff", border: 0 }}>So Close</Btn>
            <Btn small primary>✓ Correct!</Btn>
          </div>
        </Box>
      ))}
      <div style={{ display: "flex", gap: 6 }}>
        <Btn full small>Way Off</Btn>
        <Btn full small danger>Nobody got it</Btn>
      </div>
    </Phone>
  );
}

function WWPlayerPlayWF() {
  return (
    <Phone title="Werewords · Player view">
      <div style={wfStyles.h2}>Werewords</div>
      <Pill style={{ background: "#393", color: "#fff" }}>Your role: Seer</Pill>
      <Box style={{ textAlign: "center" }}>
        <div><b>Aisha</b> is answering your questions.</div>
        <div style={{ fontSize: 10, marginTop: 4 }}>Magic word (Seer/Werewolf only): <b>volcano</b></div>
        <div style={{ fontSize: 14, marginTop: 4 }}>3:18</div>
      </Box>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", fontSize: 10 }}>
        <span style={{ color: "#393" }}>Y/N: 27</span><span style={{ color: "#b35900" }}>Maybe: 8</span>
      </div>
      <Box style={{ padding: 6 }}>
        <div style={{ fontWeight: 600, fontSize: 11, marginBottom: 4 }}>Live response feed</div>
        <div style={{ fontSize: 10 }}>Aisha → <span style={{ color: "#393" }}>yes</span>, <span style={{ color: "#c44" }}>no</span>, <span style={{ color: "#c44" }}>no</span></div>
        <div style={{ fontSize: 10 }}>Cy → <span style={{ color: "#b35900" }}>maybe</span>, <span style={{ color: "#c44" }}>no</span></div>
        <div style={{ fontSize: 10 }}>Devi → <span style={{ color: "#c44" }}>no</span></div>
      </Box>
      <Note>Players ask yes/no questions verbally — no typing.</Note>
    </Phone>
  );
}

function WWWerewolfGuessWF() {
  return (
    <Phone title="Werewords · Werewolf guess">
      <div style={wfStyles.h2}>Identify the Seer</div>
      <Pill style={{ background: "#c44", color: "#fff" }}>Werewolf</Pill>
      <Note>The village guessed correctly — but if you (werewolf) finger the Seer, you steal the win.</Note>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, justifyContent: "center" }}>
        {["Aisha (Mayor)", "Bo", "Devi"].map(n => <Btn key={n} full>{n}</Btn>)}
      </div>
      <Note>Non-werewolves see "{`{wolf}`} is identifying the Seer…"</Note>
    </Phone>
  );
}

function WWVoteWF() {
  return (
    <Phone title="Werewords · Vote">
      <div style={wfStyles.h2}>Vote for a werewolf</div>
      <Note>Time ran out. Village votes — if they hit a wolf, village wins.</Note>
      <Box>Magic word was: <b>volcano</b></Box>
      <Box style={{ background: "#eef7ee" }}>Votes: 2 / 4</Box>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, justifyContent: "center" }}>
        {["Bo", "Cy", "Devi"].map(n => <Btn key={n} full>{n}</Btn>)}
      </div>
    </Phone>
  );
}

function WWGameOverWF() {
  return (
    <Phone title="Werewords · Game over">
      <div style={wfStyles.h1}>🏆 Werewolves win!</div>
      <Note>Win reason text (e.g. "Wolves named the Seer").</Note>
      <Box>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>Roles revealed</div>
        <div>Aisha — Villager (Mayor)</div>
        <div style={{ color: "#393" }}>Bo — Seer</div>
        <div style={{ color: "#c44" }}>Cy — Werewolf</div>
        <div style={{ color: "#c44" }}>Devi — Werewolf</div>
      </Box>
      <div style={{ flex: 1 }} />
      <Btn full primary>Back to lobby</Btn>
    </Phone>
  );
}

// ============================================================
// ORDER OVERLOAD
// ============================================================

function OOReadingWF({ taker }) {
  return (
    <Phone title={taker ? "OO · Reading (you read)" : "OO · Reading (others)"}>
      <div style={wfStyles.h1}>Level 3 ★★</div>
      {taker ? (
        <>
          <Note>You're the Order Taker. Read each order out loud.</Note>
          <div style={{ fontSize: 10, color: "#666" }}>Order 4 of 12</div>
          <Box style={{ background: "#fffbe5", borderColor: "#b35900", textAlign: "center", padding: 18 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Iced taro latte, less ice</div>
          </Box>
          <div style={{ flex: 1 }} />
          <Btn full primary>Next Order →</Btn>
        </>
      ) : (
        <>
          <div style={{ fontSize: 11 }}><b>Aisha</b> is reading orders…</div>
          <div style={{ fontSize: 10, color: "#666" }}>4 / 12 read</div>
          <div style={{ height: 8, background: "#eee", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ width: "33%", height: "100%", background: "#1a1a1a" }} />
          </div>
          <Note>You'll get cards (orders) when reading is done.</Note>
        </>
      )}
    </Phone>
  );
}

function OOPlayingWF() {
  return (
    <Phone title="OO · Playing (your turn)">
      <div style={wfStyles.h2}>Level 3 ★★</div>
      <Box style={{ background: "#eef7ee" }}>Your turn!</Box>
      <Box style={{ background: "#f5f0ff" }}>
        <div style={{ fontSize: 10, color: "#666" }}>Hints (revealed via abilities)</div>
        <div style={{ fontSize: 10 }}>Bo's first letters: I, M</div>
      </Box>
      <Btn small ghost>Use ability: Reveal first letters</Btn>
      <div style={{ fontSize: 10, fontWeight: 600 }}>Guess an order</div>
      <div style={{ display: "flex", gap: 4 }}>
        <input style={{ flex: 1, border: "1px solid #1a1a1a", borderRadius: 6, padding: "6px 8px", fontFamily: "inherit", fontSize: 11 }} defaultValue="Iced taro latte" readOnly />
        <Btn small primary>Guess</Btn>
      </div>
      <div style={{ fontSize: 10, fontWeight: 600 }}>Your hand:</div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {["Mango sago", "Iced matcha", "Boba milk tea"].map(c => <Pill key={c}>{c}</Pill>)}
      </div>
      <Box style={{ fontSize: 10 }}>
        <div style={{ fontWeight: 600 }}>Players</div>
        <div>:) Aisha (you) — 3 cards</div>
        <div>:) Bo — 4 cards · Judging…</div>
        <div>:) Cy — ✓ done</div>
        <div style={{ opacity: 0.5 }}>x_x Devi — 0 cards</div>
      </Box>
    </Phone>
  );
}

function OORespondWF() {
  return (
    <Phone title="OO · Responding to a guess">
      <div style={wfStyles.h2}>Level 3 ★★</div>
      <Box style={{ background: "#fffbe5", borderColor: "#b35900" }}>
        <div style={{ fontSize: 10 }}>Aisha guessed:</div>
        <div style={{ fontSize: 14, fontWeight: 700, textAlign: "center", margin: "4px 0" }}>"Iced taro latte"</div>
        <div style={{ fontSize: 10, fontWeight: 600 }}>Do you have this order?</div>
        <div style={{ fontSize: 10, color: "#666" }}>Your hand: Iced taro latte, Mango sago, Boba milk tea</div>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
          <span style={{ border: "2px solid #1a1a1a", borderRadius: 4, padding: "2px 6px", fontSize: 10 }}>Iced taro latte</span>
          <Pill>Mango sago</Pill>
          <Pill>Boba milk tea</Pill>
        </div>
        <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
          <Btn full small primary>Reveal "Iced taro latte"</Btn>
          <Btn full small danger>I don't have it</Btn>
        </div>
      </Box>
      <Note>If nobody has it, the guesser is eliminated this level.</Note>
    </Phone>
  );
}

function OOLevelCompleteWF() {
  return (
    <Phone title="OO · Level complete">
      <div style={wfStyles.h1}>Level 3 Passed!</div>
      <div style={{ fontSize: 22, textAlign: "center" }}>★★</div>
      <Note>Confetti animates on pass. On fail: "All players eliminated. Try again?"</Note>
      <div style={{ flex: 1 }} />
      <Btn full primary>Continue to Level 4</Btn>
      <Btn full ghost danger>End Game</Btn>
      <Note>Host-only buttons.</Note>
    </Phone>
  );
}

// ============================================================
// DEEP SEA
// ============================================================

function DSBoardSketch() {
  // Simplified spiral: sub at center, treasures around
  const cells = [
    { r: 2, c: 0, t: "1" }, { r: 2, c: 1, t: "1" }, { r: 2, c: 2, t: "1" },
    { r: 1, c: 2, t: "2" }, { r: 0, c: 2, t: "2" }, { r: 0, c: 1, t: "2" },
    { r: 0, c: 0, t: "3" }, { r: 1, c: 0, t: "3" }, { r: 1, c: 1, t: "sub" },
  ];
  const shape = (t) => t === "1" ? "○" : t === "2" ? "□" : t === "3" ? "△" : "🚢";
  const bg = (t) => t === "1" ? "#fffbe5" : t === "2" ? "#e5f3ff" : t === "3" ? "#ffe5e5" : "#1a1a1a";
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2, padding: 4, background: "#eee", borderRadius: 8 }}>
      {[...Array(9)].map((_, i) => {
        const c = cells.find(c => c.r * 3 + c.c === i);
        if (!c) return <div key={i} />;
        return (
          <div key={i} style={{
            aspectRatio: "1", background: bg(c.t), color: c.t === "sub" ? "#fff" : "#222",
            borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center",
            position: "relative", fontSize: 14,
          }}>
            <span>{shape(c.t)}</span>
            {/* Diver tokens */}
            {i === 4 && (
              <span style={{ position: "absolute", top: 2, left: 2, width: 12, height: 12, borderRadius: "50%", background: "#3b82f6", fontSize: 8, color: "#fff", textAlign: "center", lineHeight: "12px" }}>A</span>
            )}
            {i === 1 && (
              <span style={{ position: "absolute", bottom: 2, right: 2, width: 12, height: 12, borderRadius: "50%", background: "#ef4444", fontSize: 8, color: "#fff", textAlign: "center", lineHeight: "12px" }}>B</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function AirGaugeSketch({ pct = 0.6 }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <span style={{ fontSize: 10 }}>AIR</span>
      <div style={{ flex: 1, height: 8, border: "1px solid #1a1a1a", borderRadius: 4, overflow: "hidden", background: "#fff" }}>
        <div style={{ width: `${pct * 100}%`, height: "100%", background: pct > 0.3 ? "#3b82f6" : "#c44" }} />
      </div>
      <span style={{ fontSize: 10, fontFamily: "monospace" }}>{Math.round(pct * 25)}/25</span>
    </div>
  );
}

function DSDeclareWF() {
  return (
    <Phone title="DS · Declaring direction">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={wfStyles.h2}>Round 1 of 3</div>
      </div>
      <AirGaugeSketch pct={0.7} />
      <DSBoardSketch />
      <Box style={{ background: "#eef7ee" }}>
        <div style={{ fontWeight: 600 }}>Your turn — direction?</div>
        <div style={{ fontSize: 10, color: "#666" }}>Carrying 2 treasures</div>
        <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
          <Btn full small>↓ Keep diving</Btn>
          <Btn full small danger>↑ Turn back</Btn>
        </div>
      </Box>
      <Box style={{ fontSize: 10 }}>
        <div style={{ fontWeight: 600 }}>Divers</div>
        <div>● Aisha (you) — ↓ diving — ○ □</div>
        <div>● Bo — ↑ returning — △</div>
        <div style={{ opacity: 0.5 }}>● Cy — ✓ returned</div>
      </Box>
    </Phone>
  );
}

function DSRollWF() {
  return (
    <Phone title="DS · Rolling + treasure action">
      <div style={wfStyles.h2}>Round 2 of 3</div>
      <AirGaugeSketch pct={0.4} />
      <DSBoardSketch />
      <Box style={{ background: "#eef7ee", textAlign: "center" }}>
        <div style={{ fontSize: 10, color: "#666" }}>Dice (1-3, 1-3) minus carried (2)</div>
        <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "monospace" }}>⚀ + ⚂ − 2 = 2</div>
        <Btn small primary>🎲 Roll</Btn>
      </Box>
      <Box>
        <div style={{ fontSize: 10 }}>You landed on: <b>○ (level 1)</b></div>
        <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
          <Btn small full>Pick up ○</Btn>
          <Btn small full danger>Drop △</Btn>
          <Btn small full ghost>Do nothing</Btn>
        </div>
      </Box>
      <Note>Drop only on blank cells; pickup only on treasure/stack cells.</Note>
    </Phone>
  );
}

function DSRoundEndWF() {
  return (
    <Phone title="DS · Round end">
      <div style={wfStyles.h1}>Round 1 Complete!</div>
      <AirGaugeSketch pct={0} />
      <div style={{ color: "#c44", fontWeight: 600, fontSize: 11, textAlign: "center" }}>The air ran out!</div>

      <div style={{ fontSize: 11, fontWeight: 600 }}>Made it back!</div>
      <Box style={{ background: "#eef7ee" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600 }}><span>Aisha</span><span>9 pts</span></div>
        <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
          <Pill style={{ background: "#fffbe5" }}>○ 2</Pill>
          <Pill style={{ background: "#e5f3ff" }}>□ 3</Pill>
          <Pill style={{ background: "#ffe5e5" }}>△ 4</Pill>
        </div>
      </Box>
      <div style={{ fontSize: 11, fontWeight: 600 }}>Lost at sea!</div>
      <Box style={{ background: "#fff5f5" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600 }}><span>Bo</span><span>0 pts</span></div>
        <div style={{ display: "flex", gap: 4, marginTop: 4, opacity: 0.5 }}>
          <Pill>△</Pill><Pill>△</Pill>
        </div>
      </Box>
      <div style={{ flex: 1 }} />
      <Btn full primary>Start Round 2</Btn>
    </Phone>
  );
}

// ============================================================
// CANVAS COMPOSITION
// ============================================================

function App() {
  return (
    <div style={{ background: "#f0eee8" }}>
      <design-canvas-react>
        <DCSection id="meta" title="0 · Meta · Auth & lobby">
          <DCArtboard id="set-username" label="Set username" width={PHONE_W + 28} height={PHONE_H + 28}>
            <SetUsernameWF />
          </DCArtboard>
          <DCArtboard id="home" label="Home" width={PHONE_W + 28} height={PHONE_H + 28}>
            <HomeWF />
          </DCArtboard>
          <DCArtboard id="lobby-tir" label="Lobby — Things in Rings" width={PHONE_W + 28} height={PHONE_H + 28}>
            <LobbyWF game="things-in-rings" />
          </DCArtboard>
          <DCArtboard id="lobby-ww" label="Lobby — Werewords" width={PHONE_W + 28} height={PHONE_H + 28}>
            <LobbyWF game="werewords" />
          </DCArtboard>
          <DCArtboard id="lobby-oo" label="Lobby — Order Overload" width={PHONE_W + 28} height={PHONE_H + 28}>
            <LobbyWF game="order-overload" />
          </DCArtboard>
        </DCSection>

        <DCSection id="tir" title="1 · Things in Rings · /game/:code">
          <DCArtboard id="tir-knower-setup" label="Knower setup" width={PHONE_W + 28} height={PHONE_H + 28}>
            <TIRKnowerSetupWF />
          </DCArtboard>
          <DCArtboard id="tir-player-turn" label="Player turn" width={PHONE_W + 28} height={PHONE_H + 28}>
            <TIRPlayerTurnWF />
          </DCArtboard>
          <DCArtboard id="tir-knower-judge" label="Knower judging" width={PHONE_W + 28} height={PHONE_H + 28}>
            <TIRKnowerJudgeWF />
          </DCArtboard>
          <DCArtboard id="tir-game-over" label="Game over (no round-end)" width={PHONE_W + 28} height={PHONE_H + 28}>
            <TIRGameOverWF />
          </DCArtboard>
        </DCSection>

        <DCSection id="scout" title="2 · Scout · /game/:code">
          <DCArtboard id="scout-setup" label="Hand setup (per round)" width={PHONE_W + 28} height={PHONE_H + 28}>
            <ScoutSetupWF />
          </DCArtboard>
          <DCArtboard id="scout-turn" label="Player turn" width={PHONE_W + 28} height={PHONE_H + 28}>
            <ScoutTurnWF />
          </DCArtboard>
          <DCArtboard id="scout-round-end" label="Round end" width={PHONE_W + 28} height={PHONE_H + 28}>
            <ScoutRoundEndWF />
          </DCArtboard>
        </DCSection>

        <DCSection id="werewords" title="3 · Werewords · /game/:code">
          <DCArtboard id="ww-role" label="Role reveal" width={PHONE_W + 28} height={PHONE_H + 28}>
            <WWRoleRevealWF />
          </DCArtboard>
          <DCArtboard id="ww-word-setup" label="Word setup (Mayor)" width={PHONE_W + 28} height={PHONE_H + 28}>
            <WWWordSetupWF />
          </DCArtboard>
          <DCArtboard id="ww-mayor" label="Gameplay — Mayor" width={PHONE_W + 28} height={PHONE_H + 28}>
            <WWMayorPlayWF />
          </DCArtboard>
          <DCArtboard id="ww-player" label="Gameplay — Player" width={PHONE_W + 28} height={PHONE_H + 28}>
            <WWPlayerPlayWF />
          </DCArtboard>
          <DCArtboard id="ww-werewolf-guess" label="Werewolf guess" width={PHONE_W + 28} height={PHONE_H + 28}>
            <WWWerewolfGuessWF />
          </DCArtboard>
          <DCArtboard id="ww-vote" label="Vote (timeout)" width={PHONE_W + 28} height={PHONE_H + 28}>
            <WWVoteWF />
          </DCArtboard>
          <DCArtboard id="ww-game-over" label="Game over" width={PHONE_W + 28} height={PHONE_H + 28}>
            <WWGameOverWF />
          </DCArtboard>
        </DCSection>

        <DCSection id="order" title="4 · Order Overload · /game/:code">
          <DCArtboard id="oo-reading-taker" label="Reading — Order Taker" width={PHONE_W + 28} height={PHONE_H + 28}>
            <OOReadingWF taker />
          </DCArtboard>
          <DCArtboard id="oo-reading-others" label="Reading — Others" width={PHONE_W + 28} height={PHONE_H + 28}>
            <OOReadingWF taker={false} />
          </DCArtboard>
          <DCArtboard id="oo-playing" label="Playing — your turn" width={PHONE_W + 28} height={PHONE_H + 28}>
            <OOPlayingWF />
          </DCArtboard>
          <DCArtboard id="oo-respond" label="Playing — responding" width={PHONE_W + 28} height={PHONE_H + 28}>
            <OORespondWF />
          </DCArtboard>
          <DCArtboard id="oo-level" label="Level complete" width={PHONE_W + 28} height={PHONE_H + 28}>
            <OOLevelCompleteWF />
          </DCArtboard>
        </DCSection>

        <DCSection id="deepsea" title="5 · Deep Sea Adventure · /game/:code">
          <DCArtboard id="ds-declare" label="Declaring direction" width={PHONE_W + 28} height={PHONE_H + 28}>
            <DSDeclareWF />
          </DCArtboard>
          <DCArtboard id="ds-roll" label="Rolling + treasure action" width={PHONE_W + 28} height={PHONE_H + 28}>
            <DSRollWF />
          </DCArtboard>
          <DCArtboard id="ds-round-end" label="Round end" width={PHONE_W + 28} height={PHONE_H + 28}>
            <DSRoundEndWF />
          </DCArtboard>
        </DCSection>
      </design-canvas-react>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
