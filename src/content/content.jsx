import React from "react"
import { createRoot } from "react-dom/client"
import FloatingPanel from "../panel/FloatingPanel"

let currentBtn = null
let panelRoot = null

// Grab the original email text from Gmail's quoted reply block
function getGmailContext() {
  // Gmail quote block (reply thread)
  const quote = document.querySelector(".gmail_quote, .adn.ads, [data-message-id]")
  if (quote) return quote.innerText.slice(0, 1000).trim()
  return ""
}

// Detect if we're on Gmail
function isGmail() {
  return location.hostname === "mail.google.com"
}

// Properly insert text into a contenteditable (works with Gmail's editor)
function insertIntoContentEditable(el, text) {
  el.focus()
  // Select all existing content and replace
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
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
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

  // For Gmail: use quoted email as context; otherwise use what's in the field
  const text = isGmail()
    ? getGmailContext() || target.innerText.trim()
    : (target.value || target.innerText).trim()

  panelRoot.render(
    <FloatingPanel
      text={text}
      onInsert={(reply) => {
        if (target.isContentEditable) {
          insertIntoContentEditable(target, reply)
        } else if (target.value !== undefined) {
          target.value = reply
          // Trigger React/framework onChange listeners
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set
          if (nativeInputValueSetter) {
            nativeInputValueSetter.call(target, reply)
            target.dispatchEvent(new Event("input", { bubbles: true }))
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

  // Skip our own panel UI
  if (el.closest("#smartreply-root")) return

  if (
    el.tagName === "TEXTAREA" ||
    (el.tagName === "INPUT" && el.type !== "hidden") ||
    el.isContentEditable
  ) {
    createAIButton(el)
  }
})