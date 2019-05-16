const clock = {
    seconds: 0,
    timeStarted: 0,
    alarmAt: 0,
    onABreak: false,
    ticking: false,
    paused: false,
    streakTimer: 30,
    pauseTimer: 5,
    ring: {},
    volume: 100,
    start: () => {
        clock.ticking = true;
        clock.timeStarted = Date.now();
        clock.alarmAt = clock.timeStarted + (clock.streakTimer * 60000);
        clock.paused = false;
        clock.seconds = clock.streakTimer * 60;
        clock.onABreak = false;
        chrome.browserAction.setBadgeText({"text": " "});
        chrome.browserAction.setBadgeBackgroundColor({"color":"red"});
        chrome.browserAction.setTitle({title: "on a streak"});
        chrome.alarms.create("alarm", { "delayInMinutes": parseInt(clock.streakTimer) });
        if (typeof (Storage) !== "undefined") {
            localStorage.streakTimer = clock.streakTimer;
            localStorage.pauseTimer = clock.pauseTimer;
        }
    },
    reset: () => {
        clock.ticking = false;
        clock.paused = false;
        clock.seconds = clock.streakTimer * 60;
        clock.onABreak = false;
        chrome.browserAction.setBadgeText({"text": ""});
        chrome.browserAction.setBadgeBackgroundColor({"color":"red"});
        chrome.browserAction.setTitle({title: "not ticking"});
        chrome.alarms.clear("alarm");
        if (typeof (Storage) !== "undefined") {
            localStorage.streakTimer = clock.streakTimer;
            localStorage.pauseTimer = clock.pauseTimer;
        }
    },
    pause: () => {
        clock.paused = !clock.paused;
    },
    getCurrentState: () => {
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
    loadOptions: () => {
        console.log("loading options > ");
        console.log(localStorage);
        clock.volume = localStorage.volume;
        if (clock.volume === undefined) {
            clock.volume = 100;
        }
    },
    alarm: (alarm) => {
        clock.loadOptions();
        if (!clock.ticking || clock.paused) {
            return true;
        }
        clock.onABreak = !clock.onABreak;
        try {
            clock.ring.volume = clock.volume / 100;
            clock.ring.play();
        } catch (e) {
            console.log("could not ring: " + e);
        }

        let minutes = (clock.onABreak ? clock.pauseTimer : clock.streakTimer);
        clock.seconds = minutes * 60;
        clock.timeStarted = Date.now();
        clock.alarmAt = clock.timeStarted + (clock.seconds * 1000);
        chrome.alarms.clear("alarm");
        chrome.alarms.create("alarm", { "delayInMinutes": parseInt(minutes) });
        chrome.browserAction.setBadgeText({"text": " "});
        chrome.browserAction.setBadgeBackgroundColor({"color":(clock.onABreak ? "green" : "red")});
        chrome.browserAction.setTitle({title: "on a " + (clock.onABreak ? "break" : "streak")});

        try {
            let text = (clock.onABreak ? "Time for a " + minutes + " min break" : "Ready for a new " + minutes + " min streak?");
            let notifDetail = {
                type: "basic",
                title: "Ding!",
                iconUrl: "icons/clock-48.png",
                message: text
            };
            chrome.notifications.create(notifDetail);
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
clock.ring.setAttribute("src", "sound/bell-ringing-02.mp3");

/**
 * Message listener
 * @param {Object} message message received
 */
const msgListener = (message, sender, sendResponse) => {
    console.log("received message from browser action: " + JSON.stringify(message));
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

chrome.runtime.onMessage.addListener(msgListener);
chrome.alarms.onAlarm.addListener(clock.alarm);
chrome.storage.onChanged.addListener(clock.loadOptions);
clock.loadOptions();
