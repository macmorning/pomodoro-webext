const clock = {
    seconds: 0,
    onABreak: false,
    ticking: false,
    paused: false,
    streakTimer: 0,
    pauseTimer: 0,
    pause: function() {
      chrome.runtime.sendMessage({"command":"pause"},this.getCurrentState);
    },
    reset: function() {
      chrome.runtime.sendMessage({"command":"reset","streakTimer":this.streakTimer,"pauseTimer":this.pauseTimer},this.getCurrentState);
    },
    start: function() {
      chrome.runtime.sendMessage({"command":"start","streakTimer":this.streakTimer,"pauseTimer":this.pauseTimer},this.getCurrentState);
    },
    getCurrentState: function() {
      var responseHandler = function(response) {
        clock.seconds = response.seconds;
        clock.onABreak = response.onABreak;
        clock.ticking = response.ticking;
        clock.paused = response.paused;
        clock.streakTimer = response.streakTimer;
        clock.pauseTimer = response.pauseTimer;
        clock.update();
      }
      chrome.runtime.sendMessage({"command":"getCurrentState"},responseHandler);
    },
    update: function() {
      document.querySelector("#clockHandSeconds").setAttribute('transform', 'rotate('+ 6*this.seconds +' 50 50)');
      document.querySelector("#clockHandMinutes").setAttribute('transform', 'rotate('+ this.seconds/10 +' 50 50)');
      document.querySelector("#streakTimer").value = this.streakTimer;
      document.querySelector("#streakTimer").dispatchEvent(new Event("input"));
      document.querySelector("#pauseTimer").value = this.pauseTimer;
      document.querySelector("#pauseTimer").dispatchEvent(new Event("input"));
      document.querySelector("#timeCounter").innerHTML = Math.floor(this.seconds/60).toString().paddingLeft("00") + ":" + Math.floor(this.seconds%60).toString().paddingLeft("00");
      document.querySelector("#startBtn").innerHTML = (this.ticking ? "Reset" : "Start!");
    },
    tick: function() {
      if(!this.ticking || this.paused) {
        return true;
      }
      if(this.seconds > 0) {
        this.seconds--;
      } else {
        if(this.onABreak) {
          document.querySelector("#clockOnABreak").style.visibility = "visible";
          minutes = document.querySelector("#pauseTimer").value;
        } else {
          document.querySelector("#clockOnABreak").style.visibility = "hidden";
          minutes = document.querySelector("#streakTimer").value;        
        }
  
        this.seconds = minutes * 60;
      }
      this.update();
      return true;
    }
};
  
  
window.onload = function() {

    // lets me use a padding function for strings
    String.prototype.paddingLeft = function (paddingValue) {
     return String(paddingValue + this).slice(-paddingValue.length);
    };

    clock.getCurrentState();

    document.querySelector("#streakTimer").oninput = function(evt) {
      clock.streakTimer = evt.target.value;
      document.querySelector("#streakTimer_value").innerHTML = evt.target.value;
    };
    document.querySelector("#pauseTimer").oninput = function(evt) {
      clock.pauseTimer = evt.target.value;
      document.querySelector("#pauseTimer_value").innerHTML = evt.target.value;
    };

    document.querySelector("#streakTimer").dispatchEvent(new Event("input"));
    document.querySelector("#pauseTimer").dispatchEvent(new Event("input"));
    document.querySelector("#startBtn").onclick = function() { if(!clock.ticking) { clock.start(); } else { clock.reset();} };
    document.querySelector("#container").onclick = function() { clock.pause(); };

    setInterval(function() {
      clock.tick();
    }, 1000);
}