chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "SMARTREPLY_FETCH") {
    fetch(request.url, request.options)
      .then(async (res) => {
        const text = await res.text()
        let data = text
        try { data = JSON.parse(text) } catch {}
        if (res.ok) {
          sendResponse({ success: true, data })
        } else {
          sendResponse({ success: false, error: `HTTP ${res.status}`, data })
        }
      })
      .catch((err) => {
        sendResponse({ success: false, error: err.message || "Network error" })
      })
    return true
  }

  if (request.type === "SMARTREPLY_UPLOAD") {
    try {
      const blob = new Blob([new Uint8Array(request.arrayBuffer)], { type: request.mimeType })
      const formData = new FormData()
      formData.append("file", blob, "recording.webm")

      fetch(request.url, {
        method: "POST",
        headers: request.headers,
        body: formData
      })
        .then(async (res) => {
          const text = await res.text()
          let data = text
          try { data = JSON.parse(text) } catch {}
          if (res.ok) {
            sendResponse({ success: true, data })
          } else {
            sendResponse({ success: false, error: `HTTP ${res.status}`, data })
          }
        })
        .catch((err) => {
          sendResponse({ success: false, error: err.message || "Network error" })
        })
    } catch (err) {
      sendResponse({ success: false, error: err.message || "Upload error" })
    }
    return true
  }
})
