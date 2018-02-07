const clock = {
    seconds: 0,
    onABreak: false,
    ticking: false,
    paused: false,
    streakTimer: 0,
    pauseTimer: 0,
    ring:{},
    reset: function() {
        this.init();
    },
    start: function() {
        this.init();
        this.ticking = true;
    },
    pause: function() {
      this.paused = !this.paused;
    },
    init: function() {
      if (typeof(Storage) !== "undefined") {
        localStorage.streakTimer = this.streakTimer;
        localStorage.pauseTimer= this.pauseTimer;
      }
      this.seconds = this.streakTimer*60;
      this.onABreak = false;
      this.paused = false;
    },
    getCurrentState: function() {
        return {"event": "updateClock", "seconds": this.seconds, "onABreak": this.onABreak, "ticking": this.ticking, "paused": this.paused};
    },
    updateClock: function(tabs) {
        for (let tab of tabs) {
            // tab.url requires the `tabs` permission
            let message = {"event": "updateClock", "currentState": this.getCurrentState()};
            console.log("sending message to " + tab.id + " / " + tab.url + " / " + JSON.stringify(message));
            browser.tabs.sendMessage(tab.id,message);
        }
    },
    tick: function() {
        if(!this.ticking || this.paused) {
            return true;
        }
        if(this.seconds > 0) {
            this.seconds--;
        } else {
            this.onABreak = !this.onABreak;
            try {
            this.ring.play();
            } catch(e) { console.log("could not ring: " + e )};

            let minutes = 0;
            if(this.onABreak) {
            minutes = this.pauseTimer;
            } else {
            minutes = this.streakTimer;
            }
            this.seconds = minutes * 60;
            if(Notification.permission === "granted") {
            let text = (this.onABreak ? "Time for a " + minutes + " min break" : "Ready for a new " + minutes + " min streak?");
            let notification = new Notification("Ding !", {
                icon: 'icons/clock-48.png',
                body: text
            });
            }
        }
        browser.tabs.query({currentWindow: true}).then(this.updateClock);
        return true;
    }
};  

// If the browser allows it, ask for permissions to open a desktop notification
if ("Notification" in window) {
    if (Notification.permission !== "granted" && Notification.permission !== "denied") {
        Notification.requestPermission();
    }
}
    
// If the browser allows it, use local storage to save set durations for the next session
if (typeof(Storage) !== "undefined") {
    if(parseInt(localStorage.streakTimer)) {
        clock.streakTimer = parseInt(localStorage.streakTimer);
    }
    if(parseInt(localStorage.pauseTimer)) {
        clock.pauseTimer = parseInt(localStorage.pauseTimer);
    }
}

// Initialize and load the ring sound
clock.ring = document.createElement('audio');
clock.ring.setAttribute('src', 'sound/bell-ringing-01.mp3');

setInterval(function() {
    clock.tick();
}, 1000);

// Configure message listener
if(chrome !== undefined) {
    console.log(chrome);
    const browser = chrome;
    console.log(browser.runtime);
}
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("received message from content script: " + JSON.stringify(message));
    if (message.command === "getCurrentState") {
        sendResponse({"currentState":clock.getCurrentState()});
    } else if (message.command === "start") {
        clock.streakTimer = message.streakTimer;
        clock.pauseTimer = message.pauseTimer;
        clock.start();
    } else if (message.command === "pause") {
        clock.pause();
    }
});
