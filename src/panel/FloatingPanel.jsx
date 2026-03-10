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
        prompt = `Fix the grammar and improve the following ${msgType}. Keep the meaning exactly the same.

Original message:
"${userMsg}"

Tone: ${tone}
Language: ${language}

Return only the improved message, nothing else.`
      } else if (isCompose) {
        prompt = `Write a ${platform === "linkedin" ? "LinkedIn" : platform === "twitter" ? "tweet" : "social media post"} about the following topic.

Topic: "${topic || "general"}"
Tone: ${tone}
Language: ${language}

Make it engaging, natural, and human. Keep it concise.`
      } else {
        prompt = `Generate a reply for the message below.

Message:
"${text}"

Tone: ${tone}
Language: ${language}

Make it natural and human.`
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
      // Strip surrounding quotes the model sometimes adds
      const clean = raw.replace(/^["'"']+|["'"']+$/g, "").trim()
      setReply(clean)
    } catch(e) {
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
        <div className="panel-field" style={{marginBottom:"10px"}}>
          <label>Your message (edit before enhancing)</label>
          <textarea
            style={{height:"70px", marginTop:"4px"}}
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
        <div className="panel-field" style={{marginBottom:"10px"}}>
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