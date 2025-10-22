const clock = {
    seconds: 0,
    onABreak: false,
    ticking: false,
    paused: false,
    streakTimer: 0,
    pauseTimer: 0,
    useAdvancedTimers: false,
    advancedTimers: [30, 5],
    loopDisabled: false,
    inARow: 0,
    pause: () => {
        chrome.runtime.sendMessage({ "command": "pause" }, (response) => {
            if (response) {
                clock.getCurrentState("pause");
            }
        });
    },
    reset: () => {
        chrome.runtime.sendMessage({ "command": "reset", "streakTimer": clock.streakTimer, "pauseTimer": clock.pauseTimer, "advancedTimers": clock.advancedTimers, "loopDisabled": clock.loopDisabled }, (response) => {
            if (response) {
                clock.getCurrentState("reset");
            }
        });
    },
    start: () => {
        chrome.runtime.sendMessage({ "command": "start", "streakTimer": clock.streakTimer, "pauseTimer": clock.pauseTimer, "advancedTimers": clock.advancedTimers, "loopDisabled": clock.loopDisabled }, (response) => {
            if (response) {
                clock.getCurrentState("start");
            }
        });
    },
    skip: () => {
        chrome.runtime.sendMessage({ "command": "skip", "streakTimer": clock.streakTimer, "pauseTimer": clock.pauseTimer, "advancedTimers": clock.advancedTimers, "loopDisabled": clock.loopDisabled }, (response) => {
            if (response) {
                clock.getCurrentState("skip");
            }
        });
    },
    getCurrentState: (caller = "unknown") => {
        chrome.runtime.sendMessage({ "command": "getCurrentState" }, (response) => {
            if (response && typeof response === 'object' && response.seconds !== undefined) {
                clock.seconds = response.seconds || 0;
                clock.onABreak = response.onABreak || false;
                clock.ticking = response.ticking || false;
                clock.paused = response.paused || false;
                clock.streakTimer = response.streakTimer || 30;
                clock.pauseTimer = response.pauseTimer || 5;
                clock.useAdvancedTimers = response.useAdvancedTimers || false;
                clock.advancedTimers = response.advancedTimers || [30, 5];
                clock.loopDisabled = response.loopDisabled || false;
                clock.inARow = response.inARow || 0;
            } else {
                console.log("No valid state object received from", caller, ", using fallback values");
                // Fallback values if no response or invalid response
                clock.seconds = clock.seconds || 1800; // 30 minutes default
                clock.streakTimer = clock.streakTimer || 30;
                clock.pauseTimer = clock.pauseTimer || 5;
                clock.advancedTimers = clock.advancedTimers || [30, 5];
            }
            console.log("Final clock state from", caller, ":", {
                seconds: clock.seconds,
                streakTimer: clock.streakTimer,
                pauseTimer: clock.pauseTimer,
                ticking: clock.ticking
            });
            clock.update();
        });
    },
    update: () => {
        // Ensure timer values are valid numbers
        if (isNaN(clock.streakTimer) || clock.streakTimer === undefined) {
            clock.streakTimer = 30;
        }
        if (isNaN(clock.pauseTimer) || clock.pauseTimer === undefined) {
            clock.pauseTimer = 5;
        }

        // When not ticking, show the streak timer duration
        if (!clock.ticking && (isNaN(clock.seconds) || clock.seconds === undefined || clock.seconds === null || clock.seconds === 0)) {
            clock.seconds = clock.streakTimer * 60;
        }

        // Ensure seconds is a valid number
        if (isNaN(clock.seconds) || clock.seconds === undefined || clock.seconds === null) {
            clock.seconds = clock.streakTimer * 60;
        }

        // Handle UI display based on options
        if (clock.loopDisabled) {
            // Single streaks mode: show only streak timer, hide break timer and advanced timers
            document.getElementById("standardTimers").style.display = "inline-block";
            document.getElementById("advancedTimers").style.display = "none";

            // Hide break timer elements
            const pauseTimerLabel = document.querySelector('label[for="pauseTimer"]');
            const pauseTimerInput = document.getElementById("pauseTimer");
            if (pauseTimerLabel) pauseTimerLabel.style.display = "none";
            if (pauseTimerInput) pauseTimerInput.style.display = "none";

            // Add single streaks note if it doesn't exist
            let singleStreaksNote = document.getElementById("singleStreaksNote");
            if (!singleStreaksNote) {
                singleStreaksNote = document.createElement("div");
                singleStreaksNote.id = "singleStreaksNote";
                singleStreaksNote.style.cssText = "font-style: italic; color: #666; margin: 10px 0; text-align: center; font-size: 0.9em;";
                singleStreaksNote.innerText = "Single streaks mode - no breaks";
                document.getElementById("standardTimers").appendChild(singleStreaksNote);
            }
        } else if (clock.useAdvancedTimers && clock.advancedTimers && !clock.loopDisabled) {
            // Advanced timers mode (only if not in single streaks mode)
            document.getElementById("standardTimers").style.display = "none";
            document.getElementById("advancedTimers").style.display = "inline";
            document.getElementById("advancedTimersInput").value = clock.advancedTimers.join(",");
        } else {
            // Standard mode: show both timers
            document.getElementById("standardTimers").style.display = "inline-block";
            document.getElementById("advancedTimers").style.display = "none";

            // Show break timer elements
            const pauseTimerLabel = document.querySelector('label[for="pauseTimer"]');
            const pauseTimerInput = document.getElementById("pauseTimer");
            if (pauseTimerLabel) pauseTimerLabel.style.display = "block";
            if (pauseTimerInput) pauseTimerInput.style.display = "block";

            // Remove single streaks note if it exists
            const singleStreaksNote = document.getElementById("singleStreaksNote");
            if (singleStreaksNote) {
                singleStreaksNote.remove();
            }
        }

        // Calculate clock hand rotations with safe values
        const secondsRotation = 6 * clock.seconds;
        const minutesRotation = clock.seconds / 10;

        document.getElementById("clockHandSeconds").setAttribute("transform", "rotate(" + secondsRotation + " 50 50)");
        document.getElementById("clockHandMinutes").setAttribute("transform", "rotate(" + minutesRotation + " 50 50)");

        // Update slider values and their displays directly (without triggering events)
        document.getElementById("streakTimer").value = clock.streakTimer;
        document.getElementById("streakTimer_value").innerText = clock.streakTimer;
        document.getElementById("pauseTimer").value = clock.pauseTimer;
        document.getElementById("pauseTimer_value").innerText = clock.pauseTimer;

        // Safe time display calculation
        const minutes = Math.floor(clock.seconds / 60);
        const seconds = Math.floor(clock.seconds % 60);
        document.getElementById("timeCounter").innerText = minutes.toString().padStart(2, "0") + ":" + seconds.toString().padStart(2, "0");

        document.getElementById("startBtn").innerText = (clock.ticking ? "Reset" : "Start!");
        document.getElementById("onABreak").innerText = (clock.onABreak ? "relax!" : "on a streak");
        document.getElementById("onABreak").style.display = (clock.ticking ? "block" : "none");
        document.getElementById("streaksCounterValue").innerText = clock.inARow || 0;
        document.getElementById("streaksCounter").style.display = (clock.inARow > 1 ? "block" : "none");
        if (clock.ticking) {
            document.getElementById("skipBtn").removeAttribute("disabled");
        } else {
            document.getElementById("skipBtn").setAttribute("disabled", "disabled");
        }
    },
    tick: () => {
        if (!clock.ticking || clock.paused) {
            return true;
        }
        if (clock.seconds > 0) {
            clock.seconds--;
        } else {
            clock.onABreak = !clock.onABreak;
            minutes = document.getElementById((clock.onABreak ? "pauseTimer" : "streakTimer")).value;
            clock.seconds = minutes * 60;
        }
        clock.update();
        return true;
    },
    openOptions: () => {
        if (chrome.runtime.openOptionsPage) {
            chrome.runtime.openOptionsPage();
        } else {
            window.open(chrome.runtime.getURL("options.html"));
        }
    },

    openNews: () => {
        window.open(chrome.runtime.getURL("news.html"), '_blank', 'width=450,height=550');
    },

    checkForNews: async () => {
        try {
            console.log('Checking for news...');

            // Load news data to check for new versions (with cache busting)
            const response = await fetch('news.json?t=' + Date.now());
            if (!response.ok) {
                console.warn('Could not fetch news.json, status:', response.status);
                return;
            }

            const newsData = await response.json();
            console.log('Loaded news data:', newsData);

            if (!newsData.news || !Array.isArray(newsData.news)) {
                console.warn('Invalid news data structure');
                return;
            }

            // Get all available news versions
            const availableVersions = newsData.news.map(item => item.version);
            console.log('Available news versions:', availableVersions);

            // Get seen news versions from storage (array of strings)
            let seenVersions = [];

            // Use chrome.storage.local only
            try {
                const result = await chrome.storage.local.get(['seenNewsVersions']);
                console.log('Chrome storage result:', result);

                if (result && typeof result === 'object' && result.seenNewsVersions) {
                    seenVersions = result.seenNewsVersions;
                    console.log('Loaded from chrome.storage:', seenVersions);
                }
            } catch (storageError) {
                console.warn('Chrome storage error:', storageError);
            }
            console.log('Seen news versions:', seenVersions);

            // Check if there are any unseen versions
            const unseenVersions = availableVersions.filter(version => !seenVersions.includes(version));
            const hasUnseenNews = unseenVersions.length > 0;

            console.log('News check:', {
                availableVersions,
                seenVersions,
                unseenVersions,
                hasUnseenNews
            });

            // Always reset the button first
            const newsBtn = document.getElementById('news');
            if (!newsBtn) {
                console.warn('News button not found in DOM');
                return;
            }

            newsBtn.classList.remove('has-news');
            newsBtn.title = "what's new";

            // If there are unseen news versions, show indicator
            if (hasUnseenNews) {
                newsBtn.classList.add('has-news');
                newsBtn.title = `what's new (${unseenVersions.length} new update${unseenVersions.length > 1 ? 's' : ''} available!)`;
            }
        } catch (error) {
            console.error('Error checking for news:', error);
        }
    },

    markNewsAsSeen: async () => {
        try {
            // Load news data to get all available versions
            const response = await fetch('news.json?t=' + Date.now());
            if (!response.ok) {
                console.warn('Could not fetch news.json for marking as seen');
                return;
            }

            const newsData = await response.json();
            if (!newsData.news || !Array.isArray(newsData.news)) {
                console.warn('Invalid news data structure');
                return;
            }

            const availableVersions = newsData.news.map(item => item.version);

            // Save to chrome.storage only
            try {
                await chrome.storage.local.set({ seenNewsVersions: availableVersions });
            } catch (storageError) {
                console.error('Chrome storage save failed:', storageError);
            }

            // Remove news indicator
            const newsBtn = document.getElementById('news');
            if (newsBtn) {
                newsBtn.classList.remove('has-news');
                newsBtn.title = "what's new";
            }
        } catch (error) {
            console.error('Error marking news as seen:', error);
        }
    },


};

