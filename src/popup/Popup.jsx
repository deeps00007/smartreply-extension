import React, { useState, useEffect } from "react"
import { createRoot } from "react-dom/client"

/* ── Inline SVG Icons (16×16) ── */
const Icon = ({ d, color = "currentColor", size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)

const icons = {
  gmail: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EA4335" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M22 4L12 13L2 4" />
    </svg>
  ),
  whatsapp: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#25D366" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  ),
  reddit: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FF4500" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="14" r="8" />
      <path d="M12 6V2" />
      <path d="M12 6l4-2" />
      <circle cx="9" cy="13" r="1" fill="#FF4500" />
      <circle cx="15" cy="13" r="1" fill="#FF4500" />
      <path d="M9 17c1.5 1 4.5 1 6 0" />
    </svg>
  ),
  twitter: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1DA1F2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4l11.7 16h4.3L8.3 4H4z" />
      <path d="M4 20l6.8-8" />
      <path d="M20 4l-6.8 8" />
    </svg>
  ),
  linkedin: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0A66C2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  ),
  youtube: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FF0000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="4" />
      <polygon points="10,8 16,12 10,16" fill="#FF0000" stroke="none" />
    </svg>
  ),
}

const sites = [
  { name: "Gmail", icon: icons.gmail },
  { name: "WhatsApp", icon: icons.whatsapp },
  { name: "Reddit", icon: icons.reddit },
  { name: "Twitter/X", icon: icons.twitter },
  { name: "LinkedIn", icon: icons.linkedin },
  { name: "YouTube", icon: icons.youtube },
]

const logoSvg = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    <path d="M8 10h8" />
    <path d="M8 14h4" />
  </svg>
)

