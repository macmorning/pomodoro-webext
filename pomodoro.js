const clock = {
    seconds: 0,
    onABreak: false,
    ticking: false,
    paused: false,
    streakTimer: 0,
    pauseTimer: 0,
    useAdvancedTimers: false,
    advancedTimers: [30,5],
    pause: () => {
        chrome.runtime.sendMessage({"command": "pause"}, clock.getCurrentState);
    },
    reset: () => {
        chrome.runtime.sendMessage({"command": "reset", "streakTimer": clock.streakTimer, "pauseTimer": clock.pauseTimer, "advancedTimers": clock.advancedTimers}, clock.getCurrentState);
    },
    start: () => {
        console.log({"command": "start", "streakTimer": clock.streakTimer, "pauseTimer": clock.pauseTimer, "advancedTimers": clock.advancedTimers});
        chrome.runtime.sendMessage({"command": "start", "streakTimer": clock.streakTimer, "pauseTimer": clock.pauseTimer, "advancedTimers": clock.advancedTimers}, clock.getCurrentState);
    },
    skip: () => {
        console.log({"command": "skip", "streakTimer": clock.streakTimer, "pauseTimer": clock.pauseTimer, "advancedTimers": clock.advancedTimers});
        chrome.runtime.sendMessage({"command": "skip", "streakTimer": clock.streakTimer, "pauseTimer": clock.pauseTimer, "advancedTimers": clock.advancedTimers}, clock.getCurrentState);
    },
    getCurrentState: () => {
        let responseHandler = (response) => {
            clock.seconds = response.seconds;
            clock.onABreak = response.onABreak;
            clock.ticking = response.ticking;
            clock.paused = response.paused;
            clock.streakTimer = response.streakTimer;
            clock.pauseTimer = response.pauseTimer;
            clock.useAdvancedTimers = response.useAdvancedTimers;
            clock.advancedTimers = response.advancedTimers;
            clock.update();
        };
        chrome.runtime.sendMessage({"command": "getCurrentState"}, responseHandler);
    },
    update: () => {
        if (clock.useAdvancedTimers && clock.advancedTimers) {
            document.getElementById("standardTimers").style.display = "none";
            document.getElementById("advancedTimers").style.display = "inline";
            document.getElementById("advancedTimersInput").value = clock.advancedTimers.join(",");
        }
        document.getElementById("clockHandSeconds").setAttribute("transform", "rotate(" + 6 * clock.seconds + " 50 50)");
        document.getElementById("clockHandMinutes").setAttribute("transform", "rotate(" + clock.seconds / 10 + " 50 50)");
        document.getElementById("streakTimer").value = clock.streakTimer;
        document.getElementById("streakTimer").dispatchEvent(new Event("input"));
        document.getElementById("pauseTimer").value = clock.pauseTimer;
        document.getElementById("pauseTimer").dispatchEvent(new Event("input"));
        document.getElementById("timeCounter").innerText = Math.floor(clock.seconds / 60).toString().padStart(2, "0") + ":" + Math.floor(clock.seconds % 60).toString().padStart(2, "0");
        document.getElementById("startBtn").innerText = (clock.ticking ? "Reset" : "Start!");
        if(clock.ticking) {
            document.getElementById("skipBtn").removeAttribute("disabled");
        } else {
            document.getElementById("skipBtn").setAttribute("disabled","disabled");
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
    }
};

window.onload = () => {
    clock.getCurrentState();
    document.getElementById("streakTimer").oninput = (evt) => {
        clock.streakTimer = evt.target.value;
        document.getElementById("streakTimer_value").innerText = evt.target.value;
    };
    document.getElementById("pauseTimer").oninput = (evt) => {
        clock.pauseTimer = evt.target.value;
        document.getElementById("pauseTimer_value").innerText = evt.target.value;
    };
    document.getElementById("advancedTimersInput").oninput = (evt) => {
        try {
            clock.advancedTimers = evt.target.value.split(",");
            for (let x in clock.advancedTimers) {
                clock.advancedTimers[x] = parseInt(clock.advancedTimers[x]);
            }
        } catch(e) {
            console.error(e);
        }
    };
    document.getElementById("config").addEventListener("click", clock.openOptions);
    document.getElementById("streakTimer").dispatchEvent(new Event("input"));
    document.getElementById("pauseTimer").dispatchEvent(new Event("input"));
    document.getElementById("advancedTimersInput").dispatchEvent(new Event("input"));
    document.getElementById("startBtn").onclick = () => { if (!clock.ticking) { clock.start(); } else { clock.reset(); } };
    document.getElementById("skipBtn").onclick = () => { if (clock.ticking) { clock.skip(); } };
    document.getElementById("clockContainer").onclick = function() { clock.pause(); };

    setInterval(() => {
        clock.tick();
    }, 1000);
};
