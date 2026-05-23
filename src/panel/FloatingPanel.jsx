import React, { useState, useRef, useEffect } from "react"
import "./panel.css"
import { apiCall } from "../shared/api.js"

function getApiKey() {
  return new Promise((resolve) => {
    chrome.storage.local.get("smartreply_api_key", (res) => {
      resolve(res.smartreply_api_key || "")
    })
  })
}

export default function FloatingPanel({ text, typedText, platform, onInsert, onClose }) {
  const isAI = platform?.startsWith("ai-")

  const defaultMode = (() => {
    if (isAI) return "prompt-enhancer"
    if (text && text.length > 10) return "reply"
    if (typedText && typedText.length > 5) return "enhance"
    return "compose"
  })()

  const [mode, setMode] = useState(defaultMode)
  const [topic, setTopic] = useState("")
  const [userMsg, setUserMsg] = useState(typedText || "")
  const [tone, setTone] = useState("Friendly")
  const [language, setLanguage] = useState("English")
  const [humanize, setHumanize] = useState(true)
  const [reply, setReply] = useState("")
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [inserted, setInserted] = useState(false)

  const replyRef = useRef(null)
  const topicInputRef = useRef(null)
  const msgInputRef = useRef(null)

  const [position, setPosition] = useState({ x: 0, y: 0 })
  const dragInfo = useRef(null)

  // Sync typedText when prop changes (panel re-opened on same mount edge-case)
  useEffect(() => {
    setUserMsg(typedText || "")
  }, [typedText])

  const handleMouseDown = (e) => {
    if (e.target.closest('.panel-close')) return
    e.preventDefault()
    const startX = e.clientX
    const startY = e.clientY
    const initX = position.x
    const initY = position.y

    dragInfo.current = { startX, startY, initX, initY }

    const onMove = (ev) => {
      setPosition({
        x: initX + ev.clientX - startX,
        y: initY + ev.clientY - startY,
      })
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      if ((mode === "compose" || mode === "email") && topicInputRef.current) {
        topicInputRef.current.focus()
      } else if ((mode === "enhance" || mode === "prompt-enhancer") && msgInputRef.current) {
        msgInputRef.current.focus()
      }
    }, 150)
    return () => clearTimeout(timer)
  }, [mode])

  const humanizeInstruction = humanize
    ? " IMPORTANT: Write like a real human. Be concise (1-3 sentences maximum). Avoid generic agreements ('That's so true', 'I completely agree'). Get straight to the point. Use natural, conversational language. DO NOT sound like an enthusiastic AI giving a speech."
    : " KEEP IT SHORT. 1-3 sentences maximum."

  const generateReply = async () => {
    if (loading) return
    setLoading(true)
    setReply("")
    setCopied(false)
    setInserted(false)
    try {
      let prompt
      if (isAI || mode === "prompt-enhancer") {
        const userPromptText = userMsg.trim() || topic.trim()
        prompt = `Revise the following raw idea into a highly effective prompt for an AI to execute. \nIMPORTANT RULES:\n1. Write ONLY what the user should actually send to the AI to get the best result.\n2. DO NOT include meta-instructions in your output (like "Act as an expert" or "Rewrite this").\n3. DO NOT output labels like "Improved prompt:".\n4. Transform the raw idea into direct instructions (e.g. "Write a list of features..." instead of "The user wants a list...").\n\nRaw idea:\n${userPromptText}`
      } else if (mode === "enhance") {
        const msgType = platform === "linkedin-message" ? "LinkedIn message" : platform === "whatsapp" ? "WhatsApp message" : "message"
        prompt = `Improve the grammar and tone of this ${msgType}. Keep the meaning identical. Output ONLY the improved message with no explanation, no labels, no quotes, no extra text.${humanizeInstruction}\n\n${userMsg}\n\nTone: ${tone}. Language: ${language}.`
      } else if (mode === "compose") {
        const postType = platform === "linkedin" ? "short LinkedIn post" : platform === "twitter" ? "brief tweet" : platform === "reddit" ? "Reddit comment" : platform === "youtube" ? "YouTube comment" : "short social media post"
        prompt = `Write a ${postType} about: ${topic || "general"}. Tone: ${tone}. Language: ${language}. Output ONLY the post text. No labels, no quotes.${humanizeInstruction}`
      } else if (mode === "email") {
        prompt = `Write a ${tone.toLowerCase()} email about: ${topic || "general"}. Language: ${language}. Include a subject line at the top (format: Subject: ...). Output ONLY the email text. No extra labels or explanations.${humanizeInstruction}`
      } else {
        // reply mode
        prompt = `Write a brief, natural reply to this message. Tone: ${tone}. Language: ${language}. Output ONLY the exact text to type into the reply box. No labels, no quotes. DO NOT start with generic fluff like "That's a great point" or "I totally agree".${humanizeInstruction}\n\nMessage to reply to:\n${text}`
      }

      const apiKey = await getApiKey()
      if (!apiKey) {
        throw new Error("No API key found. Open the SmartReply popup and paste your Sarvam API key.")
      }
      const data = await apiCall("https://api.sarvam.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "sarvam-m",
          messages: [{ role: "user", content: prompt }]
        })
      })

      const raw = data.choices[0].message.content.trim()
      const clean = raw
        .replace(/  /gi, " ")
        .replace(/<think>[\s\S]*?<\/think>/gi, "")
        .replace(/<\/?think>/gi, "")
        .replace(/^[-–—]{2,}\s*$/gm, "")
        .replace(/^(here'?s?\s+(a\s+)?(friendly|professional|casual|polite|helpful|short|brief|quick|concise|warm)?\s*(reply|response|message|answer|post)[^\n]*[:.]\s*)/gim, "")
        .replace(/^(hi|hey|hello|dear)\s+[^\n]{0,40}[,!]?\s*\n?/gim, "")
        .replace(/^(this\s+(keeps|makes|sounds|feels|maintains|reply|message)[^\n]*)/gim, "")
        .replace(/^(note:|tip:|reply:|message:|improved[^\n]*:)/gim, "")
        .replace(/^(sure[,!]?|certainly[,!]?|of course[,!]?|absolutely[,!]?)\s*/gim, "")
        .replace(/\n?\s*(hope\s+this\s+helps[^\n]*)/gim, "")
        .replace(/\n?\s*(let\s+me\s+know\s+if\s+you\s+need[^\n]*)/gim, "")
        .replace(/\n?\s*(feel\s+free\s+to\s+(reach\s+out|ask|contact)[^\n]*)/gim, "")
        .replace(/\n?\s*(don'?t\s+hesitate\s+to[^\n]*)/gim, "")
        .replace(/\n?\s*(best\s+(regards|wishes)[,.]?\s*)/gim, "")
        .replace(/\n?\s*(best\s+of\s+luck[^\n]*)/gim, "")
        .trim()
        .replace(/^["'\u2018\u2019\u201c\u201d\s]+|["'\u2018\u2019\u201c\u201d\s]+$/g, "")
        .trim()
      setReply(clean)
    } catch (e) {
      let msg = "Error generating reply. Please try again."
      if (e?.message) msg += ` (${e.message})`
      setReply(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (reply && replyRef.current) {
      replyRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" })
    }
  }, [reply])

  const handleCopy = async () => {
    if (!reply) return
    try {
      await navigator.clipboard.writeText(reply)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (_) { }
  }

  const handleInsert = () => {
    if (!reply) return
    onInsert(reply)
    setInserted(true)
    setTimeout(() => setInserted(false), 1500)
  }

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault()
      generateReply()
    }
  }

  const charCount = reply.length

  const modeLabel = {
    reply: "Generate Reply",
    enhance: "Enhance",
    compose: "Create Post",
    email: "Draft Email",
    "prompt-enhancer": "Enhance Prompt"
  }[mode] || "Generate"

  return (
    <div 
      className="panel" 
      onKeyDown={handleKeyDown}
      style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
    >

      {/* Header */}
      <div 
        className="panel-header"
        onMouseDown={handleMouseDown}
      >
        <h3>{isAI ? "Prompt Enhancer" : "SmartReply AI"}</h3>
        <button className="panel-close" onClick={onClose} title="Close">&#x2715;</button>
      </div>

      {/* Mode chips for non-AI sites */}
      {!isAI && (
        <div className="mode-chips">
          {[
            { id: "reply", label: "Reply" },
            { id: "enhance", label: "Enhance" },
            { id: "compose", label: "Create Post" },
            { id: "email", label: "Draft Email" },
          ].map((m) => (
            <button
              key={m.id}
              className={`mode-chip ${mode === m.id ? "active" : ""}`}
              onClick={() => { setMode(m.id); setReply("") }}
            >
              {m.label}
            </button>
          ))}
        </div>
      )}

      {/* Prompt enhancer mode (AI sites) */}
      {isAI && (
        <div className="panel-field" style={{ marginBottom: "10px" }}>
          <label>Your prompt</label>
          <textarea
            ref={msgInputRef}
            className="input-area"
            value={userMsg || topic}
            placeholder="Type your prompt here..."
            onChange={(e) => { setUserMsg(e.target.value); setTopic(e.target.value) }}
            autoFocus
            style={{ height: "80px" }}
          />
        </div>
      )}

      {/* Reply mode context */}
      {mode === "reply" && (
        <div className="context-box" style={{ marginBottom: "10px" }}>
          <span className="context-label">Replying to</span>
          {text ? (
            <p className="context-text">{text}</p>
          ) : (
            <p className="context-warning">No context found. The AI will reply without knowing what you are responding to.</p>
          )}
        </div>
      )}

      {/* Enhance mode */}
      {mode === "enhance" && (
        <div className="panel-field" style={{ marginBottom: "10px" }}>
          <label>Your draft</label>
          <textarea
            ref={msgInputRef}
            className="input-area"
            value={userMsg}
            placeholder="Paste or type your draft here..."
            onChange={(e) => setUserMsg(e.target.value)}
            autoFocus
          />
        </div>
      )}

      {/* Compose mode */}
      {mode === "compose" && (
        <div className="panel-field" style={{ marginBottom: "10px" }}>
          <label>Post topic</label>
          <input
            ref={topicInputRef}
            type="text"
            className="topic-input"
            placeholder="e.g. productivity tips, my new project..."
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            autoFocus
          />
        </div>
      )}

      {/* Email mode */}
      {mode === "email" && (
        <div className="panel-field" style={{ marginBottom: "10px" }}>
          <label>Email subject / intent</label>
          <input
            ref={topicInputRef}
            type="text"
            className="topic-input"
            placeholder="e.g. follow-up with client, project update..."
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            autoFocus
          />
        </div>
      )}

      {/* Controls row: Tone + Language (hidden for prompt enhancer) */}
      {!isAI && <div className="panel-row">
        <div className="panel-field">
          <label>Tone</label>
          <select value={tone} onChange={(e) => setTone(e.target.value)}>
            <option>Friendly</option>
            <option>Professional</option>
            <option>Casual</option>
          </select>
        </div>
        <div className="panel-field">
          <label>Language</label>
          <select value={language} onChange={(e) => setLanguage(e.target.value)}>
            <option>English</option>
            <option>Hindi</option>
            <option>Hinglish</option>
          </select>
        </div>
      </div>}

      {/* Humanize toggle */}
      {!isAI && <div className="humanize-row">
        <div className="humanize-label">
          <span className="humanize-text">Humanize</span>
        </div>
        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={humanize}
            onChange={(e) => setHumanize(e.target.checked)}
          />
          <span className="toggle-slider"></span>
        </label>
      </div>}

      {/* Generate + Regenerate */}
      <div className="generate-row">
        <button className="generate" onClick={generateReply} disabled={loading}>
          {loading ? (
            <span className="loading-content">
              <span className="spinner"></span>
              Generating...
            </span>
          ) : (
            modeLabel
          )}
        </button>
        {reply && !loading && (
          <button className="regen-btn" onClick={generateReply} title="Regenerate">
            &#x21BB;
          </button>
        )}
      </div>

      {/* Output area */}
      {(reply || loading) && (
        <div className="output-section" ref={replyRef}>
          {loading ? (
            <div className="skeleton-block">
              <div className="skeleton-line w80"></div>
              <div className="skeleton-line w100"></div>
              <div className="skeleton-line w60"></div>
            </div>
          ) : (
            <>
              <textarea
                className="output-area"
                value={reply}
                onChange={(e) => setReply(e.target.value)}
              />
              <div className="output-footer">
                <span className="char-count">{charCount} chars</span>
                <div className="action-buttons">
                  <button className="action-btn copy-btn" onClick={handleCopy}>
                    {copied ? "Copied" : "Copy"}
                  </button>
                  <button className="action-btn insert-btn" onClick={handleInsert}>
                    {inserted ? "Done" : mode === "enhance" ? "Replace" : "Insert"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <div className="panel-hint">Ctrl+Enter to generate</div>

    </div>
  )
}
