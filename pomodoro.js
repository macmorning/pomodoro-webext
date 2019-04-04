const clock = {
    seconds: 0,
    onABreak: false,
    ticking: false,
    paused: false,
    streakTimer: 0,
    pauseTimer: 0,
    pause: function () {
        chrome.runtime.sendMessage({"command": "pause"}, this.getCurrentState);
    },
    reset: function () {
        chrome.runtime.sendMessage({"command": "reset", "streakTimer": this.streakTimer, "pauseTimer": this.pauseTimer}, this.getCurrentState);
    },
    start: function () {
        chrome.runtime.sendMessage({"command": "start", "streakTimer": this.streakTimer, "pauseTimer": this.pauseTimer}, this.getCurrentState);
    },
    getCurrentState: function () {
        var responseHandler = (response) => {
            clock.seconds = response.seconds;
            clock.onABreak = response.onABreak;
            clock.ticking = response.ticking;
            clock.paused = response.paused;
            clock.streakTimer = response.streakTimer;
            clock.pauseTimer = response.pauseTimer;
            clock.update();
        };
        chrome.runtime.sendMessage({"command": "getCurrentState"}, responseHandler);
    },
    update: function () {
        document.querySelector("#clockHandSeconds").setAttribute("transform", "rotate(" + 6 * clock.seconds + " 50 50)");
        document.querySelector("#clockHandMinutes").setAttribute("transform", "rotate(" + clock.seconds / 10 + " 50 50)");
        document.querySelector("#streakTimer").value = clock.streakTimer;
        document.querySelector("#streakTimer").dispatchEvent(new Event("input"));
        document.querySelector("#pauseTimer").value = clock.pauseTimer;
        document.querySelector("#pauseTimer").dispatchEvent(new Event("input"));
        document.querySelector("#timeCounter").innerHTML = Math.floor(clock.seconds / 60).toString().padStart(2, "0") + ":" + Math.floor(clock.seconds % 60).toString().padStart(2, "0");
        document.querySelector("#startBtn").innerHTML = (clock.ticking ? "Reset" : "Start!");
    },
    tick: function () {
        if (!this.ticking || this.paused) {
            return true;
        }
        if (this.seconds > 0) {
            this.seconds--;
        } else {
            this.onABreak = !this.onABreak;
            minutes = document.querySelector((clock.onABreak ? "#pauseTimer" : "#streakTimer")).value;
            this.seconds = minutes * 60;
        }
        this.update();
        return true;
    }
};

window.onload = function () {
    clock.getCurrentState();
    document.querySelector("#streakTimer").oninput = (evt) => {
        clock.streakTimer = evt.target.value;
        document.querySelector("#streakTimer_value").innerHTML = evt.target.value;
    };
    document.querySelector("#pauseTimer").oninput = (evt) => {
        clock.pauseTimer = evt.target.value;
        document.querySelector("#pauseTimer_value").innerHTML = evt.target.value;
    };

    document.querySelector("#streakTimer").dispatchEvent(new Event("input"));
    document.querySelector("#pauseTimer").dispatchEvent(new Event("input"));
    document.querySelector("#startBtn").onclick = () => { if (!clock.ticking) { clock.start(); } else { clock.reset(); } };

    setInterval(() => {
        clock.tick();
    }, 1000);
};
