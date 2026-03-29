let creating
let currentTabId = null

async function setupOffscreenDocument(path) {
  // Check all windows in offscreen context types
  const offscreenUrl = chrome.runtime.getURL(path)
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [offscreenUrl]
  })

  if (existingContexts.length > 0) return

  // If a creation is already in progress, wait for it map
  if (creating) {
    await creating
  } else {
    creating = chrome.offscreen.createDocument({
      url: path,
      reasons: ['USER_MEDIA'],
      justification: 'Speech Recognition for Dictation dictation tool'
    })
    await creating
    creating = null
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "START_DICTATION") {
    currentTabId = sender.tab.id
    setupOffscreenDocument('src/offscreen/offscreen.html').then(() => {
      chrome.runtime.sendMessage({
        type: 'OFFSCREEN_START_DICTATION',
        target: 'offscreen'
      })
    })
    sendResponse({ status: "starting" })
    return true
  }

  if (message.type === "STOP_DICTATION") {
    chrome.runtime.sendMessage({
      type: 'OFFSCREEN_STOP_DICTATION',
      target: 'offscreen'
    })
  }

  // Forward results from offscreen back to the content script
  if (
    message.type === "DICTATION_RESULT" ||
    message.type === "DICTATION_ERROR" ||
    message.type === "DICTATION_END"
  ) {
    if (currentTabId) {
      chrome.tabs.sendMessage(currentTabId, message)
    }
  }
})
