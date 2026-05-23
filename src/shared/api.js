export function apiCall(url, options) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type: "SMARTREPLY_FETCH", url, options },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
        } else if (!response || !response.success) {
          reject(new Error(response?.error || "API request failed"))
        } else {
          resolve(response.data)
        }
      }
    )
  })
}

export function uploadCall(url, arrayBuffer, mimeType, headers) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type: "SMARTREPLY_UPLOAD", url, arrayBuffer, mimeType, headers },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
        } else if (!response || !response.success) {
          reject(new Error(response?.error || "Upload failed"))
        } else {
          resolve(response.data)
        }
      }
    )
  })
}
