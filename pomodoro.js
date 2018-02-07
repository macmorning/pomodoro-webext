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
    start: function() {
      chrome.runtime.sendMessage({"command":"start","streakTimer":this.streakTimer,"pauseTimer":this.pauseTimer},this.getCurrentState);
      this.ticking = true;
    },
    getCurrentState: function() {
      var self = this;
      var responseHandler = function(response) {
        self.seconds = response.seconds;
        self.onABreak = response.onABreak;
        self.ticking = response.ticking;
        self.paused = response.paused;
        self.streakTimer = response.streakTimer;
        self.pauseTimer = response.pauseTimer;
        self.update();
      }
      chrome.runtime.sendMessage({"command":"getCurrentState"},responseHandler);
    },
    update: function() {
      document.querySelector("#clockHandSeconds").setAttribute('transform', 'rotate('+ 6*this.seconds +' 50 50)');
      document.querySelector("#clockHandMinutes").setAttribute('transform', 'rotate('+ this.seconds/10 +' 50 50)');
      document.querySelector("#streakTimer").value = this.streakTimer;
      document.querySelector("#streakTimer").dispatchEvent(new Event("change"));
      document.querySelector("#pauseTimer").value = this.pauseTimer;
      document.querySelector("#pauseTimer").dispatchEvent(new Event("change"));
      document.querySelector("#timeCounter").innerHTML = Math.floor(this.seconds/60).toString().paddingLeft("00") + ":" + Math.floor(this.seconds%60).toString().paddingLeft("00");
      document.querySelector("#startBtn").innerHTML = (this.ticking ? "Reset" : "Start!");
    },
    tick: function() {
      document.querySelector("#debug").innerHTML= "seconds: " + this.seconds + "<br/>ticking: " + this.ticking + "<br/>paused: " + this.paused;
      if(!this.ticking || this.paused) {
        return true;
      }
      if(this.seconds > 0) {
        this.seconds--;
      } else {
        if(this.onABreak) {
          document.querySelector("#clockOnABreak").setAttribute("visible",true);
          minutes = document.querySelector("#pauseTimer").value;
        } else {
          document.querySelector("#clockOnABreak").setAttribute("visible",false);;
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

    document.querySelector("#streakTimer").onchange = function(evt) {
      clock.streakTimer = evt.target.value;
      document.querySelector("#streakTimer_value").innerHTML = evt.target.value;
    };
    document.querySelector("#pauseTimer").onchange = function(evt) {
      clock.pauseTimer = evt.target.value;
      document.querySelector("#pauseTimer_value").innerHTML = evt.target.value;
    };

    document.querySelector("#streakTimer").dispatchEvent(new Event("change"));
    document.querySelector("#pauseTimer").dispatchEvent(new Event("change"));
    document.querySelector("#startBtn").onclick = function() { clock.start(); };
    document.querySelector("#container").onclick = function() { clock.pause(); };

    setInterval(function() {
      clock.tick();
    }, 1000);
}