const isFirefox = typeof browser !== 'undefined';
const browserAPI = isFirefox ? browser : chrome;
const context = {
    volume: 100,
    showMinutes: false,
    loopDisabled: false,
    useAdvancedTimers: false,
    soundEnabled: true,
    customSoundData: "",
    customSoundFilename: ""
};

/**
 * Displays a popup message that fades out after 3 seconds.
 * @param {String} txt Message to display.
 * @param {String} type Type of message: 'success', 'error', 'info' (default: 'info')
 */
const showPopupMessage = (txt, type = 'info') => {
    // Remove any existing popup
    const existingPopup = document.getElementById('popup-message');
    if (existingPopup) {
        existingPopup.remove();
    }

    // Create popup element
    const popup = document.createElement('div');
    popup.id = 'popup-message';
    popup.className = `popup-message popup-${type}`;
    popup.textContent = txt;

    // Add to page
    document.body.appendChild(popup);

    // Trigger animation
    setTimeout(() => {
        popup.classList.add('show');
    }, 10);

    // Fade out and remove after 3 seconds
    setTimeout(() => {
        popup.classList.add('fade-out');
        setTimeout(() => {
            if (popup.parentNode) {
                popup.parentNode.removeChild(popup);
            }
        }, 300);
    }, 3000);
};

/**
 * Legacy function for backward compatibility
 * @param {String} txt Message to display.
 */
const displayMessage = (txt) => {
    showPopupMessage(txt, 'info');
};

/**
 * Restores the options saved into storage
 */
const restoreOptions = async () => {
    try {
        const result = await browserAPI.storage.local.get([
            'volume', 'showMinutes', 'loopDisabled', 
            'useAdvancedTimers', 'soundEnabled', 'customSound', 'customSoundData', 'customSoundFilename'
        ]);
        
        context.volume = result.volume !== undefined ? result.volume : 100;
        context.showMinutes = result.showMinutes !== undefined ? result.showMinutes : true;
        context.loopDisabled = result.loopDisabled !== undefined ? result.loopDisabled : false;
        context.useAdvancedTimers = result.useAdvancedTimers !== undefined ? result.useAdvancedTimers : false;
        context.soundEnabled = result.soundEnabled !== undefined ? result.soundEnabled : true;
        context.customSound = result.customSound !== undefined ? result.customSound : false;
        context.customSoundData = result.customSoundData || "";
        context.customSoundFilename = result.customSoundFilename || "";
    } catch(e) {
        console.warn("could not load options from storage, trying localStorage: " + e);
        // Fallback to localStorage
        context.volume = localStorage.volume;
        if (context.volume === undefined) {
            context.volume = 100;
        }
        context.showMinutes = (localStorage.showMinutes === true || localStorage.showMinutes === "true" || localStorage.showMinutes === undefined);
        context.loopDisabled = (localStorage.loopDisabled === true || localStorage.loopDisabled === "true");
        context.useAdvancedTimers = (localStorage.useAdvancedTimers === true || localStorage.useAdvancedTimers === "true");
        context.soundEnabled = (localStorage.soundEnabled === undefined || localStorage.soundEnabled === true || localStorage.soundEnabled === "true");
        context.customSound = (localStorage.customSound === true || localStorage.customSound === "true");
        context.customSoundData = localStorage.customSoundData || "";
        context.customSoundFilename = localStorage.customSoundFilename || "";
    }
    
    document.getElementById("volume_value").innerText = context["volume"];
    document.getElementById("volume").value = context["volume"];
    document.getElementById("showMinutes").checked = context.showMinutes;
    document.getElementById("loopDisabled").checked = context.loopDisabled;
    document.getElementById("useAdvancedTimers").checked = context.useAdvancedTimers;
    document.getElementById("soundEnabled").checked = context.soundEnabled;
    
    let soundEnabledElt = document.getElementById("soundEnabled");
    let customSoundElt = document.getElementById("customSound");
    let soundFileElt = document.getElementById("soundFile");
    let volumeElt = document.getElementById("volume");
    let volumeTestElt = document.getElementById("volume_test");

    const updateSoundControls = () => {
        const soundEnabled = soundEnabledElt.checked;
        customSoundElt.disabled = !soundEnabled;
        soundFileElt.disabled = !soundEnabled;
        volumeElt.disabled = !soundEnabled;
        volumeTestElt.style.opacity = soundEnabled ? "1" : "0.5";
        volumeTestElt.style.pointerEvents = soundEnabled ? "auto" : "none";
        
        if (soundEnabled && customSoundElt.checked) {
            soundFileElt.style.visibility = "visible";
        } else {
            soundFileElt.style.visibility = "hidden";
        }
    };

    document.getElementById("soundEnabled").onchange = (evt) => {
        context.soundEnabled = soundEnabledElt.checked;
        updateSoundControls();
    };

    document.getElementById("customSound").onchange = (evt) => {
        context.customSound = customSoundElt.checked;
        updateSoundControls();
    };
    
    customSoundElt.checked = context.customSound;
    updateSoundControls();

    soundFileElt.onchange = () => {
        context.customSoundFilename = soundFileElt.value.split(/(\\|\/)/g).pop();
        document.getElementById("customSoundFilename").innerText = "";
        const file = soundFileElt.files[0];
        const reader = new FileReader();
        reader.addEventListener("load", function () {
            context.customSoundData = reader.result;
        }, false);
        if (file) {
            reader.readAsDataURL(file);
        }
    }

    if (context.customSoundFilename !== "") {
        document.getElementById("customSoundFilename").innerText = " (current: " + context.customSoundFilename + ")";
    }


    document.getElementById("volume").oninput = (evt) => {
        context.volume = evt.target.value;
        document.getElementById("volume_value").innerText = evt.target.value;
    };

    document.getElementById("volume_test").onclick = (evt) => {
        if (!context.soundEnabled) {
            return; // Don't play sound if disabled
        }
        context.ring = document.createElement("audio");

        if (context.customSound && context.customSoundData) {
            context.ring.setAttribute("src", context.customSoundData);
        } else {
            context.ring.setAttribute("src", "sound/bell-ringing-02.mp3");
        }
        context.ring.volume = context.volume / 100;
        context.ring.play();
        window.setTimeout(() => {
            context.ring.pause();
        }, 5000);
    };
    // Export buttons are available in all browsers
    document.getElementById("exportStatsJSON").onclick = exportStatsJSON;
    document.getElementById("exportStatsJSON").style.display = "block";
    document.getElementById("exportStatsCSV").onclick = exportStatsCSV;
    document.getElementById("exportStatsCSV").style.display = "block";
    document.querySelector("form").addEventListener("submit", saveOptions);
};

