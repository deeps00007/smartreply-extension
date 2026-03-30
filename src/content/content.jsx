import React from "react"
import { createRoot } from "react-dom/client"
import FloatingPanel from "../panel/FloatingPanel"

let currentBtn = null
let panelRoot = null

// Global dictation state bindings
let globalIsDictating = false
let globalMediaRecorder = null
let globalAudioChunks = []
let globalMicStream = null

function forceStopDictation() {
  if (globalIsDictating) {
    if (globalMediaRecorder && globalMediaRecorder.state !== "inactive") {
      globalMediaRecorder.stop()
    }
    if (globalMicStream) {
      globalMicStream.getTracks().forEach(t => t.stop())
      globalMicStream = null
    }
    globalIsDictating = false
  }
}

function getPlatform() {
  const h = location.hostname
  if (h === "mail.google.com") return "gmail"
  if (h === "twitter.com" || h === "x.com") return "twitter"
  if (h.includes("linkedin.com")) {
    if (location.pathname.includes("/messaging/")) return "linkedin-message"
    return "linkedin"
  }
  if (h.includes("reddit.com")) return "reddit"
  if (h.includes("youtube.com")) return "youtube"
  if (h.includes("web.whatsapp.com") || h === "web.whatsapp.com") return "whatsapp"
  // AI chat platforms — prompt enhancer mode
  if (h.includes("chat.openai.com") || h.includes("chatgpt.com")) return "ai-chatgpt"
  if (h.includes("claude.ai")) return "ai-claude"
  if (h.includes("gemini.google.com")) return "ai-gemini"
  if (h.includes("perplexity.ai")) return "ai-perplexity"
  if (h.includes("copilot.microsoft.com")) return "ai-copilot"
  return "generic"
}

function getMessageContext(target) {
  const platform = getPlatform()

  if (platform === "whatsapp" || platform === "linkedin-message") {
    // Enhance mode: read what the user has already typed in the compose box
    const typed = (target.value || target.innerText || "").trim()
    return typed  // may be empty if user hasn't typed yet
  }

  // AI Prompt Enhancer mode — read whatever prompt the user has typed
  if (platform.startsWith("ai-")) {
    return (target.value || target.innerText || target.textContent || "").trim()
  }

  if (platform === "gmail") {
    const wrap = target.closest("[role='dialog'], form")
    if (wrap) {
      const quote = wrap.querySelector(".gmail_quote, blockquote")
      if (quote) return quote.innerText.slice(0, 1500).trim()
    }
    const body = document.querySelector(".a3s.aiL, .ii.gt .a3s")
    if (body) return body.innerText.slice(0, 1500).trim()
    return ""
  }

  if (platform === "twitter") {
    const dialog = target.closest("[role='dialog']")
    if (dialog) {
      const tweetText = dialog.querySelector("[data-testid='tweetText']")
      if (tweetText) return tweetText.innerText.trim()
    }
    const article = target.closest("article")
    if (article) {
      const prev = article.querySelector("[data-testid='tweetText']")
      if (prev) return prev.innerText.trim()
    }
    return ""
  }

  if (platform === "linkedin") {
    // ── STEP 1: Are we replying TO a comment?
    // Reply boxes are nested inside a comment-item element.
    // Check if any ancestor before the post root is a comment item.
    const commentItem = target.closest(
      ".comments-comment-item, .comments-reply-item, [data-id*='comment']"
    )
    if (commentItem) {
      // Grab the text of THAT comment (not the whole post)
      const commentTextSelectors = [
        ".comments-comment__main-content",
        ".update-components-text",
        ".comments-comment-item__main-content",
        ".comment-item__content",
        "span[dir='ltr']",
      ]
      for (const sel of commentTextSelectors) {
        const node = commentItem.querySelector(sel)
        if (node && !node.contains(target)) {
          const txt = node.innerText.trim()
          if (txt.length > 5) return txt.slice(0, 1500)
        }
      }
    }

    // ── STEP 2: Top-level comment on a post → grab the POST text
    // Walk up to the post root container
    const postRootSelectors = [
      ".feed-shared-update-v2",
      ".occludable-update",
      "[data-urn*='activity']",
    ]
    let postRoot = null
    let el = target.parentElement
    for (let i = 0; i < 35; i++) {
      if (!el) break
      for (const sel of postRootSelectors) {
        if (el.matches && el.matches(sel)) { postRoot = el; break }
      }
      if (postRoot) break
      el = el.parentElement
    }
    if (postRoot) {
      const postTextSelectors = [
        ".update-components-text",
        ".feed-shared-update-v2__commentary",
        ".update-components-text__text-view",
        ".attributed-text-segment-list__content",
      ]
      for (const sel of postTextSelectors) {
        const nodes = postRoot.querySelectorAll(sel)
        for (const node of nodes) {
          // Only accept nodes that are NOT inside the comments section
          if (node.closest(".comments-comments-list, .comments-comment-item, .social-details-social-counts")) continue
          const txt = node.innerText.trim()
          if (txt.length > 10) return txt.slice(0, 1500)
        }
      }
    }
    return ""
  }

  if (platform === "reddit") {
    const thread = target.closest("[data-testid='comment-top-meta'], shreddit-comment, .Comment")
    if (thread) {
      const txt = thread.querySelector("[data-testid='comment'], p, .RichTextJSON-root")
      if (txt && !txt.contains(target)) return txt.innerText.trim().slice(0, 1500)
    }
    const postBody = document.querySelector("[data-testid='post-container'] [data-click-id='text'], .Post .RichTextJSON-root, shreddit-post")
    if (postBody) return postBody.innerText.trim().slice(0, 1500)
    return ""
  }

  if (platform === "youtube") {
    const titleEl = document.querySelector("h1.ytd-video-primary-info-renderer, h1.style-scope.ytd-watch-metadata")
    if (titleEl) return `Video: ${titleEl.innerText.trim()}`
    return ""
  }

  let el = target.parentElement
  for (let depth = 0; depth < 8; depth++) {
    if (!el) break
    for (const sel of ["article", "blockquote", ".message", ".post", ".comment", "[class*='body']", "[class*='content']"]) {
      try {
        const found = el.querySelector(sel)
        if (found && !found.contains(target)) {
          const txt = found.innerText?.trim()
          if (txt && txt.length > 20) return txt.slice(0, 1500)
        }
      } catch (_) { }
    }
    el = el.parentElement
  }
  return (target.value || target.innerText || "").trim()
}

