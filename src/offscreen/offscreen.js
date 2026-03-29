let recognition = null;
let isDictating = false;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.target !== 'offscreen') return;

  if (message.type === 'OFFSCREEN_START_DICTATION') {
    startDictation();
  }

  if (message.type === 'OFFSCREEN_STOP_DICTATION') {
    stopDictation();
  }
});

function stopDictation() {
  isDictating = false;
  if (recognition) {
    recognition.stop();
  }
}

async function requestMicrophonePermission() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Keep it active but mute it so prompt is handled
    stream.getTracks().forEach((t) => t.stop());
    return true;
  } catch (err) {
    chrome.runtime.sendMessage({
      type: 'DICTATION_ERROR',
      error: 'Permission Denied: ' + err.message
    });
    return false;
  }
}

async function startDictation() {
  if (isDictating && recognition) {
    recognition.stop();
  }

  const hasPerm = await requestMicrophonePermission();
  if (!hasPerm) return;

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    chrome.runtime.sendMessage({
      type: 'DICTATION_ERROR',
      error: 'Browser unsupported'
    });
    return;
  }

  isDictating = true;
  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = "en-IN";

  recognition.onerror = (event) => {
    isDictating = false;
    chrome.runtime.sendMessage({
      type: 'DICTATION_ERROR',
      error: event.error === 'not-allowed' ? 'Mic Blocked' : event.error
    });
  };

  recognition.onend = () => {
    // Chrome's SpeechRecognition often auto-terminates after a pause. Restart it if still meant to be dictating.
    if (isDictating) {
      try { 
        recognition.start(); 
        return;
      } catch (e) {
        // failed to restart
      }
    }
    isDictating = false;
    chrome.runtime.sendMessage({
      type: 'DICTATION_END'
    });
  };

  recognition.onresult = (event) => {
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        let text = event.results[i][0].transcript.trim();
        chrome.runtime.sendMessage({
          type: 'DICTATION_RESULT',
          text: text
        });
      }
    }
  };

  recognition.start();
}