window.onload = () => {
    clock.getCurrentState("onload");

    document.getElementById("streakTimer").oninput = (evt) => {
        clock.streakTimer = parseInt(evt.target.value);
        document.getElementById("streakTimer_value").innerText = evt.target.value;
        // Update the display if not ticking (without calling full update to avoid recursion)
        if (!clock.ticking) {
            clock.seconds = clock.streakTimer * 60;
            // Update only the time display and clock hands
            const minutes = Math.floor(clock.seconds / 60);
            const seconds = Math.floor(clock.seconds % 60);
            document.getElementById("timeCounter").innerText = minutes.toString().padStart(2, "0") + ":" + seconds.toString().padStart(2, "0");

            const secondsRotation = 6 * clock.seconds;
            const minutesRotation = clock.seconds / 10;
            document.getElementById("clockHandSeconds").setAttribute("transform", "rotate(" + secondsRotation + " 50 50)");
            document.getElementById("clockHandMinutes").setAttribute("transform", "rotate(" + minutesRotation + " 50 50)");
        }
    };
    document.getElementById("pauseTimer").oninput = (evt) => {
        clock.pauseTimer = parseInt(evt.target.value);
        document.getElementById("pauseTimer_value").innerText = evt.target.value;
    };
    document.getElementById("advancedTimersInput").oninput = (evt) => {
        try {
            const inputValue = evt.target.value.trim();
            if (inputValue === "") {
                // If empty, use default values
                clock.advancedTimers = [30, 5];
                return;
            }

            const timers = inputValue.split(",");
            clock.advancedTimers = [];

            for (let i = 0; i < timers.length; i++) {
                const timer = parseInt(timers[i].trim());
                // Only add valid positive numbers
                if (!isNaN(timer) && timer > 0) {
                    clock.advancedTimers.push(timer);
                }
            }

            // If no valid timers were parsed, use defaults
            if (clock.advancedTimers.length === 0) {
                clock.advancedTimers = [30, 5];
            }


        } catch (e) {
            console.error("Error parsing advanced timers:", e);
            clock.advancedTimers = [30, 5]; // Fallback to defaults
        }
    };
    document.getElementById("config").addEventListener("click", clock.openOptions);
    document.getElementById("news").addEventListener("click", () => {
        console.log('News button clicked, opening news and marking as seen');
        clock.openNews();
        clock.markNewsAsSeen();

        // Also recheck news state after a short delay to update the icon
        setTimeout(() => {
            console.log('Rechecking news state after click');
            clock.checkForNews();
        }, 500);
    });
    document.getElementById("streakTimer").dispatchEvent(new Event("input"));
    document.getElementById("pauseTimer").dispatchEvent(new Event("input"));
    document.getElementById("advancedTimersInput").dispatchEvent(new Event("input"));
    document.getElementById("startBtn").onclick = () => { if (!clock.ticking) { clock.start(); } else { clock.reset(); } };
    document.getElementById("skipBtn").onclick = () => { if (clock.ticking) { clock.skip(); } };
    document.getElementById("clockContainer").onclick = function () { clock.pause(); };

    setInterval(() => {
        clock.tick();
    }, 1000);

    // Check for news when popup regains focus
    window.addEventListener('focus', () => {
        console.log('Popup regained focus, rechecking news');
        clock.checkForNews();
    });

    // Also check when popup becomes visible
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            console.log('Popup became visible, rechecking news');
            setTimeout(() => clock.checkForNews(), 100);
        }
    });

    // Check for news with a small delay to ensure DOM is ready
    setTimeout(() => {
        console.log('Initial news check starting...');
        clock.checkForNews();
    }, 100);


};