function insertIntoContentEditable(el, text) {
  el.focus()
  document.execCommand("selectAll", false, null)
  document.execCommand("insertText", false, text)
}

async function enhancePromptInline(target, btn) {
  const originalText = btn.textContent
  // Read the typed prompt — supports both textarea and contenteditable
  const rawPrompt = (target.value || target.innerText || target.textContent || "").trim()
  if (!rawPrompt) {
    btn.textContent = "Type something first!"
    setTimeout(() => { btn.textContent = originalText }, 2000)
    return
  }

  // Show loading state
  btn.textContent = "Enhancing..."
  btn.style.opacity = "0.7"
  btn.style.cursor = "default"
  btn.style.pointerEvents = "none"

  try {
    const res = await fetch("https://api.sarvam.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer sk_o07ycnow_KTGjMr1Z3KBvdS8pIDi4IuUz"
      },
      body: JSON.stringify({
        model: "sarvam-m",
        messages: [{
          role: "user",
          content: `Revise the following raw idea into a highly effective prompt for an AI to execute. \nIMPORTANT RULES:\n1. Write ONLY what the user should actually send to the AI to get the best result.\n2. DO NOT include meta-instructions in your output (like "Act as an expert" or "Rewrite this").\n3. DO NOT output labels like "Improved prompt:".\n4. Transform the raw idea into direct instructions (e.g. "Write a list of features..." instead of "The user wants a list...").\n\nRaw idea:\n${rawPrompt}`
        }]
      })
    })
    const data = await res.json()
    const enhanced = (data.choices?.[0]?.message?.content || "").trim()
      .replace(/<think>[\s\S]*?<\/think>/gi, "")
      .replace(/<\/?think>/gi, "")
      .trim()

    if (!enhanced) throw new Error("Empty response")

    // Insert back into the target field
    if (target.isContentEditable) {
      target.focus()
      document.execCommand("selectAll", false, null)
      document.execCommand("insertText", false, enhanced)
    } else {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set
      if (setter) {
        setter.call(target, enhanced)
        target.dispatchEvent(new Event("input", { bubbles: true }))
      } else {
        target.value = enhanced
      }
    }

    // Success feedback on button
    btn.textContent = "Done!"
    btn.style.background = "#16a34a"
    setTimeout(() => {
      btn.textContent = originalText
      btn.style.background = "#4f46e5"
      btn.style.opacity = "0.9"
      btn.style.cursor = "pointer"
      btn.style.pointerEvents = "auto"
    }, 1500)
  } catch (err) {
    btn.textContent = "Error"
    btn.style.background = "#dc2626"
    setTimeout(() => {
      btn.textContent = originalText
      btn.style.background = "#4f46e5"
      btn.style.opacity = "0.9"
      btn.style.cursor = "pointer"
      btn.style.pointerEvents = "auto"
    }, 2000)
  }
}

