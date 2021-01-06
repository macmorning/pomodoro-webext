const db = {
    indexedDB: null,
    addEvent: (eventName) => {
        let eventObject = {
            "eventDate": new Date().toISOString(),
            "event": eventName.toString(),
            "currentState": (clock && clock.onABreak ? "break" : "streak")
        };
        let records = [eventObject];

        if (db.indexedDB) {
            const insert_transaction = db.indexedDB.transaction("activity", "readwrite");
            const objectStore = insert_transaction.objectStore("activity");
            return new Promise((resolve, reject) => {
                insert_transaction.oncomplete = function () {
                    console.log("Insert done");
                    resolve(true);
                }
                insert_transaction.onerror = function (e) {
                    console.error("Problem inserting record");
                    console.error(e);
                    resolve(false);
                }
                records.forEach(record => {
                    let request = objectStore.add(record);
                    request.onsuccess = function () {
                        console.log("Added: ", record);
                    }
                });
            });
        }
    },
    createDB: () => {
        const request = window.indexedDB.open('stats');
        request.onerror = function (event) {
            console.log("Problem opening DB.");
        }
        request.onupgradeneeded = function (event) {
            db.indexedDB = event.target.result;
            let objectStore = db.indexedDB.createObjectStore('activity', {
                keyPath: 'eventDate'
            });
            objectStore.transaction.oncomplete = function (event) {
                console.log("ObjectStore Created.");
            }
        }
        request.onsuccess = function (event) {
            db.indexedDB = event.target.result;
            console.log("DB opened");
            db.addEvent("loaded");
            db.indexedDB.onerror = (event) => {
                console.error("Failed to open DB")
            }
        }
    },
    getStats: () => {
        if (db.indexedDB) {
            const read_transaction = db.indexedDB.transaction("activity", "readonly");
            const objectStore = read_transaction.objectStore("activity");
            return new Promise((resolve, reject) => {
                read_transaction.oncomplete = function () {
                    console.log("Get transaction complete");
                }
                read_transaction.onerror = function () {
                    console.error("Problem getting records")
                }
                let request = objectStore.getAll();
                request.onsuccess = function (event) {
                    resolve(event.target.result);
                }
            });
        }
    }
}
const clock = {
    seconds: 0,
    timeStarted: 0,
    alarmAt: 0,
    onABreak: false,
    ticking: false,
    paused: false,
    streakTimer: 30,
    pauseTimer: 5,
    paused: false,
    ring: {},
    volume: 100,
    showMinutes: false,
    updateBadge: (minutes) => {
        let color, text;
        if (clock.paused) {
            color = "LightSkyBlue";
            title = "paused";
        } else if (clock.onABreak) {
            color = "green";
            title = "on a break";
        } else {
            color = "DarkRed";
            title = "on a streak";
        }
        if (!clock.showMinutes) {
            try {
                chrome.browserAction.setBadgeText({"text": "0"});
                chrome.browserAction.setBadgeTextColor({"color": color});
            } catch(e) {
                chrome.browserAction.setBadgeText({"text": " "});
            }
        } else {
            chrome.browserAction.setBadgeText({"text": minutes.toString()});
            try {
                chrome.browserAction.setBadgeTextColor({"color":"white"});
            } catch(e) {}
        }
        chrome.browserAction.setBadgeBackgroundColor({"color": color});
        chrome.browserAction.setTitle({title: title});
        return true;
    },
    start: () => {
        clock.ticking = true;
        clock.timeStarted = Date.now();
        clock.alarmAt = clock.timeStarted + (clock.streakTimer * 60000);
        clock.paused =  false;
        clock.seconds = clock.streakTimer * 60;
        clock.onABreak = false;
        clock.updateBadge(clock.streakTimer);
        chrome.alarms.create("alarm", { "delayInMinutes": parseInt(clock.streakTimer) });
        chrome.alarms.clear("minutes");
        chrome.alarms.create("minutes", { "delayInMinutes": 1, "periodInMinutes": 1 });
        db.addEvent("started");
        return true;
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
        chrome.alarms.clear("minutes");
        db.addEvent("stopped");
        return true;
    },
    pause: () => {
        if (!clock.ticking) { return false; }
        clock.paused = !clock.paused;
        if (clock.paused) {
            clock.seconds = Math.floor((clock.alarmAt - Date.now()) / 1000);
            chrome.alarms.clear("alarm");
            chrome.alarms.clear("minutes");
            db.addEvent("paused");
        } if (!clock.paused) {
            clock.alarmAt = Date.now() + (clock.seconds * 1000);
            chrome.alarms.create("alarm", { "delayInMinutes": clock.seconds*60 });
            chrome.alarms.create("minutes", { "delayInMinutes": 1, "periodInMinutes": 1 });
            db.addEvent("unpaused");
        }
        clock.updateBadge(Math.round(clock.seconds / 60));
        return true;
    },
    getCurrentState: () => {
        if (clock.ticking && !clock.paused) {
            clock.seconds = Math.floor((clock.alarmAt - Date.now()) / 1000);
        }
        return {
            "seconds": clock.seconds,
            "paused": clock.paused,
            "onABreak": clock.onABreak,
            "ticking": clock.ticking,
            "streakTimer": clock.streakTimer,
            "pauseTimer": clock.pauseTimer
        };
    },
    loadOptions: () => {
        console.log("loading options");
        clock.volume = localStorage.volume;
        if (clock.volume === undefined) {
            clock.volume = 100;
        }
        clock.showMinutes = (localStorage.showMinutes === true || localStorage.showMinutes === "true" || localStorage.showMinutes === undefined);
        clock.customSoundData = localStorage.customSoundData || "";
        clock.customSound = (clock.customSoundData !== "" && (localStorage.customSound === true || localStorage.customSound === "true"));
    },
    alarm: (alarm) => {
        clock.loadOptions();
        if (!clock.ticking || clock.paused) {
            return true;
        }

        if (alarm && alarm.name === "minutes" && clock.showMinutes) {
            clock.seconds = Math.floor((clock.alarmAt - Date.now()) / 1000);
            let remaining = Math.round(clock.seconds / 60);
            chrome.browserAction.setBadgeText({"text": remaining.toString()});
        } else if (!alarm || alarm.name !== "minutes") {
            clock.onABreak = !clock.onABreak;
            db.addEvent("switched");
            try {
                if (clock.customSound) {
                    clock.ring.setAttribute("src", clock.customSoundData);
                } else {
                    clock.ring.setAttribute("src", "sound/bell-ringing-02.mp3");
                }
                clock.ring.volume = clock.volume / 100;
                clock.ring.play();
                window.setTimeout(() => {
                    clock.ring.pause();
                }, 5000);
            } catch (e) {
                console.warn("could not ring: " + e);
            }
    
            let minutes = (clock.onABreak ? clock.pauseTimer : clock.streakTimer);
            clock.seconds = minutes * 60;
            clock.timeStarted = Date.now();
            clock.alarmAt = clock.timeStarted + (clock.seconds * 1000);
            clock.updateBadge(minutes);
            chrome.alarms.clear("alarm");
            chrome.alarms.create("alarm", { "delayInMinutes": parseInt(minutes) });
            chrome.alarms.clear("minutes");
            chrome.alarms.create("minutes", { "delayInMinutes": 1, "periodInMinutes": 1 });
    
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
                console.warn("could not display notification: " + e);
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


/**
 * Message listener
 * @param {Object} message message received
 */
const msgListener = (message, sender, sendResponse) => {
    console.log("received message from browser action: " + JSON.stringify(message));
    if (message && message.streakTimer && message.pauseTimer) {
        clock.streakTimer = message.streakTimer;
        clock.pauseTimer = message.pauseTimer;
        if (typeof (Storage) !== "undefined") {
            localStorage.streakTimer = clock.streakTimer;
            localStorage.pauseTimer = clock.pauseTimer;
        }
    }
    clock.loadOptions();
    if (message.command === "getCurrentState") {
        console.log("sending response: " + JSON.stringify(clock.getCurrentState()));
        sendResponse(clock.getCurrentState());
    } else if (message.command === "start") {
        clock.start();
        sendResponse(true);
    } else if (message.command === "skip") {
        clock.alarm();
        sendResponse(true);
    } else if (message.command === "reset") {
        clock.reset();
        sendResponse(true);
    } else if (message.command === "pause") {
        clock.pause();
        sendResponse(true);
    } else if (message.command === "getStats") {
        sendResponse(db.getStats());
    }
};

// Initialize and load the ring sound
clock.ring = document.createElement("audio");
chrome.runtime.onMessage.addListener(msgListener);
chrome.alarms.onAlarm.addListener(clock.alarm);
chrome.storage.onChanged.addListener(clock.loadOptions);
clock.loadOptions();
db.createDB();
