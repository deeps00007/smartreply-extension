import React from "react"
import { createRoot } from "react-dom/client"
import FloatingPanel from "../panel/FloatingPanel"

let currentBtn = null
let panelRoot = null

// Smart context detection — works on Gmail, Reddit, Twitter, LinkedIn, etc.
function getMessageContext(target) {

  // --- Gmail ---
  if (location.hostname === "mail.google.com") {
    // Quoted reply inside compose window
    const composeWrap = target.closest("[role='dialog'], .M9, .nH, form")
    if (composeWrap) {
      const quote = composeWrap.querySelector(".gmail_quote, blockquote")
      if (quote) return quote.innerText.slice(0, 1500).trim()
    }
    // Opened email body in thread view
    const emailBody = document.querySelector(".a3s.aiL, .ii.gt .a3s, .gs .ii")
    if (emailBody) return emailBody.innerText.slice(0, 1500).trim()
  }

  // --- General: walk up DOM to find the message being replied to ---
  // These selectors cover Reddit, Twitter/X, LinkedIn, YouTube, Slack, etc.
  const msgSelectors = [
    // Reddit
    "[data-testid='comment'], .usertext-body, .md",
    // Twitter / X
    "[data-testid='tweetText'], [lang]",
    // LinkedIn
    ".feed-shared-update-v2__description, .comments-comment-item__main-content",
    // YouTube
    "#content-text",
    // Generic
    "article, .message-body, .comment-body, .post-body, .post-content",
    "p, [class*='content'], [class*='body'], [class*='message'], [class*='text']"
  ]

  let el = target.parentElement
  for (let depth = 0; depth < 10; depth++) {
    if (!el) break
    for (const selector of msgSelectors) {
      try {
        const candidates = el.querySelectorAll(selector)
        for (const c of candidates) {
          // Must not be the input itself, must have real text
          if (!c.contains(target) && !target.contains(c)) {
            const txt = c.innerText?.trim()
            if (txt && txt.length > 20) return txt.slice(0, 1500)
          }
        }
      } catch(_) {}
    }
    el = el.parentElement
  }

  // Last resort: whatever is already in the field
  return (target.value || target.innerText || "").trim()
}

// Properly insert text into a contenteditable (works with Gmail's editor)
function insertIntoContentEditable(el, text) {
  el.focus()
  document.execCommand("selectAll", false, null)
  document.execCommand("insertText", false, text)
}

function createAIButton(target) {
  if (currentBtn) currentBtn.remove()

  const btn = document.createElement("button")
  btn.innerText = "AI ✨"
  btn.style.cssText = `
    position: fixed;
    z-index: 2147483646;
    padding: 5px 10px;
    background: #4f46e5;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    font-family: sans-serif;
    box-shadow: 0 2px 8px rgba(0,0,0,0.25);
  `

  const rect = target.getBoundingClientRect()
  btn.style.top  = (rect.bottom + 6) + "px"
  btn.style.left = (rect.right - 80) + "px"

  btn.onclick = () => openPanel(target)

  document.body.appendChild(btn)
  currentBtn = btn
}

function openPanel(target) {
  let container = document.getElementById("smartreply-root")

  if (!container) {
    container = document.createElement("div")
    container.id = "smartreply-root"
    document.body.appendChild(container)
  }

  if (!panelRoot) panelRoot = createRoot(container)

  const text = getMessageContext(target)

  panelRoot.render(
    <FloatingPanel
      text={text}
      onInsert={(reply) => {
        if (target.isContentEditable) {
          insertIntoContentEditable(target, reply)
        } else if (target.value !== undefined) {
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set
          if (nativeInputValueSetter) {
            nativeInputValueSetter.call(target, reply)
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

document.addEventListener("focusin", (event) => {
  const el = event.target

  if (el.closest("#smartreply-root")) return

  if (
    el.tagName === "TEXTAREA" ||
    (el.tagName === "INPUT" && el.type !== "hidden") ||
    el.isContentEditable
  ) {
    createAIButton(el)
  }
})