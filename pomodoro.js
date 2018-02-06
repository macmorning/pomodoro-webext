window.clock = {
    seconds: 0,
    onABreak: false,
    ticking: false,
    paused: false,
    ring:{},
    pause: function() {
      this.paused = !this.paused;
    },
    updateClock: function() {
      document.querySelector("#clockHandSeconds").setAttribute('transform', 'rotate('+ 6*this.seconds +' 50 50)');
      document.querySelector("#clockHandMinutes").setAttribute('transform', 'rotate('+ this.seconds/10 +' 50 50)');
      document.querySelector("#timeCounter").innerHTML = Math.floor(this.seconds/60).toString().paddingLeft("00") + ":" + Math.floor(this.seconds%60).toString().paddingLeft("00");
    },
    init: function() {
      if (typeof(Storage) !== "undefined") {
        localStorage.streakTimer = document.querySelector("#streakTimer").value;
        localStorage.pauseTimer= document.querySelector("#pauseTimer").value;
      }
      this.seconds = document.querySelector("#streakTimer").value*60;
      this.onABreak = false;
      this.paused = false;
      document.querySelector("#clockOnABreak").setAttribute('visible',false);
      this.updateClock();
    },
    setTimer: function() {
      this.init();
      this.ticking = !this.ticking;
      document.querySelector("#startBtn").innerHTML = (this.ticking ? "Reset" : "Start!");
    },
    tick: function() {
      if(!this.ticking || this.paused) {
        return true;
      }
      if(this.seconds > 0) {
        this.seconds--;
      } else {
        this.onABreak = !this.onABreak;
        try {
          this.ring.play();
        } catch(e) { console.log("could not ring: " + e )};
        let minutes = 0;
        if(this.onABreak) {
          document.querySelector("#clockOnABreak").show();
          minutes = document.querySelector("#pauseTimer").value;
        } else {
          document.querySelector("#clockOnABreak").hide();
          minutes = document.querySelector("#streakTimer").value;        
        }
  
        this.seconds = minutes * 60;
        if(Notification.permission === "granted") {
          let text = (this.onABreak ? "Time for a " + minutes + " min break" : "Ready for a new " + minutes + " min streak?");
          let notification = new Notification("Ding !", {
              icon: 'icons/clock-48.png',
              body: text
          });
        }
      }
      this.updateClock();
      return true;
    }
  };
  
  
  
  window.onload = function() {
    // lets me use a padding function for strings
    String.prototype.paddingLeft = function (paddingValue) {
     return String(paddingValue + this).slice(-paddingValue.length);
    };
    
    // If the browser allows it, ask for permissions to open a desktop notification
    if ("Notification" in window) {
      if (Notification.permission !== "granted" && Notification.permission !== "denied") {
        Notification.requestPermission();
      }
    }
    
    // If the browser allows it, use local storage to save set durations for the next session
    if (typeof(Storage) !== "undefined") {
         if(parseInt(localStorage.streakTimer)) {
          document.querySelector("#streakTimer").value = parseInt(localStorage.streakTimer);
          // document.querySelector("#streakTimer").slider("refresh");
        }
        if(parseInt(localStorage.pauseTimer)) {
          document.querySelector("#pauseTimer").value = parseInt(localStorage.pauseTimer);
          // document.querySelector("#pauseTimer").slider("refresh");
        }
     }
    
    // Initialize and load the ring sound
    window.clock.ring = document.createElement('audio');
    window.clock.ring.setAttribute('src', 'sound/bell-ringing-01.mp3');
    
  
    document.querySelector("#streakTimer").onchange = function(evt) {
      if(!window.clock.ticking) {
        window.clock.seconds = evt.target.value*60;
        document.querySelector("#streakTimer_value").innerHTML = evt.target.value;
        window.clock.updateClock();
      }
    };
    document.querySelector("#pauseTimer").onchange = function(evt) {
        document.querySelector("#pauseTimer_value").innerHTML = evt.target.value;
    };

    window.clock.init();

    document.querySelector("#streakTimer").dispatchEvent(new Event("change"));
    document.querySelector("#pauseTimer").dispatchEvent(new Event("change"));
    document.querySelector("#startBtn").onclick = function() { window.clock.setTimer(); };
    document.querySelector("#container").onclick = function() { window.clock.pause(); };

    setInterval(function() {
      window.clock.tick();
    }, 1000);
  }