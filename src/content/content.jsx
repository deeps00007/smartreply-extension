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

function createAIButton(target) {
  if (currentBtn) currentBtn.remove()

  const btn = document.createElement("button")
  btn.textContent = "SR"
  btn.title = "SmartReply"
  btn.style.cssText = [
    "position:fixed",
    "z-index:2147483646",
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
  btn.onmouseenter = () => {
    btn.style.opacity = "1"
    btn.style.boxShadow = "0 2px 10px rgba(79,70,229,0.35)"
    btn.style.transform = "scale(1.08)"
  }
  btn.onmouseleave = () => {
    btn.style.opacity = "0.9"
    btn.style.boxShadow = "0 1px 6px rgba(0,0,0,0.15)"
    btn.style.transform = "scale(1)"
  }

  const rect = target.getBoundingClientRect()
  btn.style.top = (rect.bottom + 6) + "px"
  btn.style.left = (rect.right - 34) + "px"

  btn.onclick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (target && typeof target.blur === "function") target.blur()
    openPanel(target)
  }
  document.body.appendChild(btn)
  currentBtn = btn
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
