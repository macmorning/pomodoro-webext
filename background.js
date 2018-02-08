const isChrome = (chrome !== undefined);

const clock = {
    seconds: 0,
    timeStarted: 0,
    alarmAt: 0,
    onABreak: false,
    ticking: false,
    paused: false,
    streakTimer: 0,
    pauseTimer: 0,
    ring: {},
    start: function () {
        clock.ticking = true;
        clock.timeStarted = Date.now();
        clock.alarmAt = clock.timeStarted + (clock.streakTimer * 60000);
        clock.paused = false;
        clock.seconds = clock.streakTimer * 60;
        clock.onABreak = false;
        if (isChrome) {
            chrome.browserAction.setIcon({path: "icons/clock_red-48.png"});
            chrome.alarms.create("alarm", { "delayInMinutes": parseInt(clock.streakTimer) });
        } else {
            browser.browserAction.setIcon({path: "icons/clock_red-48.png"});
            browser.alarms.create("alarm", { "delayInMinutes": parseInt(clock.streakTimer) });
        }
        if (typeof (Storage) !== "undefined") {
            localStorage.streakTimer = clock.streakTimer;
            localStorage.pauseTimer = clock.pauseTimer;
        }
    },
    reset: function () {
        clock.ticking = false;
        clock.paused = false;
        clock.seconds = clock.streakTimer * 60;
        clock.onABreak = false;
        if (isChrome) {
            chrome.browserAction.setIcon({path: "icons/clock-48.png"});
            chrome.alarms.clear("alarm");
        } else {
            browser.browserAction.setIcon({path: "icons/clock-48.png"});
            browser.alarms.clear("alarm");
        }
        if (typeof (Storage) !== "undefined") {
            localStorage.streakTimer = clock.streakTimer;
            localStorage.pauseTimer = clock.pauseTimer;
        }
    },
    pause: function () {
        clock.paused = !clock.paused;
    },
    getCurrentState: function () {
        if (clock.ticking) {
            clock.seconds = Math.floor((clock.alarmAt - Date.now()) / 1000);
        }
        return {
            "seconds": clock.seconds,
            "onABreak": clock.onABreak,
            "ticking": clock.ticking,
            "paused": clock.paused,
            "streakTimer": clock.streakTimer,
            "pauseTimer": clock.pauseTimer
        };
    },
    alarm: function (alarm) {
        if (!clock.ticking || clock.paused) {
            return true;
        }
        clock.onABreak = !clock.onABreak;
        try {
            clock.ring.play();
        } catch (e) {
            console.log("could not ring: " + e);
        }

        let minutes = (clock.onABreak ? clock.pauseTimer : clock.streakTimer);
        this.seconds = minutes * 60;
        clock.timeStarted = Date.now();
        clock.alarmAt = clock.timeStarted + (clock.streakTimer * 60000);
        if (isChrome) {
            chrome.alarms.clear("alarm");
            chrome.alarms.create("alarm", { "delayInMinutes": parseInt(minutes) });
            chrome.browserAction.setIcon({path: (clock.onABreak ? "icons/clock_green-48.png" : "icons/clock_red-48.png")});
        } else {
            browser.alarms.clear("alarm");
            browser.alarms.create("alarm", { "delayInMinutes": parseInt(minutes) });
            browser.browserAction.setIcon({path: (clock.onABreak ? "icons/clock_green-48.png" : "icons/clock_red-48.png")});
        }

        try {
            let text = (clock.onABreak ? "Time for a " + minutes + " min break" : "Ready for a new " + minutes + " min streak?");
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
    chrome.alarms.onAlarm.addListener(clock.alarm);
} else {
    browser.runtime.onMessage.addListener(msgListener);
    browser.alarms.onAlarm.addListener(clock.alarm);
}
