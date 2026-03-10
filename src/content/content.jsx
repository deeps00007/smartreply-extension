import React from "react"
import { createRoot } from "react-dom/client"
import FloatingPanel from "../panel/FloatingPanel"

let currentBtn = null
let panelRoot = null

function getPlatform() {
  const h = location.hostname
  if (h === "mail.google.com")              return "gmail"
  if (h === "twitter.com" || h === "x.com") return "twitter"
  if (h.includes("linkedin.com"))           return "linkedin"
  if (h.includes("reddit.com"))             return "reddit"
  if (h.includes("youtube.com"))            return "youtube"
  if (h.includes("web.whatsapp.com") || h === "web.whatsapp.com") return "whatsapp"
  return "generic"
}

function getMessageContext(target) {
  const platform = getPlatform()

  if (platform === "whatsapp") {
    // Enhance mode: read what the user has already typed in the compose box
    const typed = (target.value || target.innerText || "").trim()
    return typed  // may be empty if user hasn't typed yet
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
    const commentBox = target.closest(".comments-comment-box, .comments-comment-texteditor, .comments-comment-box-comment")
    if (commentBox) {
      let el = commentBox.parentElement
      for (let i = 0; i < 15; i++) {
        if (!el) break
        const postText = el.querySelector(".update-components-text, .feed-shared-update-v2__commentary, .update-components-text__text-view")
        if (postText && !postText.contains(target)) {
          const txt = postText.innerText.trim()
          if (txt.length > 10) return txt.slice(0, 1500)
        }
        el = el.parentElement
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
      } catch(_) {}
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

function createAIButton(target) {
  if (currentBtn) currentBtn.remove()

  const btn = document.createElement("button")
  btn.innerText = "AI ?"
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
  const platform = getPlatform()
  // WhatsApp enhance mode: pass the typed text as 'enhanceText'
  const isEnhance = platform === "whatsapp"

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
