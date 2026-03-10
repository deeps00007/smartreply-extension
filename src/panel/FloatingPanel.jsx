import React, { useState } from "react"
import "./panel.css"

export default function FloatingPanel({text, onInsert, onClose}){

  const [tone, setTone] = useState("Friendly")
  const [language, setLanguage] = useState("English")
  const [reply, setReply] = useState("")
  const [loading, setLoading] = useState(false)

  const generateReply = async () => {
    setLoading(true)
    try {
      const prompt = `
Generate a reply for the message below.

Message:
"${text}"

Tone: ${tone}
Language: ${language}

Make it natural and human.
`
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
      setReply(data.choices[0].message.content)
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

      {text && <p className="original">{text}</p>}

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
        {loading ? "Generating..." : "Generate Reply"}
      </button>

      <textarea
        value={reply}
        placeholder="Generated reply will appear here..."
        onChange={(e) => setReply(e.target.value)}
      />

      <button className="insert" onClick={() => onInsert(reply)}>
        Insert Reply
      </button>

    </div>
  )
}