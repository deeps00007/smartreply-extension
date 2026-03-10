import React from "react"
import { createRoot } from "react-dom/client"
import FloatingPanel from "../panel/FloatingPanel"

let currentBtn = null
let panelRoot = null

function getPlatform() {
  const h = location.hostname
  if (h === "mail.google.com") return "gmail"
  if (h === "twitter.com" || h === "x.com") return "twitter"
  if (h.includes("linkedin.com")) {
    // LinkedIn messaging/DM page or msg compose box
    if (location.pathname.includes("/messaging/")) return "linkedin-message"
    return "linkedin"
  }
  if (h.includes("reddit.com")) return "reddit"
  if (h.includes("youtube.com")) return "youtube"
  if (h.includes("web.whatsapp.com") || h === "web.whatsapp.com") return "whatsapp"
  return "generic"
}

function getMessageContext(target) {
  const platform = getPlatform()

  if (platform === "whatsapp" || platform === "linkedin-message") {
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

function createAIButton(target) {
  if (currentBtn) currentBtn.remove()

  const btn = document.createElement("button")
  btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 10h8"/><path d="M8 14h4"/></svg>`
  btn.style.cssText = `
    position: fixed;
    z-index: 2147483646;
    padding: 6px;
    background: #4f46e5;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0;
    line-height: 0;
    box-shadow: 0 2px 8px rgba(79,70,229,0.35);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s, transform 0.15s;
  `
  btn.onmouseenter = () => { btn.style.background = "#4338ca"; btn.style.transform = "scale(1.08)" }
  btn.onmouseleave = () => { btn.style.background = "#4f46e5"; btn.style.transform = "scale(1)" }

  const rect = target.getBoundingClientRect()
  btn.style.top = (rect.bottom + 4) + "px"
  btn.style.left = (rect.right - 32) + "px"

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

document.addEventListener("focusin", (event) => {
  const el = event.target
  if (el.closest("#smartreply-root")) return
  if (
    el.tagName === "TEXTAREA" ||
    (el.tagName === "INPUT" && el.type !== "hidden") ||
    el.isContentEditable
  ) {
    try {
      chrome.storage.local.get("smartreply_enabled", (res) => {
        if (chrome.runtime.lastError) return  // extension context invalidated
        if (res.smartreply_enabled !== false) createAIButton(el)
      })
    } catch (_) {
      // chrome.storage unavailable (non-extension context or invalidated) — default to enabled
      createAIButton(el)
    }
  }
})