function Popup() {
  const [enabled, setEnabled] = useState(true)

  const defaultPtt = { code: "F5", key: "F5", ctrl: false, alt: false, shift: false, meta: false }
  const [ptt, setPtt] = useState(defaultPtt)
  const [recording, setRecording] = useState(false)
  const [apiKeyInput, setApiKeyInput] = useState("")
  const [savedKeyExists, setSavedKeyExists] = useState(false)

  useEffect(() => {
    chrome.storage.local.get(["smartreply_enabled", "smartreply_ptt", "smartreply_api_key"], (res) => {
      setEnabled(res.smartreply_enabled !== false)
      if (res.smartreply_ptt) setPtt(res.smartreply_ptt)
      const key = res.smartreply_api_key || ""
      setSavedKeyExists(!!key)
      setApiKeyInput(key)
    })
  }, [])

  useEffect(() => {
    if (!recording) return;

    const handleKeyDown = (e) => {
      e.preventDefault();
      e.stopPropagation();
      // Ignore if ONLY a modifier is pressed (wait for the actual key)
      if (['Control', 'Shift', 'Alt', 'Meta', 'AltGraph'].includes(e.key)) return;

      const newPtt = {
        code: e.code,
        key: e.key,
        ctrl: e.ctrlKey,
        alt: e.altKey,
        shift: e.shiftKey,
        meta: e.metaKey
      };
      
      setPtt(newPtt);
      chrome.storage.local.set({ smartreply_ptt: newPtt });
      setRecording(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [recording]);

  const toggle = () => {
    const next = !enabled
    setEnabled(next)
    chrome.storage.local.set({ smartreply_enabled: next })
  }

  const formatPtt = (p) => {
    if (!p) return "";
    let parts = [];
    if (p.ctrl) parts.push("Ctrl");
    if (p.alt) parts.push("Alt");
    if (p.shift) parts.push("Shift");
    if (p.meta) parts.push("Win/Cmd");
    
    let k = p.key;
    if (!k) k = p.code;
    if (k && k.length === 1) k = k.toUpperCase();
    if (k === " ") k = "Space";
    parts.push(k);
    return parts.join(" + ");
  }

  return (
    <div style={styles.root}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.logoBox}>{logoSvg}</div>
          <div>
            <div style={styles.title}>SmartReply AI</div>
            <div style={styles.subtitle}>AI Reply & Voice Assistant</div>
          </div>
        </div>
        <div onClick={toggle} style={{ ...styles.toggle, background: enabled ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.15)" }}>
          <div style={{ ...styles.toggleThumb, transform: enabled ? "translateX(18px)" : "translateX(2px)" }} />
        </div>
      </div>

      {/* Status */}
      <div style={{ ...styles.statusBadge, background: enabled ? "#f0fdf4" : "#fef2f2", color: enabled ? "#16a34a" : "#dc2626" }}>
        <span style={{ fontSize: 8, marginRight: 6 }}>{enabled ? "●" : "●"}</span>
        {enabled ? "Extension is Active" : "Extension is Disabled"}
      </div>

      {/* Supported sites */}
      <div style={styles.sectionTitle}>Supported Platforms</div>
      <div style={styles.siteGrid}>
        {sites.map(s => (
          <div key={s.name} style={styles.siteChip}>
            {s.icon}
            <span style={styles.siteName}>{s.name}</span>
          </div>
        ))}
      </div>

      {/* Settings */}
      <div style={styles.sectionTitle}>Settings</div>
      <div style={styles.settingRow}>
        <div style={styles.settingLabel}>Push-to-Talk Shortcut</div>
        <button
          onClick={() => setRecording(true)}
          style={{...styles.hotkeyBtn, background: recording ? "#e0e7ff" : "#f3f4f6", color: recording ? "#4f46e5" : "#374151"}}
        >
          {recording ? "Listening..." : formatPtt(ptt)}
        </button>
      </div>
      {/* API Key Section */}
      <div style={styles.settingRow}>
        <div style={styles.settingLabel}>Sarvam API Key</div>
        <div style={styles.keyStatus(savedKeyExists)}>
          {savedKeyExists ? "Saved" : "Not Set"}
        </div>
      </div>
      <div style={styles.apiKeyRow}>
        <input
          type="password"
          value={apiKeyInput}
          onChange={(e) => setApiKeyInput(e.target.value.trim())}
          placeholder="Paste your key here..."
          style={styles.apiKeyInput}
        />
      </div>
      <div style={styles.apiKeyActions}>
        <button
          onClick={() => {
            if (!apiKeyInput) return
            chrome.storage.local.set({ smartreply_api_key: apiKeyInput }, () => {
              setSavedKeyExists(true)
            })
          }}
          disabled={!apiKeyInput}
          style={{...styles.actionBtn, ...styles.saveBtn, opacity: apiKeyInput ? 1 : 0.5}}
        >
          Save
        </button>
        <button
          onClick={() => {
            chrome.storage.local.remove("smartreply_api_key", () => {
              setSavedKeyExists(false)
              setApiKeyInput("")
            })
          }}
          disabled={!savedKeyExists}
          style={{...styles.actionBtn, ...styles.deleteBtn, opacity: savedKeyExists ? 1 : 0.5}}
        >
          Delete
        </button>
      </div>

      {/* How to use */}
      <div style={styles.sectionTitle}>How to use</div>
      <div style={styles.steps}>
        {[
          "Click inside any text box on a supported site",
          "Click the SR button to generate AI text replies",
          `Hold [${formatPtt(ptt)}] on your keyboard to instantly dictate voice`
        ].map((step, i) => (
          <div key={i} style={styles.step}>
            <div style={styles.stepNum}>{i + 1}</div>
            <div style={styles.stepText}>{step}</div>
          </div>
        ))}
      </div>

      <div style={styles.footer}>v1.0 · Powered by Sarvam AI</div>
    </div>
  )
}

const styles = {
  root: {
    width: 300,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    background: "#fff",
    color: "#1f2937",
    padding: 0,
    overflow: "hidden",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 16px",
    background: "linear-gradient(135deg, #4f46e5, #6d28d9)",
    color: "#fff",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  logoBox: {
    width: 34, height: 34,
    background: "rgba(255,255,255,0.15)",
    borderRadius: 8,
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  title: {
    fontWeight: 700,
    fontSize: 14,
    color: "#fff",
    letterSpacing: "-0.2px",
  },
  subtitle: {
    fontSize: 11,
    color: "rgba(255,255,255,0.7)",
    marginTop: 1,
  },
  toggle: {
    width: 40, height: 22,
    borderRadius: 11,
    cursor: "pointer",
    position: "relative",
    transition: "background 0.25s",
    flexShrink: 0,
  },
  toggleThumb: {
    position: "absolute",
    top: 2,
    width: 18, height: 18,
    background: "#fff",
    borderRadius: "50%",
    transition: "transform 0.25s cubic-bezier(0.4,0,0.2,1)",
    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
  },
  statusBadge: {
    margin: "10px 14px 0",
    padding: "7px 12px",
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: "0.6px",
    padding: "12px 14px 5px",
  },
  settingRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 14px 4px",
  },
  settingLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: "#4b5563",
  },
  hotkeyBtn: {
    border: "1px solid #d1d5db",
    borderRadius: 6,
    padding: "4px 8px",
    fontSize: 10,
    fontWeight: 700,
    cursor: "pointer",
    transition: "all 0.15s",
  },
  siteGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 5,
    padding: "0 14px",
  },
  siteChip: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    background: "#f9fafb",
    border: "1px solid #f3f4f6",
    borderRadius: 6,
    padding: "5px 7px",
    fontSize: 12,
  },
  siteName: {
    fontWeight: 500,
    fontSize: 10.5,
    color: "#374151",
  },
  steps: {
    display: "flex",
    flexDirection: "column",
    gap: 5,
    padding: "0 14px",
  },
  step: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  stepNum: {
    width: 18, height: 18,
    background: "#4f46e5",
    color: "#fff",
    borderRadius: "50%",
    fontSize: 10,
    fontWeight: 700,
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  stepText: {
    fontSize: 12,
    color: "#4b5563",
    lineHeight: 1.4,
  },
  footer: {
    textAlign: "center",
    fontSize: 10,
    color: "#d1d5db",
    padding: "12px 14px 14px",
    borderTop: "1px solid #f3f4f6",
    marginTop: 12,
  },
  keyStatus: (saved) => ({
    fontSize: 10,
    fontWeight: 700,
    padding: "2px 8px",
    borderRadius: 4,
    background: saved ? "#dcfce7" : "#fee2e2",
    color: saved ? "#16a34a" : "#dc2626",
    border: `1px solid ${saved ? "#bbf7d0" : "#fecaca"}`,
  }),
  apiKeyRow: {
    padding: "0 14px 6px",
  },
  apiKeyInput: {
    width: "100%",
    padding: "6px 8px",
    border: "1px solid #e5e7eb",
    borderRadius: 6,
    fontSize: 11,
    fontFamily: "monospace",
    outline: "none",
    boxSizing: "border-box",
  },
  apiKeyActions: {
    display: "flex",
    gap: 8,
    padding: "0 14px 8px",
  },
  actionBtn: {
    flex: 1,
    padding: "6px 0",
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 700,
    cursor: "pointer",
    border: "none",
    transition: "all 0.15s",
  },
  saveBtn: {
    background: "#4f46e5",
    color: "#fff",
  },
  deleteBtn: {
    background: "#f3f4f6",
    color: "#374151",
    border: "1px solid #e5e7eb",
  },
}

createRoot(document.getElementById("root")).render(<Popup />)
