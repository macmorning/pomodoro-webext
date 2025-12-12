// Universal background script for Manifest V2 (Firefox) and V3 (Chrome/Edge)
const isFirefox = typeof browser !== 'undefined';
const isManifestV3 = chrome.runtime.getManifest().manifest_version === 3;
const browserAPI = isFirefox ? browser : chrome;

const db = {
    indexedDB: null,
    addEvent: async (eventName) => {
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
        return new Promise((resolve, reject) => {
            const indexedDB = isManifestV3 ? self.indexedDB : window.indexedDB;
            const request = indexedDB.open('stats');
            request.onerror = function (event) {
                console.log("Problem opening DB.");
                reject(event);
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
                resolve(db.indexedDB);
            }
        });
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
                    reject();
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
    seconds: 1800, // Default to 30 minutes
    timeStarted: 0,
    alarmAt: 0,
    onABreak: false,
    ticking: false,
    paused: false,
    streakTimer: 30,
    pauseTimer: 5,
    inARow: 0,
    ring: null,
    volume: 100,
    showMinutes: false,
    loopDisabled: false,
    useAdvancedTimers: false,
    soundEnabled: true,
    advancedTimers: [30, 5],
    advancedTimersIndex: 0,
    customSound: false,
    customSoundData: "",
    muteOtherTabs: false,
    initialized: false,

    updateBadge: async (minutes) => {


        let color;
        let title;
        if (clock.paused) {
            color = "lightskyblue";
            title = "paused";
        } else if (clock.onABreak) {
            color = "green";
            title = "on a break";
        } else {
            color = "darkred";
            title = "on a streak";
        }

        const actionAPI = isManifestV3 ? browserAPI.action : browserAPI.browserAction;

        if (!clock.showMinutes) {
            try {
                await actionAPI.setBadgeText({ "text": "0" });
                if (actionAPI.setBadgeTextColor) {
                    await actionAPI.setBadgeTextColor({ "color": color });
                }
            } catch (e) {
                await actionAPI.setBadgeText({ "text": " " });
            }
        } else {
            await actionAPI.setBadgeText({ "text": minutes.toString() });
            try {
                if (actionAPI.setBadgeTextColor) {
                    await actionAPI.setBadgeTextColor({ "color": "white" });
                }
            } catch (e) { }
        }
        await actionAPI.setBadgeBackgroundColor({ "color": color });
        await actionAPI.setTitle({ "title": title });
        return true;
    },

    start: async () => {
        clock.ticking = true;
        clock.timeStarted = Date.now();
        let timer = 0;
        if (clock.useAdvancedTimers) {
            // Validate advanced timers array
            if (!clock.advancedTimers || !Array.isArray(clock.advancedTimers) || clock.advancedTimers.length === 0) {
                console.warn("Invalid advancedTimers, using default");
                clock.advancedTimers = [30, 5];
                clock.advancedTimersIndex = 0;
            }
            
            // Ensure index is valid
            if (clock.advancedTimersIndex >= clock.advancedTimers.length) {
                clock.advancedTimersIndex = 0;
            }
            
            timer = clock.advancedTimers[clock.advancedTimersIndex];
            
            // Validate the timer value
            if (isNaN(timer) || timer <= 0) {
                console.warn("Invalid timer value:", timer, "using default 30");
                timer = 30;
            }
            
            clock.advancedTimersIndex++;
        } else {
            timer = clock.streakTimer;
            // Validate streak timer
            if (isNaN(timer) || timer <= 0) {
                console.warn("Invalid streakTimer:", timer, "using default 30");
                timer = 30;
                clock.streakTimer = 30;
            }
        }
        
        console.log("Starting timer with duration:", timer, "minutes");
        
        clock.alarmAt = clock.timeStarted + (timer * 60000);
        clock.seconds = timer * 60;
        clock.paused = false;
        clock.onABreak = false;
        await clock.updateBadge(timer);
        await browserAPI.alarms.create("alarm", { "when": clock.alarmAt });
        await browserAPI.alarms.clear("minutes");
        await browserAPI.alarms.create("minutes", { "delayInMinutes": 1, "periodInMinutes": 1 });
        await clock.saveState();
        db.addEvent("started");
        return true;
    },

    reset: async () => {
        clock.ticking = false;
        clock.paused = false;
        if (clock.useAdvancedTimers) {
            clock.seconds = clock.advancedTimers[0] * 60;
        } else {
            clock.seconds = clock.streakTimer * 60;
        }
        clock.onABreak = false;
        clock.advancedTimersIndex = 0;
        clock.inARow = 0;

        const actionAPI = isManifestV3 ? browserAPI.action : browserAPI.browserAction;
        await actionAPI.setBadgeText({ "text": "" });
        await actionAPI.setBadgeBackgroundColor({ "color": "darkred" });
        await actionAPI.setTitle({ title: "not ticking" });
        await browserAPI.alarms.clear("alarm");
        await browserAPI.alarms.clear("minutes");
        await clock.saveState();
        db.addEvent("stopped");
        return true;
    },

    pause: async () => {
        if (!clock.ticking) { return false; }
        clock.paused = !clock.paused;
        if (clock.paused) {
            clock.seconds = Math.floor((clock.alarmAt - Date.now()) / 1000);
            await browserAPI.alarms.clear("alarm");
            await browserAPI.alarms.clear("minutes");
            db.addEvent("paused");
        } else if (!clock.paused) {
            clock.alarmAt = Date.now() + (clock.seconds * 1000);
            await browserAPI.alarms.create("alarm", { "when": clock.alarmAt });
            await browserAPI.alarms.create("minutes", { "delayInMinutes": 1, "periodInMinutes": 1 });
            db.addEvent("unpaused");
        }
        await clock.updateBadge(Math.round(clock.seconds / 60));
        await clock.saveState();
        return true;
    },

    getCurrentState: () => {
        if (clock.ticking && !clock.paused) {
            clock.seconds = Math.floor((clock.alarmAt - Date.now()) / 1000);
        }

        // If not ticking and seconds is 0, set it to the streak timer duration
        if (!clock.ticking && (!clock.seconds || clock.seconds === 0)) {
            clock.seconds = (clock.streakTimer || 30) * 60;
        }

        // Ensure all values are valid
        return {
            "seconds": clock.seconds || (clock.streakTimer || 30) * 60,
            "paused": clock.paused || false,
            "onABreak": clock.onABreak || false,
            "ticking": clock.ticking || false,
            "streakTimer": clock.streakTimer || 30,
            "pauseTimer": clock.pauseTimer || 5,
            "advancedTimers": clock.advancedTimers || [30, 5],
            "useAdvancedTimers": clock.useAdvancedTimers || false,
            "loopDisabled": clock.loopDisabled || false,
            "alarmAt": clock.alarmAt || 0,
            "inARow": clock.inARow || 0
        };
    },

    loadOptions: async () => {

        try {
            const result = await browserAPI.storage.local.get([
                'volume', 'showMinutes', 'loopDisabled',
                'useAdvancedTimers', 'soundEnabled', 'customSoundData', 'customSound', 'advancedTimers', 'muteOtherTabs'
            ]);

            clock.volume = result.volume !== undefined ? result.volume : 100;
            clock.showMinutes = result.showMinutes !== undefined ? result.showMinutes : true;
            clock.loopDisabled = result.loopDisabled !== undefined ? result.loopDisabled : false;
            clock.useAdvancedTimers = result.useAdvancedTimers !== undefined ? result.useAdvancedTimers : false;
            clock.soundEnabled = result.soundEnabled !== undefined ? result.soundEnabled : true;
            clock.customSoundData = result.customSoundData || "";
            clock.customSound = result.customSound !== undefined ? result.customSound : false;
            clock.advancedTimers = result.advancedTimers || [30, 5];
            clock.muteOtherTabs = result.muteOtherTabs !== undefined ? result.muteOtherTabs : false;
        } catch (e) {
            console.warn("could not load options from storage, trying localStorage: " + e);
            // Fallback to localStorage for compatibility
            if (typeof localStorage !== 'undefined') {
                clock.volume = localStorage.volume || 100;
                clock.showMinutes = (localStorage.showMinutes === true || localStorage.showMinutes === "true" || localStorage.showMinutes === undefined);
                clock.loopDisabled = (localStorage.loopDisabled === true || localStorage.loopDisabled === "true");
                clock.useAdvancedTimers = (localStorage.useAdvancedTimers === true || localStorage.useAdvancedTimers === "true");
                clock.soundEnabled = (localStorage.soundEnabled === undefined || localStorage.soundEnabled === true || localStorage.soundEnabled === "true");
                clock.customSoundData = localStorage.customSoundData || "";
                clock.customSound = (clock.customSoundData !== "" && (localStorage.customSound === true || localStorage.customSound === "true"));
                clock.muteOtherTabs = (localStorage.muteOtherTabs === true || localStorage.muteOtherTabs === "true");
                try {
                    clock.advancedTimers = JSON.parse(localStorage.advancedTimers);
                } catch (e) {
                    clock.advancedTimers = [30, 5];
                }
            }
        }
    },

    saveState: async () => {
        try {
            await browserAPI.storage.local.set({
                clockState: {
                    seconds: clock.seconds,
                    timeStarted: clock.timeStarted,
                    alarmAt: clock.alarmAt,
                    onABreak: clock.onABreak,
                    ticking: clock.ticking,
                    paused: clock.paused,
                    streakTimer: clock.streakTimer,
                    pauseTimer: clock.pauseTimer,
                    inARow: clock.inARow,
                    advancedTimersIndex: clock.advancedTimersIndex
                }
            });
        } catch (e) {
            console.warn("could not save state: " + e);
        }
    },

    loadState: async () => {
        try {
            const result = await browserAPI.storage.local.get(['clockState']);
            if (result.clockState) {
                const state = result.clockState;
                clock.seconds = state.seconds || 0;
                clock.timeStarted = state.timeStarted || 0;
                clock.alarmAt = state.alarmAt || 0;
                clock.onABreak = state.onABreak || false;
                clock.ticking = state.ticking || false;
                clock.paused = state.paused || false;
                clock.streakTimer = state.streakTimer || 30;
                clock.pauseTimer = state.pauseTimer || 5;
                clock.inARow = state.inARow || 0;
                clock.advancedTimersIndex = state.advancedTimersIndex || 0;

                // If we were ticking and not paused, restore the timer state
                if (clock.ticking && !clock.paused && clock.alarmAt > 0) {
                    const now = Date.now();
                    if (clock.alarmAt > now) {
                        // Timer is still running, update seconds to current remaining time
                        clock.seconds = Math.floor((clock.alarmAt - now) / 1000);

                        
                        // Restore the badge
                        await clock.updateBadge(Math.round(clock.seconds / 60));
                        
                        // Ensure minute alarm is running for badge updates
                        await browserAPI.alarms.clear("minutes");
                        await browserAPI.alarms.create("minutes", { "delayInMinutes": 1, "periodInMinutes": 1 });
                    } else {
                        // Timer should have already fired, but background script was killed
                        console.log("Timer expired while background script was inactive, triggering alarm");
                        await clock.alarm();
                    }
                }
            }
        } catch (e) {
            console.warn("could not load state: " + e);
        }
    },

    offscreenReady: false,
    audioQueue: [],

    ensureOffscreenDocument: async () => {
        if (isManifestV3 && !isFirefox && !clock.offscreenReady) {
            try {
                // Check if offscreen document already exists
                const existingContexts = await chrome.runtime.getContexts({
                    contextTypes: ['OFFSCREEN_DOCUMENT']
                });

                if (existingContexts.length === 0) {
                    await chrome.offscreen.createDocument({
                        url: 'offscreen.html',
                        reasons: ['AUDIO_PLAYBACK'],
                        justification: 'Play notification sound for pomodoro timer'
                    });
                }
                clock.offscreenReady = true;
                console.log("Offscreen document ready");
            } catch (e) {
                console.warn("Could not create offscreen document: " + e);
                clock.offscreenReady = false;
            }
        }
    },

    muteAllOtherTabs: async () => {
        // Check if we have tabs permission
        const hasPermission = await browserAPI.permissions.contains({ permissions: ['tabs'] });
        if (!hasPermission || !clock.muteOtherTabs) {
            return [];
        }

        try {
            const tabs = await browserAPI.tabs.query({ audible: true });
            const mutedTabs = [];

            for (const tab of tabs) {
                if (!tab.mutedInfo.muted) {
                    await browserAPI.tabs.update(tab.id, { muted: true });
                    mutedTabs.push(tab.id);
                    console.log(`Muted tab ${tab.id}`);
                }
            }

            return mutedTabs;
        } catch (e) {
            console.warn("Could not mute tabs: " + e);
            return [];
        }
    },

    unmuteTabsById: async (tabIds) => {
        if (!tabIds || tabIds.length === 0) {
            return;
        }

        try {
            for (const tabId of tabIds) {
                try {
                    await browserAPI.tabs.update(tabId, { muted: false });
                    console.log(`Unmuted tab ${tabId}`);
                } catch (e) {
                    // Tab might have been closed, ignore error
                    console.warn(`Could not unmute tab ${tabId}: ` + e);
                }
            }
        } catch (e) {
            console.warn("Error unmuting tabs: " + e);
        }
    },

    playNotificationSound: async () => {
        // Check if sound is enabled
        if (!clock.soundEnabled) {
            console.log("Notification sound is disabled, skipping audio");
            return;
        }

        // Mute other tabs if feature is enabled
        const mutedTabs = await clock.muteAllOtherTabs();
        
        try {
            if (isManifestV3 && !isFirefox) {
                // Ensure offscreen document is ready
                await clock.ensureOffscreenDocument();

                if (clock.offscreenReady) {
                    // Send message without awaiting to avoid delays
                    chrome.runtime.sendMessage({
                        type: 'PLAY_SOUND',
                        soundData: clock.customSound ? clock.customSoundData : null,
                        volume: clock.volume / 100
                    }).catch((e) => {
                        console.warn("Could not send audio message: " + e);
                    });
                } else {
                    console.warn("Offscreen document not ready, skipping audio");
                }
            } else {
                // Use direct audio element for Firefox and Manifest V2
                if (!clock.ring) {
                    clock.ring = new Audio();
                    // Preload the default sound
                    clock.ring.preload = 'auto';
                }

                const soundSrc = (clock.customSound && clock.customSoundData)
                    ? clock.customSoundData
                    : "sound/bell-ringing-02.mp3";

                // Only change src if different to avoid reloading
                if (clock.ring.src !== soundSrc) {
                    clock.ring.src = soundSrc;
                }

                clock.ring.volume = clock.volume / 100;

                // Play without awaiting to avoid blocking
                clock.ring.play().catch((e) => {
                    console.warn("Could not play audio: " + e);
                });

                setTimeout(() => {
                    clock.ring.pause();
                    clock.ring.currentTime = 0;
                }, 9000);
            }

            // Unmute tabs after sound finishes (9 seconds)
            if (mutedTabs.length > 0) {
                setTimeout(() => {
                    clock.unmuteTabsById(mutedTabs);
                }, 9000);
            }
        } catch (e) {
            console.warn("Could not play notification sound: " + e);
            // Ensure tabs are unmuted even if there's an error
            if (mutedTabs.length > 0) {
                await clock.unmuteTabsById(mutedTabs);
            }
        }
    },

    alarm: async (alarm) => {
        await clock.loadOptions();
        if (!clock.ticking || clock.paused) {
            return true;
        }
        
        console.log("Alarm fired - loopDisabled:", clock.loopDisabled, "onABreak:", clock.onABreak, "alarm name:", alarm?.name);

        const actionAPI = isManifestV3 ? browserAPI.action : browserAPI.browserAction;

        if (alarm && alarm.name === "minutes" && clock.showMinutes) {
            clock.seconds = Math.floor((clock.alarmAt - Date.now()) / 1000);
            let remaining = Math.round(clock.seconds / 60);
            await actionAPI.setBadgeText({ "text": remaining.toString() });
        } else if (!alarm || alarm.name !== "minutes") {

            
            // looping is disabled, stop now (but only after a work streak, not a break)
            if (clock.loopDisabled && !clock.onABreak) {
                console.log("Single streak mode: stopping after work streak completion");
                
                // Play notification sound
                if (clock.soundEnabled) {
                    clock.playNotificationSound();
                }
                
                try {
                    let text = ("Good, another " + clock.streakTimer + " minutes streak done!");
                    let notifDetail = {
                        type: "basic",
                        title: "Ding!",
                        iconUrl: "icons/clock-48.png",
                        message: text
                    };
                    await browserAPI.notifications.create(notifDetail);
                    console.log("Single streak notification created:", text);
                } catch (e) {
                    console.warn("could not display notification: " + e);
                }
                
                console.log("Resetting timer after single streak completion");
                await clock.reset();
                return true;
            }
            
            console.log("Not in single streak mode or on a break, continuing with normal cycle");

            if (!clock.onABreak) { clock.inARow++; }
            clock.onABreak = !clock.onABreak;
            db.addEvent("switched");

            // Play notification sound (don't await to avoid delays)
            clock.playNotificationSound();

            let minutes;
            if (clock.useAdvancedTimers
                && clock.advancedTimers
                && clock.advancedTimers.length > 0) {
                if (clock.advancedTimersIndex >= clock.advancedTimers.length) {
                    // at the end of the array
                    clock.advancedTimersIndex = 0;
                    clock.onABreak = false;
                }
                minutes = (clock.advancedTimers[clock.advancedTimersIndex] ? clock.advancedTimers[clock.advancedTimersIndex] : 1);
                clock.advancedTimersIndex++;
            } else {
                minutes = (clock.onABreak ? clock.pauseTimer : clock.streakTimer);
            }

            clock.seconds = minutes * 60;
            clock.timeStarted = Date.now();
            clock.alarmAt = clock.timeStarted + (clock.seconds * 1000);
            await clock.updateBadge(minutes);
            await browserAPI.alarms.clear("alarm");
            await browserAPI.alarms.create("alarm", { "when": clock.alarmAt });
            await browserAPI.alarms.clear("minutes");
            await browserAPI.alarms.create("minutes", { "delayInMinutes": 1, "periodInMinutes": 1 });
            await clock.saveState();

            try {
                let text = (clock.onABreak ? "Time for a " + minutes + " min break" : "Ready for a new " + minutes + " min streak?");
                let notifDetail = {
                    type: "basic",
                    title: "Ding!",
                    iconUrl: "icons/clock-48.png",
                    message: text
                };
                await browserAPI.notifications.create(notifDetail);
            } catch (e) {
                console.warn("could not display notification: " + e);
            }
        }
        return true;
    }
};

// Load saved timer settings from storage
const loadTimerSettings = async () => {
    try {
        const result = await browserAPI.storage.local.get(['streakTimer', 'pauseTimer', 'advancedTimers']);
        clock.streakTimer = result.streakTimer || 30;
        clock.seconds = clock.streakTimer * 60;
        clock.pauseTimer = result.pauseTimer || 5;
        clock.advancedTimers = result.advancedTimers || [30, 5];
    } catch (e) {
        console.warn("could not load timer settings from storage, trying localStorage: " + e);
        // Fallback to localStorage
        if (typeof localStorage !== 'undefined') {
            clock.streakTimer = 30;
            if (parseInt(localStorage.streakTimer)) {
                clock.streakTimer = parseInt(localStorage.streakTimer);
                clock.seconds = clock.streakTimer * 60;
            }
            clock.pauseTimer = 5;
            if (parseInt(localStorage.pauseTimer)) {
                clock.pauseTimer = parseInt(localStorage.pauseTimer);
            }
            clock.advancedTimers = [30, 5];
            if (localStorage.advancedTimers) {
                try {
                    clock.advancedTimers = JSON.parse(localStorage.advancedTimers);
                } catch (e) {
                    console.error("Unable to parse the localStorage value for advancedTimers");
                    console.error(e);
                }
            }
        }
    }
};

/**
 * Message listener
 * @param {Object} message message received
 */
const msgListener = (message, sender, sendResponse) => {
    console.log("received message from browser action: " + JSON.stringify(message));

    // Handle async operations with proper response handling
    const handleAsync = async () => {
        // Ensure background script is fully initialized before handling any messages
        if (!clock.initialized) {
            console.log("Background script not initialized, initializing now...");
            await initializeBackgroundScript();
        }
        if (message && ((message.streakTimer && message.pauseTimer) || message.advancedTimers || message.loopDisabled !== undefined)) {
            // Validate and set streak timer
            if (message.streakTimer && !isNaN(message.streakTimer) && message.streakTimer > 0) {
                clock.streakTimer = message.streakTimer;
            }
            
            // Validate and set pause timer
            if (message.pauseTimer && !isNaN(message.pauseTimer) && message.pauseTimer > 0) {
                clock.pauseTimer = message.pauseTimer;
            }
            
            // Set loopDisabled setting
            if (message.loopDisabled !== undefined) {
                clock.loopDisabled = message.loopDisabled;

            }
            
            // Validate and set advanced timers
            if (message.advancedTimers && Array.isArray(message.advancedTimers)) {
                // Filter out invalid values
                const validTimers = message.advancedTimers.filter(timer => 
                    !isNaN(timer) && timer > 0
                );
                
                if (validTimers.length > 0) {
                    clock.advancedTimers = validTimers;
                } else {
                    console.warn("No valid timers in advancedTimers, keeping current:", clock.advancedTimers);
                }
            }

            try {
                await browserAPI.storage.local.set({
                    streakTimer: clock.streakTimer,
                    pauseTimer: clock.pauseTimer,
                    advancedTimers: clock.advancedTimers
                });
            } catch (e) {
                console.warn("could not save timer settings to storage, trying localStorage: " + e);
                // Fallback to localStorage
                if (typeof localStorage !== 'undefined') {
                    localStorage.streakTimer = clock.streakTimer;
                    localStorage.pauseTimer = clock.pauseTimer;
                    localStorage.advancedTimers = JSON.stringify(clock.advancedTimers);
                }
            }
        }

        if (message.command === "getCurrentState") {
            const state = clock.getCurrentState();

            sendResponse(state);
        } else if (message.command === "start") {
            await clock.start();
            sendResponse(true);
        } else if (message.command === "skip") {
            await clock.alarm();
            sendResponse(true);
        } else if (message.command === "reset") {
            await clock.reset();
            sendResponse(true);
        } else if (message.command === "pause") {
            await clock.pause();
            sendResponse(true);
        } else if (message.command === "getStats") {
            const stats = await db.getStats();
            sendResponse(stats);
        }
    };

    // Execute async operations
    handleAsync().catch((error) => {
        console.error("Message handler error:", error);
        sendResponse(false);
    });

    return true; // Keep message channel open for async response
};

// Initialize background script
browserAPI.runtime.onMessage.addListener(msgListener);
browserAPI.alarms.onAlarm.addListener(clock.alarm);
browserAPI.storage.onChanged.addListener(clock.loadOptions);

// Check for version updates and show news if needed
const checkForUpdates = async () => {
    try {
        const manifest = chrome.runtime.getManifest ? chrome.runtime.getManifest() : browser.runtime.getManifest();
        const currentVersion = manifest.version;
        
        const result = await browserAPI.storage.local.get(['lastSeenNewsVersion', 'installDate']);
        const lastSeenNewsVersion = result.lastSeenNewsVersion;
        const installDate = result.installDate;
        
        // Set install date if not set (for new installations)
        if (!installDate) {
            await browserAPI.storage.local.set({ 
                installDate: new Date().toISOString()
            });
        } else {
            // For existing users, they'll see the news indicator in popup if there are new news
            console.log(`Extension version: ${currentVersion}, last seen news: ${lastSeenNewsVersion || 'none'}`);
        }
    } catch (error) {
        console.warn('Error checking for updates:', error);
    }
};

// Initialization function
const initializeBackgroundScript = async () => {
    if (clock.initialized) {
        return; // Already initialized
    }
    
    console.log("Initializing background script...");
    
    await db.createDB();
    await loadTimerSettings();
    await clock.loadOptions();
    await clock.loadState();

    // Pre-create offscreen document for faster audio playback
    await clock.ensureOffscreenDocument();

    // Check for updates
    await checkForUpdates();

    // Only reset if we're not restoring a running timer
    if (!clock.ticking) {
        await clock.reset();
    } else {
        console.log("Background script restarted with active timer, state restored");
    }
    
    clock.initialized = true;
    console.log("Background script initialization complete");
};

// Initialize on startup
initializeBackgroundScript().catch(error => {
    console.error("Background script initialization failed:", error);
});