function createAIButton(target) {
  if (currentBtn) {
    forceStopDictation() // Instantly shut down the mic if the user clicks away abruptly
    currentBtn.remove()
  }
  const platform = getPlatform()
  const isAI = platform.startsWith("ai-")

  const container = document.createElement("div")
  container.style.cssText = [
    "position:fixed",
    "z-index:2147483646",
    "display: flex",
    "gap: 6px",
    "align-items: center",
    "transition: all 0.15s"
  ].join(";")

  const btn = document.createElement("button")

  if (isAI) {
    btn.textContent = "Enhance"
    btn.title = "Enhance this prompt with AI"
    btn.style.cssText = [
      "height:26px",
      "padding:0 10px",
      "background:#4f46e5",
      "color:#fff",
      "border:none",
      "border-radius:13px",
      "cursor:pointer",
      "font-size:11px",
      "font-weight:600",
      "font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif",
      "line-height:26px",
      "letter-spacing:0.1px",
      "box-shadow:0 1px 6px rgba(79,70,229,0.3)",
      "transition:all 0.15s",
      "opacity:0.9",
      "white-space:nowrap"
    ].join(";")
  } else {
    btn.textContent = "SR"
    btn.title = "SmartReply"
    btn.style.cssText = [
      "width:28px",
      "height:28px",
      "padding:0",
      "background:#4f46e5",
      "color:#fff",
      "border:none",
      "border-radius:50%",
      "cursor:pointer",
      "font-size:10px",
      "font-weight:700",
      "font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif",
      "line-height:28px",
      "text-align:center",
      "box-shadow:0 1px 6px rgba(0,0,0,0.15)",
      "transition:box-shadow 0.15s,transform 0.15s",
      "opacity:0.9"
    ].join(";")
  }

  const micBtn = document.createElement("button")
  micBtn.textContent = "🎙️"
  micBtn.title = "Dictate (Auto-translates Hindi to English)"
  micBtn.style.cssText = [
    "width:28px",
    "height:28px",
    "padding:0",
    "background:#fff",
    "color:#4f46e5",
    "border:1px solid #e5e7eb",
    "border-radius:50%",
    "cursor:pointer",
    "font-size:14px",
    "display:flex",
    "align-items:center",
    "justify-content:center",
    "box-shadow:0 1px 6px rgba(0,0,0,0.1)",
    "transition:all 0.15s",
    "opacity:0.9"
  ].join(";")

  btn.onmouseenter = () => {
    if (drag.isDragging) return
    btn.style.opacity = "1"
    btn.style.boxShadow = "0 2px 10px rgba(79,70,229,0.35)"
    btn.style.transform = isAI ? "translateY(-1px)" : "scale(1.08)"
  }
  btn.onmouseleave = () => {
    if (drag.isDragging) return
    btn.style.opacity = "0.9"
    btn.style.boxShadow = isAI ? "0 1px 6px rgba(79,70,229,0.3)" : "0 1px 6px rgba(0,0,0,0.15)"
    btn.style.transform = "scale(1)"
  }
  
  micBtn.onmouseenter = () => { if (!drag.isDragging) micBtn.style.transform = "scale(1.08)" }
  micBtn.onmouseleave = () => { if (!drag.isDragging) micBtn.style.transform = "scale(1)" }

  const rect = target.getBoundingClientRect()
  container.style.top = (rect.bottom + 6) + "px"
  // Keep the overall group right-aligned
  container.style.left = isAI ? (rect.right - 120) + "px" : (rect.right - 66) + "px"

  // ── Drag support ──
  // ── Drag support ──
  const drag = { isDragging: false, hasDragged: false }

  container.addEventListener("mousedown", (e) => {
    e.stopPropagation()
    drag.isDragging = true
    drag.hasDragged = false
    const startX = e.clientX
    const startY = e.clientY
    const origLeft = parseInt(container.style.left, 10)
    const origTop  = parseInt(container.style.top,  10)
    container.style.transition = "none"
    container.style.cursor = "grabbing"

    const onMove = (ev) => {
      if (!drag.isDragging) return
      const dx = ev.clientX - startX
      const dy = ev.clientY - startY
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) drag.hasDragged = true
      container.style.left = (origLeft + dx) + "px"
      container.style.top  = (origTop  + dy) + "px"
    }

    const onUp = () => {
      drag.isDragging = false
      container.style.transition = "all 0.15s"
      container.style.cursor = ""
      document.removeEventListener("mousemove", onMove)
      document.removeEventListener("mouseup", onUp)
    }

    document.addEventListener("mousemove", onMove)
    document.addEventListener("mouseup", onUp)
  })

  btn.addEventListener("click", (e) => {
    if (drag.hasDragged) { drag.hasDragged = false; return }
    e.preventDefault()
    e.stopPropagation()
    if (isAI) {
      enhancePromptInline(target, btn)
    } else {
      if (target && typeof target.blur === "function") target.blur()
      openPanel(target)
    }
  })

  if (!document.getElementById("mic-pulse-style")) {
    const style = document.createElement("style")
    style.id = "mic-pulse-style"
    style.textContent = "@keyframes pulse { 0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); } 70% { transform: scale(1.05); box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); } 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); } }"
    document.head.appendChild(style)
  }

  const resetMicUI = () => {
    globalIsDictating = false
    micBtn.style.width = "28px"
    micBtn.style.padding = "0"
    micBtn.style.borderRadius = "50%"
    micBtn.textContent = "🎙️"
    micBtn.style.animation = "none"
  }

  const insertText = (text) => {
    const prefix = target.value && !target.value.endsWith(" ") ? " " : ""
    if (target.isContentEditable) {
      target.focus()
      document.execCommand("insertText", false, prefix + text + " ")
    } else {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set
      const currentVal = target.value || ""
      const newVal = currentVal + (currentVal && !currentVal.endsWith(" ") ? " " : "") + text + " "
      if (setter) {
        setter.call(target, newVal)
        target.dispatchEvent(new Event("input", { bubbles: true }))
      } else {
        target.value = newVal
      }
    }
  }

  const processTranscript = async (text) => {
    if (/[\u0900-\u097F]/.test(text)) {
      micBtn.style.width = "auto"
      micBtn.textContent = "⏳ Translating..."
      try {
        const res = await fetch("https://api.sarvam.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer sk_o07ycnow_KTGjMr1Z3KBvdS8pIDi4IuUz"
          },
          body: JSON.stringify({
            model: "sarvam-m",
            messages: [{
              role: "user",
              content: `Translate the following Hindi text to natural English. Output ONLY the English text, no explanations, no labels.\n\nText: ${text}`
            }]
          })
        })
        const data = await res.json()
        const translated = (data.choices?.[0]?.message?.content || "").trim()
          .replace(/<think>[\s\S]*?<\/think>/gi, "")
          .replace(/<\/?think>/gi, "")
          .trim()
        if (translated) text = translated
      } catch (err) {}
    }
    insertText(text)
    resetMicUI()
  }

  micBtn.addEventListener("click", async (e) => {
    if (drag.hasDragged) { drag.hasDragged = false; return }
    e.preventDefault()
    e.stopPropagation()
    
    // Stop Dictation
    if (globalIsDictating) {
      forceStopDictation()
      return
    }

    // Start Dictation
    try {
      globalMicStream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (err) {
      micBtn.style.width = "auto"
      micBtn.textContent = "❌ Mic Denied"
      setTimeout(resetMicUI, 3000)
      return
    }

    globalIsDictating = true
    micBtn.style.width = "auto"
    micBtn.style.padding = "0 8px"
    micBtn.style.borderRadius = "14px"
    micBtn.textContent = "🔴 Listening"
    micBtn.style.animation = "pulse 1.5s infinite"

    globalAudioChunks = []
    globalMediaRecorder = new MediaRecorder(globalMicStream)

    globalMediaRecorder.ondataavailable = (ev) => {
      if (ev.data.size > 0) globalAudioChunks.push(ev.data)
    }

    globalMediaRecorder.onstop = async () => {
      micBtn.textContent = "⏳ Transcribing..."
      micBtn.style.animation = "none"

      const audioBlob = new Blob(globalAudioChunks, { type: 'audio/webm' })
      const formData = new FormData()
      formData.append("file", audioBlob, "recording.webm")
      
      try {
        const res = await fetch("https://api.sarvam.ai/speech-to-text-translate", {
          method: "POST",
          headers: {
            "api-subscription-key": "sk_o07ycnow_KTGjMr1Z3KBvdS8pIDi4IuUz"
          },
          body: formData
        })
        if (!res.ok) throw new Error("API Failed")
        const data = await res.json()
        const transcript = data.transcript || data.text || ""
        if (!transcript) throw new Error("Empty Transcript")
        
        await processTranscript(transcript)
      } catch (err) {
        micBtn.textContent = "❌ Error"
        setTimeout(resetMicUI, 3000)
      }
    }

    globalMediaRecorder.start()
  })

  container.appendChild(btn)
  container.appendChild(micBtn)
  document.body.appendChild(container)
  currentBtn = container
}

