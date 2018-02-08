const isChrome = (chrome !== undefined);

const clock = {
    seconds: 0,
    onABreak: false,
    ticking: false,
    paused: false,
    streakTimer: 0,
    pauseTimer: 0,
    ring: {},
    start: function () {
        this.ticking = true;
        this.paused = false;
        this.seconds = this.streakTimer * 60;
        this.onABreak = false;
        if (isChrome) {
            chrome.browserAction.setIcon({path: "icons/clock_red-48.png"});
        } else {
            browser.browserAction.setIcon({path: "icons/clock_red-48.png"});
        }
        if (typeof (Storage) !== "undefined") {
            localStorage.streakTimer = this.streakTimer;
            localStorage.pauseTimer = this.pauseTimer;
        }
    },
    reset: function () {
        this.ticking = false;
        this.paused = false;
        this.seconds = this.streakTimer * 60;
        this.onABreak = false;
        if (isChrome) {
            chrome.browserAction.setIcon({path: "icons/clock-48.png"});
        } else {
            browser.browserAction.setIcon({path: "icons/clock-48.png"});
        }
        if (typeof (Storage) !== "undefined") {
            localStorage.streakTimer = this.streakTimer;
            localStorage.pauseTimer = this.pauseTimer;
        }
    },
    pause: function () {
        this.paused = !this.paused;
    },
    getCurrentState: function () {
        return {
            "seconds": this.seconds,
            "onABreak": this.onABreak,
            "ticking": this.ticking,
            "paused": this.paused,
            "streakTimer": this.streakTimer,
            "pauseTimer": this.pauseTimer
        };
    },
    tick: function () {
        if (!this.ticking || this.paused) {
            return true;
        }
        if (this.seconds > 0) {
            this.seconds--;
        } else {
            this.onABreak = !this.onABreak;
            try {
                this.ring.play();
            } catch (e) {
                console.log("could not ring: " + e);
            }

            let minutes = 0;
            if (this.onABreak) {
                if (isChrome) {
                    chrome.browserAction.setIcon({path: "icons/clock_green-48.png"});
                } else {
                    browser.browserAction.setIcon({path: "icons/clock_green-48.png"});
                }
                minutes = this.pauseTimer;
            } else {
                if (isChrome) {
                    chrome.browserAction.setIcon({path: "icons/clock_red-48.png"});
                } else {
                    browser.browserAction.setIcon({path: "icons/clock_red-48.png"});
                }
                minutes = this.streakTimer;
            }
            this.seconds = minutes * 60;
            try {
                let text = (this.onABreak ? "Time for a " + minutes + " min break" : "Ready for a new " + minutes + " min streak?");
                let notifDetail = {
                    type: "basic",
                    title: "Ding!",
                    iconUrl: "icons/clock-48.png",
                    message: text
                };
                if (isChrome) {
                    chrome.notifications.create(notifDetail);
                } else {
                    browser.notifications.create(notifDetail);
                }
            } catch (e) {
                console.log("could not display notification: " + e);
            }
        }
        return true;
    }
};

// If the browser allows it, use local storage to save set durations for the next session
if (typeof (Storage) !== "undefined") {
    if (parseInt(localStorage.streakTimer)) {
        clock.streakTimer = parseInt(localStorage.streakTimer);
        clock.seconds = clock.streakTimer * 60;
    }
    if (parseInt(localStorage.pauseTimer)) {
        clock.pauseTimer = parseInt(localStorage.pauseTimer);
    }
}

// Initialize and load the ring sound
clock.ring = document.createElement("audio");
clock.ring.setAttribute("src", "sound/bell-ringing-01.mp3");

setInterval(function () {
    clock.tick();
}, 1000);

// Configure message listener
var msgListener = function (message, sender, sendResponse) {
    console.log("received message from content script: " + JSON.stringify(message));
    if (message.command === "getCurrentState") {
        console.log("sending response: " + JSON.stringify(clock.getCurrentState()));
        sendResponse(clock.getCurrentState());
    } else if (message.command === "start") {
        clock.streakTimer = message.streakTimer;
        clock.pauseTimer = message.pauseTimer;
        clock.start();
        sendResponse(true);
    } else if (message.command === "reset") {
        clock.streakTimer = message.streakTimer;
        clock.pauseTimer = message.pauseTimer;
        clock.reset();
        sendResponse(true);
    } else if (message.command === "pause") {
        clock.pause();
        sendResponse(true);
    }
};

if (isChrome) {
    chrome.runtime.onMessage.addListener(msgListener);
} else {
    browser.runtime.onMessage.addListener(msgListener);
}