/**
 * Saves the options into storage
 * @param {object} evt the event that triggered the action
 */
const saveOptions = async (evt) => {
    evt.preventDefault();
    try {
        if (!document.getElementById("customSound").checked) {
            context.customSoundData = "";
            context.customSoundFilename = "";
        }
        
        await browserAPI.storage.local.set({
            volume: context.volume,
            showMinutes: document.getElementById("showMinutes").checked,
            loopDisabled: document.getElementById("loopDisabled").checked,
            useAdvancedTimers: document.getElementById("useAdvancedTimers").checked,
            soundEnabled: document.getElementById("soundEnabled").checked,
            customSound: document.getElementById("customSound").checked,
            customSoundData: context.customSoundData,
            customSoundFilename: context.customSoundFilename
        });
        
        showPopupMessage("Options saved successfully!", "success");
        
        // Reload after a short delay to let user see the success message
        setTimeout(() => {
            window.location.reload(true);
        }, 1000);
    } catch (e) {
        console.warn("could not save to storage, trying localStorage: " + e);
        try {
            // Fallback to localStorage
            localStorage.volume = context.volume;
            localStorage.showMinutes = document.getElementById("showMinutes").checked;
            localStorage.loopDisabled = document.getElementById("loopDisabled").checked;
            localStorage.useAdvancedTimers = document.getElementById("useAdvancedTimers").checked;
            localStorage.soundEnabled = document.getElementById("soundEnabled").checked;
            localStorage.customSound = document.getElementById("customSound").checked;
            localStorage.customSoundData = context.customSoundData;
            localStorage.customSoundFilename = context.customSoundFilename;
            
            showPopupMessage("Options saved successfully!", "success");
            
            // Reload after a short delay to let user see the success message
            setTimeout(() => {
                window.location.reload(true);
            }, 1000);
        } catch (e2) {
            showPopupMessage("Options could not be saved. Is storage enabled?", "error");

        }
    }
};

/**
 * Creates CSV lines from an array of objects
 * @author https://medium.com/@danny.pule/export-json-to-csv-file-using-javascript-a0b7bc5b00d2
 * @param {Array} objArray array of objects
 */
const convertToCSV = (objArray) => {
    var array = typeof objArray != 'object' ? JSON.parse(objArray) : objArray;
    var str = '';
    for (var i = 0; i < array.length; i++) {
        var line = '';
        for (var index in array[i]) {
            if (line != '') line += ','
            line += array[i][index];
        }
        str += line + '\r\n';
    }
    return str;
}

const exportStatsJSON = (evt) => { evt.preventDefault(); exportStats("json"); };
const exportStatsCSV = (evt) => { evt.preventDefault(); exportStats("csv"); };
/**
 * Exports statistics
 * @param {object} evt the event that triggered the action
 */
const exportStats = (format) => {
    if (browserAPI.downloads === undefined) {
        browserAPI.permissions.request({
            permissions: ['downloads']
        }, (granted) => {

            if (granted) {
                exportStats(format);
            } else {
                showPopupMessage("Download permission is required to export statistics.", "error");
            }
        });
    } else {
        if (!format) { format = "json"; }
        let responseHandler = (response) => {
            var blob;
            if (format == "csv") {
                blob = new Blob([convertToCSV(response)], {'type': "application/csv;charset=utf-8"});
            } else {
                blob = new Blob([JSON.stringify(response)], {'type': "application/json;charset=utf-8"});
            }
            try {
                browserAPI.downloads.download({
                    filename: "pomodoro-data." + format,
                    saveAs: true,
                    url: URL.createObjectURL(blob)
                });
                showPopupMessage(`Statistics exported successfully as ${format.toUpperCase()}!`, "success");
            } catch (e) {
                showPopupMessage("Export failed due to a browser error.", "error");

            }
        };
        browserAPI.runtime.sendMessage({"command": "getStats"}, responseHandler);
    }
};

document.addEventListener("DOMContentLoaded", () => {
    restoreOptions();
});
