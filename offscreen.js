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
            const mutedTabs = message.mutedTabs || [];
            
            // Only change src if different to avoid reloading
            if (currentSrc !== soundSrc) {
                audio.src = soundSrc;
                currentSrc = soundSrc;
            }
            
            audio.volume = message.volume || 1.0;
            
            // Reset to beginning if already playing
            audio.currentTime = 0;
            
            // Set up onended handler to unmute tabs when sound finishes
            audio.onended = () => {
                console.log('Audio playback ended naturally');
                if (mutedTabs.length > 0) {
                    chrome.runtime.sendMessage({
                        type: 'UNMUTE_TABS',
                        mutedTabs: mutedTabs
                    }).catch((e) => {
                        console.warn('Could not send unmute message:', e);
                    });
                }
            };
            
            audio.play().then(() => {
                console.log('Audio started playing, will unmute tabs when finished');
                sendResponse({ success: true });
            }).catch((e) => {
                console.error('Error playing sound:', e);
                // Unmute tabs immediately if playback failed
                if (mutedTabs.length > 0) {
                    chrome.runtime.sendMessage({
                        type: 'UNMUTE_TABS',
                        mutedTabs: mutedTabs
                    });
                }
                sendResponse({ success: false, error: e.message });
            });
            
        } catch (e) {
            console.error('Error in sound handler:', e);
            sendResponse({ success: false, error: e.message });
        }
    }
    return true;
});