const clock = {
    seconds: 0,
    onABreak: false,
    ticking: false,
    paused: false,
    ring:{},
    sendMessage: function(message) {
      
    },
    pause: function() {
      this.paused = !this.paused;
      this.sendMessage({"command":"pause"});
    },
    setTimer: function() {
      this.init();
      this.ticking = !this.ticking;
      document.querySelector("#startBtn").innerHTML = (this.ticking ? "Reset" : "Start!");
    },
    updateCurrentState(state) {
      alert("state received " + JSON.stringify(state));
    },
    getCurrentState: function() {
      alert("getting state");
      browser.runtime.sendMessage({"message":{"command":"getCurrentState"}}).then(this.updateCurrentState);
    },
    tick: function() {
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
      document.querySelector("#clockHandSeconds").setAttribute('transform', 'rotate('+ 6*this.seconds +' 50 50)');
      document.querySelector("#clockHandMinutes").setAttribute('transform', 'rotate('+ this.seconds/10 +' 50 50)');
      document.querySelector("#timeCounter").innerHTML = Math.floor(this.seconds/60).toString().paddingLeft("00") + ":" + Math.floor(this.seconds%60).toString().paddingLeft("00");
      return true;
    }
};
  
  
window.onload = function() {
    if(chrome !== undefined) {
        const browser = chrome;
    }
    // lets me use a padding function for strings
    String.prototype.paddingLeft = function (paddingValue) {
     return String(paddingValue + this).slice(-paddingValue.length);
    };
    
   document.querySelector("#streakTimer").onchange = function(evt) {
      if(!clock.ticking) {
        clock.seconds = evt.target.value*60;
        document.querySelector("#streakTimer_value").innerHTML = evt.target.value;
        clock.updateClock();
      }
    };
    document.querySelector("#pauseTimer").onchange = function(evt) {
        document.querySelector("#pauseTimer_value").innerHTML = evt.target.value;
    };

    document.querySelector("#streakTimer").dispatchEvent(new Event("change"));
    document.querySelector("#pauseTimer").dispatchEvent(new Event("change"));
    document.querySelector("#startBtn").onclick = function() { clock.setTimer(); };
    document.querySelector("#container").onclick = function() { clock.pause(); };

    clock.getCurrentState();
    chrome.runtime.onMessage.addListener(request => {
      console.log("Message from the background script:");
      console.log(JSON.stringify(message));
    });
}