function openPanel(target) {
  let container = document.getElementById("smartreply-root")
  if (!container) {
    container = document.createElement("div")
    container.id = "smartreply-root"
    // Prevent panel interactions from triggering the document focusin listener
    container.addEventListener("focusin", (e) => e.stopPropagation())
    container.addEventListener("mousedown", (e) => e.stopPropagation())
    container.addEventListener("click", (e) => e.stopPropagation())
    document.body.appendChild(container)
  }
  if (!panelRoot) panelRoot = createRoot(container)

  const text = getMessageContext(target)
  const platform = getPlatform()
  // WhatsApp / LinkedIn DM enhance mode: pass the typed text as 'enhanceText'
  const isEnhance = platform === "whatsapp" || platform === "linkedin-message"

  panelRoot.render(
    <FloatingPanel
      text={isEnhance ? "" : text}
      enhanceText={isEnhance ? text : undefined}
      platform={platform}
      onInsert={(reply) => {
        if (target.isContentEditable) {
          insertIntoContentEditable(target, reply)
        } else if (target.value !== undefined) {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set
          if (setter) {
            setter.call(target, reply)
            target.dispatchEvent(new Event("input", { bubbles: true }))
          } else {
            target.value = reply
          }
        }
      }}
      onClose={() => {
        panelRoot.render(null)
        if (currentBtn) currentBtn.remove()
        currentBtn = null
      }}
    />
  )
}

