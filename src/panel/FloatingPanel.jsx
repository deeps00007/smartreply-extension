import React, { useState, useRef, useEffect } from "react"
import "./panel.css"

export default function FloatingPanel({ text, enhanceText, platform, onInsert, onClose }) {

  const isEnhance = platform === "whatsapp" || platform === "linkedin-message"
  const isPromptEnhancer = platform?.startsWith("ai-")
  const isCompose = !isEnhance && !isPromptEnhancer && !text
  const [topic, setTopic] = useState("")
  const [userMsg, setUserMsg] = useState(enhanceText || "")
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

  // Dragging — use document-level listeners so drag works even when pointer leaves the header
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const dragInfo = useRef(null)

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

  // Forcefully steal focus after a short delay to defeat aggressive host page focus traps
  useEffect(() => {
    const timer = setTimeout(() => {
      if ((isCompose || isPromptEnhancer) && topicInputRef.current) {
        topicInputRef.current.focus()
      } else if (isEnhance && msgInputRef.current) {
        msgInputRef.current.focus()
      }
    }, 150)
    return () => clearTimeout(timer)
  }, [isCompose, isEnhance, isPromptEnhancer])

  const humanizeInstruction = humanize
    ? " Write like a real human — use natural, conversational language with slight imperfections. Vary sentence length, use contractions, and keep it genuine. Do NOT use bullet points or numbered lists unless absolutely necessary."
    : ""

  const generateReply = async () => {
    if (loading) return
    setLoading(true)
    setReply("")
    setCopied(false)
    setInserted(false)
    try {
      let prompt
      if (isPromptEnhancer) {
        const userPromptText = userMsg.trim() || topic.trim()
        prompt = `You are a prompt engineering expert. Rewrite the following user prompt to be significantly better for AI models. Make it specific, structured, clear, and include all necessary context and constraints. Output ONLY the improved prompt — no explanation, no labels, no meta-commentary.\n\nOriginal prompt:\n${userPromptText}`
      } else if (isEnhance) {
        const msgType = platform === "linkedin-message" ? "LinkedIn message" : "WhatsApp message"
        prompt = `Improve the grammar and tone of this ${msgType}. Keep the meaning identical. Output ONLY the improved message with no explanation, no labels, no quotes, no extra text.${humanizeInstruction}\n\n${userMsg}\n\nTone: ${tone}. Language: ${language}.`
      } else if (isCompose) {
        prompt = `Write a ${platform === "linkedin" ? "LinkedIn post" : platform === "twitter" ? "tweet" : "social media post"} about: ${topic || "general"}. Tone: ${tone}. Language: ${language}. Output ONLY the post text. No labels, no explanation, no quotes, no commentary.${humanizeInstruction}`
      } else {
        prompt = `Write a reply to this message. Tone: ${tone}. Language: ${language}. Output ONLY the reply text. No labels, no explanation, no quotes, no commentary like "Here's a reply" or "This keeps it...".${humanizeInstruction}\n\nMessage to reply to:\n${text}`
      }

      const res = await fetch(
        "https://api.sarvam.ai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer sk_o07ycnow_KTGjMr1Z3KBvdS8pIDi4IuUz"
          },
          body: JSON.stringify({
            model: "sarvam-m",
            messages: [{ role: "user", content: prompt }]
          })
        }
      )
      const data = await res.json()
      const raw = data.choices[0].message.content.trim()
      const clean = raw
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
      setReply("Error generating reply. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // Auto-scroll output into view when reply arrives
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

  // Ctrl+Enter to generate
  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault()
      generateReply()
    }
  }

  const charCount = reply.length

  return (
    <div 
      className="panel" 
      onKeyDown={handleKeyDown}
      style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
    >

      {/* Header */}
      <div 
        className="panel-header"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <h3>{isPromptEnhancer ? "Prompt Enhancer" : "SmartReply AI"}</h3>
        <button className="panel-close" onClick={onClose} title="Close">✕</button>
      </div>

      {/* Enhance mode: editable draft */}
      {isEnhance && (
        <div className="panel-field" style={{ marginBottom: "10px" }}>
          <label>Your message</label>
          <textarea
            ref={msgInputRef}
            className="input-area"
            value={userMsg}
            placeholder="Type your message here..."
            onChange={(e) => setUserMsg(e.target.value)}
            autoFocus
          />
        </div>
      )}

      {/* Reply mode: context preview */}
      {!isCompose && !isEnhance && (
        <div className="context-box">
          <span className="context-label">Replying to</span>
          <p className="context-text">{text}</p>
        </div>
      )}

      {/* Prompt Enhancer mode: show typed prompt */}
      {isPromptEnhancer && (
        <div className="panel-field" style={{ marginBottom: "10px" }}>
          <label>Your prompt</label>
          <textarea
            ref={topicInputRef}
            className="input-area"
            value={userMsg || topic}
            placeholder="Type your prompt here (or it will be read from the page)..."
            onChange={(e) => { setUserMsg(e.target.value); setTopic(e.target.value) }}
            autoFocus
            style={{ height: "80px" }}
          />
        </div>
      )}

      {/* Compose mode: topic */}
      {isCompose && (
        <div className="panel-field" style={{ marginBottom: "10px" }}>
          <label>Topic</label>
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

      {/* Controls row: Tone + Language (hidden for prompt enhancer) */}
      {!isPromptEnhancer && <div className="panel-row">
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
      {!isPromptEnhancer && <div className="humanize-row">
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
            isEnhance ? "Enhance" : isCompose ? "Generate Post" : "Generate Reply"
          )}
        </button>
        {reply && !loading && (
          <button className="regen-btn" onClick={generateReply} title="Regenerate">
            ↻
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
                    {copied ? "✓ Copied" : "Copy"}
                  </button>
                  <button className="action-btn insert-btn" onClick={handleInsert}>
                    {inserted ? "✓ Done" : isEnhance ? "Replace" : "Insert"}
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