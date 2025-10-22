// Offscreen document for audio playback in Manifest V3
const audio = document.getElementById('notificationSound');
let currentSrc = '';

// Preload default sound
audio.preload = 'auto';
audio.src = 'sound/bell-ringing-02.mp3';
currentSrc = audio.src;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'PLAY_SOUND') {
        try {
            const soundSrc = message.soundData || 'sound/bell-ringing-02.mp3';
            
            // Only change src if different to avoid reloading
            if (currentSrc !== soundSrc) {
                audio.src = soundSrc;
                currentSrc = soundSrc;
            }
            
            audio.volume = message.volume || 1.0;
            
            // Reset to beginning if already playing
            audio.currentTime = 0;
            
            audio.play().then(() => {
                console.log('Audio started playing');
                sendResponse({ success: true });
            }).catch((e) => {
                console.error('Error playing sound:', e);
                sendResponse({ success: false, error: e.message });
            });
            
            // Stop after 5 seconds
            setTimeout(() => {
                if (!audio.paused) {
                    audio.pause();
                    audio.currentTime = 0;
                }
            }, 5000);
            
        } catch (e) {
            console.error('Error in sound handler:', e);
            sendResponse({ success: false, error: e.message });
        }
    }
    return true;
});