let lastFocusTarget = null
let focusTimer = null

document.addEventListener("focusin", (event) => {
  const el = event.target

  // Ignore anything inside our own panel
  if (el.closest("#smartreply-root")) return

  // Only handle real text inputs
  const isInput = (
    el.tagName === "TEXTAREA" ||
    (el.tagName === "INPUT" && el.type !== "hidden") ||
    el.isContentEditable
  )
  if (!isInput) return

  // Skip if same element fired again (LinkedIn fires focusin repeatedly)
  if (el === lastFocusTarget) return
  lastFocusTarget = el

  // Debounce: cancel any pending button creation, wait 300ms before acting
  clearTimeout(focusTimer)
  focusTimer = setTimeout(() => {
    try {
      // Abort silently if the extension was reloaded/updated to prevent context crashes
      if (!chrome.runtime?.id) return;
      
      chrome.storage.local.get("smartreply_enabled", (res) => {
        if (chrome.runtime.lastError) return // extension invalidated — silently bail
        if (res.smartreply_enabled !== false) createAIButton(el)
      })
    } catch (_) {
      // chrome.storage unavailable — do nothing, don't show button
    }
  }, 300)
})

// Clear lastFocusTarget on blur so re-focusing same element works
document.addEventListener("focusout", () => {
  lastFocusTarget = null
  clearTimeout(focusTimer)
})