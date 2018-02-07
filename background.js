const clock = {
    seconds: 0,
    onABreak: false,
    ticking: false,
    paused: false,
    streakTimer: 0,
    pauseTimer: 0,
    ring:{},
    start: function() {
        this.ticking = true;
        if (typeof(Storage) !== "undefined") {
            localStorage.streakTimer = this.streakTimer;
            localStorage.pauseTimer= this.pauseTimer;
        }
    },
    pause: function() {
      this.paused = !this.paused;
    },
    getCurrentState: function() {
        return {
            "seconds": this.seconds, 
            "onABreak": this.onABreak, 
            "ticking": this.ticking, 
            "paused": this.paused,
            "streakTimer": this.streakTimer,
            "pauseTimer": this.pauseTimer
        };
    },
    tick: function() {
        console.log("tick - " + this.seconds);
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
        clock.seconds = clock.streakTimer*60;
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
        console.log("sending response: " + JSON.stringify(clock.getCurrentState()));
        sendResponse(clock.getCurrentState());
    } else if (message.command === "start") {
        clock.streakTimer = message.streakTimer;
        clock.pauseTimer = message.pauseTimer;
        clock.start();
        sendResponse(true);
    } else if (message.command === "pause") {
        clock.pause();
        sendResponse(true);
    }
});
