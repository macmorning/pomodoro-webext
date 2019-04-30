const context = {
    volume: 100
};

/**
 * Displays a message for a short time.
 * @param {String} txt Message to display.
 */
const displayMessage = (txt) => {
    document.getElementById("messages").innerHTML = txt;
    window.setTimeout(() => { document.getElementById("messages").innerHTML = "&nbsp;"; }, 3000);
};

/**
 * Updates field value from context object
 * @param {string} field the name of the field that needs to be updated
 */
const updateField = (field) => {
    document.getElementById(field + "_value").innerHTML = context[field];
    document.getElementById(field).value = context[field];
};

/**
 * Restores the options saved into local storage
 */
const restoreOptions = () => {
    context.volume = localStorage.volume;
    if (context.volume === undefined) {
        context.volume = 100;
    }
    updateField("volume");

    document.getElementById("volume").oninput = (evt) => {
        context.volume = evt.target.value;
        updateField("volume");
    };

    document.getElementById("volume_test").onclick = (evt) => {
        if (context.ring === undefined) {
            context.ring = document.createElement("audio");
            context.ring.setAttribute("src", "sound/bell-ringing-02.mp3");
        }
        context.ring.volume = context.volume / 100;
        context.ring.play();
    };
    document.querySelector("form").addEventListener("submit", saveOptions);
};

/**
 * Saves the options into sync storage
 * @param {object} evt the event that triggered the action
 */
const saveOptions = (evt) => {
    evt.preventDefault();
    try {
        localStorage.volume = context.volume;
        displayMessage("Options saved");
    } catch (e) {
        displayMessage("Options could not be saved. Is storage enabled?");
        console.log(e);
    }
};

document.addEventListener("DOMContentLoaded", restoreOptions);
