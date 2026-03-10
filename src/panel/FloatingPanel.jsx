import React, { useState } from "react"
import "./panel.css"

export default function FloatingPanel({ text, enhanceText, platform, onInsert, onClose }) {

  const isEnhance = platform === "whatsapp" || platform === "linkedin-message"
  const isCompose = !isEnhance && !text        // no context = new post
  const [topic, setTopic] = useState("")
  const [userMsg, setUserMsg] = useState(enhanceText || "")  // editable draft for enhance mode
  const [tone, setTone] = useState("Friendly")
  const [language, setLanguage] = useState("English")
  const [reply, setReply] = useState("")
  const [loading, setLoading] = useState(false)

  const generateReply = async () => {
    setLoading(true)
    try {
      let prompt
      if (isEnhance) {
        const msgType = platform === "linkedin-message" ? "LinkedIn message" : "WhatsApp message"
        prompt = `Improve the grammar and tone of this ${msgType}. Keep the meaning identical. Output ONLY the improved message with no explanation, no labels, no quotes, no extra text.

${userMsg}

Tone: ${tone}. Language: ${language}.`
      } else if (isCompose) {
        prompt = `Write a ${platform === "linkedin" ? "LinkedIn post" : platform === "twitter" ? "tweet" : "social media post"} about: ${topic || "general"}. Tone: ${tone}. Language: ${language}. Output ONLY the post text. No labels, no explanation, no quotes, no commentary.`
      } else {
        prompt = `Write a reply to this message. Tone: ${tone}. Language: ${language}. Output ONLY the reply text. No labels, no explanation, no quotes, no commentary like "Here's a reply" or "This keeps it...".

Message to reply to:
${text}`
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
        // Remove <think>...</think> reasoning blocks (closed)
        .replace(/<think>[\s\S]*?<\/think>/gi, "")
        // Remove any leftover bare <think> or </think> tags (unclosed)
        .replace(/<\/?think>/gi, "")
        // Remove --- separator lines
        .replace(/^[-–—]{2,}\s*$/gm, "")
        // Remove opening AI boilerplate ("Here's a friendly reply to your query:", etc.)
        .replace(/^(here'?s?\s+(a\s+)?(friendly|professional|casual|polite|helpful|short|brief|quick|concise|warm)?\s*(reply|response|message|answer|post)[^\n]*[:.]?\s*)/gim, "")
        // Remove greeting lines like "Hi Username," or "Hey there,"
        .replace(/^(hi|hey|hello|dear)\s+[^\n]{0,40}[,!]?\s*\n?/gim, "")
        // Remove common AI meta-commentary lines
        .replace(/^(this\s+(keeps|makes|sounds|feels|maintains|reply|message)[^\n]*)/gim, "")
        .replace(/^(note:|tip:|reply:|message:|improved[^\n]*:)/gim, "")
        .replace(/^(sure[,!]?|certainly[,!]?|of course[,!]?|absolutely[,!]?)\s*/gim, "")
        // Remove closing boilerplate ("Hope this helps", "Let me know if you need more details", etc.)
        .replace(/\n?\s*(hope\s+this\s+helps[^\n]*)/gim, "")
        .replace(/\n?\s*(let\s+me\s+know\s+if\s+you\s+need[^\n]*)/gim, "")
        .replace(/\n?\s*(feel\s+free\s+to\s+(reach\s+out|ask|contact)[^\n]*)/gim, "")
        .replace(/\n?\s*(don'?t\s+hesitate\s+to[^\n]*)/gim, "")
        .replace(/\n?\s*(best\s+(regards|wishes)[,.]?\s*)/gim, "")
        .trim()
        // Strip surrounding quotes or whitespace
        .replace(/^["'\u2018\u2019\u201c\u201d\s]+|["'\u2018\u2019\u201c\u201d\s]+$/g, "")
        .trim()
      setReply(clean)
    } catch (e) {
      setReply("Error generating reply. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="panel">

      <div className="panel-header">
        <h3>SmartReply AI ✨</h3>
        <button className="panel-close" onClick={onClose}>✕</button>
      </div>

      {/* Enhance mode: show editable draft */}
      {isEnhance && (
        <div className="panel-field" style={{ marginBottom: "10px" }}>
          <label>Your message (edit before enhancing)</label>
          <textarea
            style={{ height: "70px", marginTop: "4px" }}
            value={userMsg}
            placeholder="Type your message here..."
            onChange={(e) => setUserMsg(e.target.value)}
          />
        </div>
      )}

      {/* Reply mode: show original message */}
      {!isCompose && !isEnhance && <p className="original">{text}</p>}

      {/* Compose mode: show topic input */}
      {isCompose && (
        <div className="panel-field" style={{ marginBottom: "10px" }}>
          <label>What's your post about?</label>
          <input
            type="text"
            className="topic-input"
            placeholder="e.g. productivity tips, my new project..."
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
        </div>
      )}

      <div className="panel-row">
        <div className="panel-field">
          <label>Tone</label>
          <select onChange={(e) => setTone(e.target.value)}>
            <option>Friendly</option>
            <option>Professional</option>
            <option>Casual</option>
          </select>
        </div>
        <div className="panel-field">
          <label>Language</label>
          <select onChange={(e) => setLanguage(e.target.value)}>
            <option>English</option>
            <option>Hindi</option>
            <option>Hinglish</option>
          </select>
        </div>
      </div>

      <button className="generate" onClick={generateReply} disabled={loading}>
        {loading ? "Enhancing..." : isEnhance ? "Enhance Message" : isCompose ? "Generate Post" : "Generate Reply"}
      </button>

      <textarea
        value={reply}
        placeholder={isEnhance ? "Enhanced message will appear here..." : isCompose ? "Generated post will appear here..." : "Generated reply will appear here..."}
        onChange={(e) => setReply(e.target.value)}
      />

      <button className="insert" onClick={() => onInsert(reply)}>
        {isEnhance ? "Replace Message" : isCompose ? "Insert Post" : "Insert Reply"}
      </button>

    </div>
  )
}