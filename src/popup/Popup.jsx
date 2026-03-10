import React, { useState, useEffect } from "react"
import { createRoot } from "react-dom/client"

const sites = [
  { name: "Gmail",     icon: "📧" },
  { name: "WhatsApp",  icon: "💬" },
  { name: "Reddit",    icon: "🤖" },
  { name: "Twitter/X", icon: "🐦" },
  { name: "LinkedIn",  icon: "💼" },
  { name: "YouTube",   icon: "▶️" },
]

function Popup() {
  const [enabled, setEnabled] = useState(true)

  useEffect(() => {
    chrome.storage.local.get("smartreply_enabled", (res) => {
      setEnabled(res.smartreply_enabled !== false)
    })
  }, [])

  const toggle = () => {
    const next = !enabled
    setEnabled(next)
    chrome.storage.local.set({ smartreply_enabled: next })
  }

  return (
    <div style={styles.root}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.logoBox}>✨</div>
          <div>
            <div style={styles.title}>SmartReply AI</div>
            <div style={styles.subtitle}>AI-powered reply assistant</div>
          </div>
        </div>
        {/* Toggle switch */}
        <div onClick={toggle} style={{...styles.toggle, background: enabled ? "#4f46e5" : "#ccc"}}>
          <div style={{...styles.toggleThumb, transform: enabled ? "translateX(20px)" : "translateX(2px)"}} />
        </div>
      </div>

      {/* Status badge */}
      <div style={{...styles.statusBadge, background: enabled ? "#eef2ff" : "#f5f5f5", color: enabled ? "#4f46e5" : "#999"}}>
        {enabled ? "🟢 Extension is Active" : "🔴 Extension is Disabled"}
      </div>

      {/* Supported sites */}
      <div style={styles.sectionTitle}>Works on</div>
      <div style={styles.siteGrid}>
        {sites.map(s => (
          <div key={s.name} style={styles.siteChip}>
            <span>{s.icon}</span>
            <span style={styles.siteName}>{s.name}</span>
          </div>
        ))}
      </div>

      {/* How to use */}
      <div style={styles.sectionTitle}>How to use</div>
      <div style={styles.steps}>
        {["Click any text box on a supported site", 'Press the "AI ✨" button that appears', "Choose tone & language, then generate"].map((step, i) => (
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
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    background: "#fff",
    color: "#1a1a1a",
    padding: 0,
    overflow: "hidden",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 16px 12px",
    background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
    color: "#fff",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  logoBox: {
    width: 36, height: 36,
    background: "rgba(255,255,255,0.2)",
    borderRadius: 10,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 18,
  },
  title: {
    fontWeight: 700,
    fontSize: 15,
    color: "#fff",
  },
  subtitle: {
    fontSize: 11,
    color: "rgba(255,255,255,0.75)",
    marginTop: 1,
  },
  toggle: {
    width: 44, height: 24,
    borderRadius: 12,
    cursor: "pointer",
    position: "relative",
    transition: "background 0.25s",
    flexShrink: 0,
  },
  toggleThumb: {
    position: "absolute",
    top: 2,
    width: 20, height: 20,
    background: "#fff",
    borderRadius: "50%",
    transition: "transform 0.25s",
    boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
  },
  statusBadge: {
    margin: "12px 16px 0",
    padding: "8px 12px",
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 600,
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: "0.6px",
    padding: "14px 16px 6px",
  },
  siteGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 6,
    padding: "0 16px",
  },
  siteChip: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    background: "#f5f5f5",
    borderRadius: 8,
    padding: "6px 8px",
    fontSize: 12,
  },
  siteName: {
    fontWeight: 500,
    fontSize: 11,
    color: "#333",
  },
  steps: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    padding: "0 16px",
  },
  step: {
    display: "flex",
    alignItems: "flex-start",
    gap: 8,
  },
  stepNum: {
    width: 20, height: 20,
    background: "#4f46e5",
    color: "#fff",
    borderRadius: "50%",
    fontSize: 11,
    fontWeight: 700,
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  stepText: {
    fontSize: 12,
    color: "#444",
    paddingTop: 2,
    lineHeight: 1.4,
  },
  footer: {
    textAlign: "center",
    fontSize: 11,
    color: "#bbb",
    padding: "14px 16px 16px",
    borderTop: "1px solid #f0f0f0",
    marginTop: 14,
  }
}

createRoot(document.getElementById("root")).render(<Popup />)
