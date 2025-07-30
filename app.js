function navigateTo(screenId) {
  const screens = document.querySelectorAll('.screen');
  screens.forEach(screen => screen.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');
}

document.addEventListener("DOMContentLoaded", () => {
  // === RECORD PAGE LOGIC ===
  const startBtn = document.getElementById("startBtn");
  const stateToggle = document.getElementById("stateToggle");
  const endBtn = document.getElementById("endBtn");

  // Get references to the new section wrappers
  const recordInitialState = document.getElementById("recordInitialState");
  const recordCurrentState = document.getElementById("recordCurrentState");

  // We no longer need direct JS control over these specific elements' display/visibility,
  // as their parent wrapper will handle it.
  // const initialStateLabel = document.getElementById("initialState");
  // const toggleRow = document.getElementById("toggleRow");
  const currentStateLabel = document.getElementById("currentState"); // Still need this to update its text

  let recording = false;
  let recordingData = [];

  function getCurrentUTCTime() {
    return new Date().toISOString();
  }

  function formatUTCToLocalSimpleTime(utcString) {
    const date = new Date(utcString);
    return date.toLocaleString();
  }

  function getStateLabel() {
    return stateToggle.checked ? 'Avoid' : 'Good';
  }

  if (startBtn) {
    startBtn.style.width = "200px";
    endBtn?.classList.add("invisible");

    // --- INITIAL RECORD PAGE LOAD STATE ---
    // The HTML already sets recordCurrentState to display:none,
    // and recordInitialState is block by default.
    // Explicitly set here for robustness if page is navigated to.
    if (recordInitialState) recordInitialState.style.display = 'flex'; // It's a flex container
    if (recordCurrentState) recordCurrentState.style.display = 'none';
    // --- END INITIAL FIX ---


    startBtn.addEventListener('click', () => {
      if (!recording) {
        // Initial "Start" click
        recording = true;
        const currentUTC = getCurrentUTCTime();
        recordingData = [`Start: ${getStateLabel()} at ${currentUTC}`];

        // --- HIDE INITIAL STATE AND SHOW CURRENT STATE AFTER "START" ---
        if (recordInitialState) recordInitialState.style.display = 'none';
        if (recordCurrentState) recordCurrentState.style.display = 'flex'; // Show current state section
        // --- END HIDE/SHOW FIX ---

        // Update the current state label text
        currentStateLabel.textContent = `State: ${getStateLabel()} since ${formatUTCToLocalSimpleTime(currentUTC)}`;

        startBtn.textContent = 'Toggle'; // Change start button text to "Toggle"
        endBtn.classList.remove("invisible");
        endBtn.classList.add("visible");
      } else {
        // Subsequent "Toggle" button clicks (when recording is true)
        stateToggle.checked = !stateToggle.checked; // Toggle the checkbox state

        // Update the display and record the new state
        const currentUTC = getCurrentUTCTime();
        const entry = `Toggle: ${getStateLabel()} at ${currentUTC}`;
        recordingData.push(entry);
        currentStateLabel.textContent = `State: ${getStateLabel()} since ${formatUTCToLocalSimpleTime(currentUTC)}`;
      }
    });

    stateToggle.addEventListener('change', () => {
      if (recording) {
        const currentUTC = getCurrentUTCTime();
        const entry = `Toggle: ${getStateLabel()} at ${currentUTC}`;
        recordingData.push(entry);
        currentStateLabel.textContent = `State: ${getStateLabel()} since ${formatUTCToLocalSimpleTime(currentUTC)}`;
      }
    });

    endBtn.addEventListener('click', () => {
      recording = false;
      const currentUTC = getCurrentUTCTime();
      recordingData.push(`End: ${getStateLabel()} at ${currentUTC}`);
      const fullText = recordingData.join('\n');
      saveRecordingLocally(fullText);
      alert("Recording saved! You can now segment it from the Segment page.");

      // --- RESET UI AFTER "END" ---
      // Show initial state section, hide recording state section
      if (recordInitialState) recordInitialState.style.display = 'flex';
      if (recordCurrentState) recordCurrentState.style.display = 'none';
      // --- END RESET FIX ---

      startBtn.textContent = 'Start'; // Reset start button text
      endBtn.classList.add("invisible");
      endBtn.classList.remove("visible"); // Ensure endBtn is hidden

      // Reset toggle state for a fresh start
      stateToggle.checked = false;
    });
  }

  // === SEGMENT PAGE LOGIC (remainder of your app.js) ===
  const gpxFile = document.getElementById("gpxFile");
  const uploadGpxBtn = document.getElementById("uploadGpxBtn");
  const gpxFilename = document.getElementById("gpxFilename");

  const recordingSection = document.getElementById("recordingSection");
  const recordingSelect = document.getElementById("recordingSelect");
  const txtFilename = document.getElementById("txtFilename");

  const processSection = document.getElementById("processSection");
  const processBtn = document.getElementById("processBtn");

  const resultSection = document.getElementById("resultSection");


  function populateRecordingList() {
    if (recordingSelect) {
      recordingSelect.innerHTML = '';
      Object.keys(localStorage).forEach(key => {
        if (key.endsWith('.txt') && key.startsWith('recording-')) {
          const option = document.createElement("option");
          option.value = key;

          let timestampStr = key.replace("recording-", "").replace(".txt", "");
          timestampStr = timestampStr.replace(/T(\d{2})-(\d{2})-(\d{2})/, 'T$1:$2:$3');

          const date = new Date(timestampStr);

          if (isNaN(date.getTime())) {
            option.textContent = `Recording - Corrupted Name (${key.replace("recording-", "").replace(".txt", "")})`;
            return;
          }

          const formattedDate = date.toLocaleString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
          });

          option.textContent = `Recording - ${formattedDate}`;
          recordingSelect.appendChild(option);
        }
      });
    }
  }

  function parseRecordingText(text) {
    const lines = text.trim().split('\n');
    const intervals = [];

    let currentState = null;
    let currentStartTime = null;

    lines.forEach(line => {
      const match = line.match(/(Start|Toggle|End): (\w+) at (.+)/);
      if (!match) return;

      const [, type, state, rawTime] = match;
      const time = rawTime.replace('+00:00Z', 'Z');

      if (type === 'Start' || type === 'Toggle') {
        if (currentState !== null && currentStartTime !== null) {
          intervals.push({ state: currentState, start: currentStartTime, end: time });
        }
        currentState = state;
        currentStartTime = time;
      }

      if (type === 'End') {
        if (currentState !== null && currentStartTime !== null) {
          intervals.push({ state: currentState, start: currentStartTime, end: time });
        }
      }
    });

    return intervals;
  }

  if (uploadGpxBtn && gpxFile) {
    uploadGpxBtn.addEventListener('click', () => gpxFile.click());

    gpxFile.addEventListener('change', () => {
      const file = gpxFile.files[0];
      if (file) {
        gpxFilename.textContent = file.name;
        recordingSection.style.display = 'block';
        document.querySelector('.upload-txt-wrapper').style.display = 'flex';
        populateRecordingList();
      }

    });
  }

  if (recordingSelect) {
    recordingSelect.addEventListener('change', () => {
      const selectedKey = recordingSelect.value;
      const content = localStorage.getItem(selectedKey);
      txtFilename.textContent = selectedKey.replace("recording-", "").replace(".txt", "");
      const parsedIntervals = parseRecordingText(content);
      console.log("Parsed Intervals:", parsedIntervals);
      processSection.style.display = 'block';
    });
  }

  if (processBtn) {
    processBtn.addEventListener('click', () => {
      console.log("Process button clicked");

      const selectedKey = recordingSelect.value;
      const txtContent = localStorage.getItem(selectedKey);

      if (!selectedKey || !txtContent) {
        alert("Please select a valid recording.");
        return;
      }

      const intervals = parseRecordingText(txtContent);
      console.log("Parsed intervals:", intervals);

      const file = gpxFile.files[0];

      if (!file) {
        alert("Please upload a GPX file first.");
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const gpxText = reader.result;
        console.log("GPX file read successfully");

        try {
          resultSection.style.display = 'block';
          processGpxAndSplit(gpxText, intervals);
        } catch (err) {
          console.error("Error in processGpxAndSplit:", err);
          alert("Something went wrong while processing the GPX file.");
        }
      };
      reader.readAsText(file);
    });
  }

  const testInput = document.createElement("input");
  testInput.type = "file";
  testInput.accept = ".txt";
  testInput.style.display = "none";
  document.body.appendChild(testInput);

  testInput.addEventListener("change", (event) => {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result;
      saveRecordingLocally(content);
      populateRecordingList();
    };
    if (file) reader.readAsText(file);
  });

  const uploadTxtTestBtn = document.getElementById("uploadTxtTest");
  if (uploadTxtTestBtn) {
    uploadTxtTestBtn.addEventListener("click", () => {
      testInput.click();
    });
  }

  populateRecordingList();

});

function saveRecordingLocally(content) {
  const now = new Date();
  const timestamp = now.toISOString().replace(/:/g, '-');
  const filename = `recording-${timestamp}.txt`;
  localStorage.setItem(filename, content);
  console.log("Recording saved as:", filename);
}

function processGpxAndSplit(gpxText, intervals) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(gpxText, "application/xml");
  const trkpts = Array.from(xmlDoc.getElementsByTagName("trkpt"));

  const goodSegments = [];
  const avoidSegments = [];

  let currentSegmentType = null;
  let currentSegmentPoints = [];

  let lastTime = null;
  const maxGap = 5 * 60 * 1000;

  trkpts.forEach(pt => {
    const timeEl = pt.getElementsByTagName("time")[0];
    if (!timeEl) return;
    const ptTime = new Date(timeEl.textContent).getTime();

    const interval = intervals.find(i => {
      const start = new Date(i.start).getTime();
      const end = new Date(i.end).getTime();
      return ptTime >= start && ptTime < end;
    });

    const lat = parseFloat(pt.getAttribute("lat"));
    const lon = parseFloat(pt.getAttribute("lon"));
    const eleEl = pt.getElementsByTagName("ele")[0];
    const ele = eleEl ? parseFloat(eleEl.textContent) : undefined;
    const time = timeEl.textContent;

    const pointData = { lat, lon, ele, time };

    if (lastTime !== null && (ptTime - lastTime > maxGap)) {
      if (currentSegmentPoints.length > 0) {
        if (currentSegmentType === "Good") {
          goodSegments.push(currentSegmentPoints);
        } else if (currentSegmentType === "Avoid") {
          avoidSegments.push(currentSegmentPoints);
        }
        currentSegmentPoints = [];
        currentSegmentType = null;
      }
    }

    if (interval) {
      const newSegmentType = interval.state;

      if (newSegmentType !== currentSegmentType && currentSegmentPoints.length > 0) {
        if (currentSegmentType === "Good") {
          goodSegments.push(currentSegmentPoints);
        } else if (currentSegmentType === "Avoid") {
          avoidSegments.push(currentSegmentPoints);
        }
        currentSegmentPoints = [];
      }

      currentSegmentType = newSegmentType;
      currentSegmentPoints.push(pointData);
    } else {
      if (currentSegmentPoints.length > 0) {
        if (currentSegmentType === "Good") {
          goodSegments.push(currentSegmentPoints);
        } else if (currentSegmentType === "Avoid") {
          avoidSegments.push(currentSegmentPoints);
        }
        currentSegmentPoints = [];
        currentSegmentType = null;
      }
    }
    lastTime = ptTime;
  });

  if (currentSegmentPoints.length > 0) {
    if (currentSegmentType === "Good") {
      goodSegments.push(currentSegmentPoints);
    } else if (currentSegmentType === "Avoid") {
      avoidSegments.push(currentSegmentPoints);
    }
  }

  const goodGpxContent = generateGpxContent(goodSegments);
  const avoidGpxContent = generateGpxContent(avoidSegments);

  displaySplitMap(goodSegments, avoidSegments);

  const downloadGoodGpxBtn = document.getElementById("downloadGoodGpxBtn");
  const downloadAvoidGpxBtn = document.getElementById("downloadAvoidGpxBtn");

  if (downloadGoodGpxBtn) {
    downloadGoodGpxBtn.onclick = () => downloadFile(goodGpxContent, 'good.gpx');
  }
  if (downloadAvoidGpxBtn) {
    downloadAvoidGpxBtn.onclick = () => downloadFile(avoidGpxContent, 'avoid.gpx');
  }
}

function generateGpxContent(segments) {
  let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1" creator="SegmentApp">
  <trk>
    <name>Segmented Track</name>\n`;

  segments.forEach((segment) => {
      if (segment.length > 0) {
          gpx += `    <trkseg>\n`;
          segment.forEach(pt => {
              gpx += `      <trkpt lat="${pt.lat}" lon="${pt.lon}">\n`;
              if (pt.ele !== undefined) {
                  gpx += `        <ele>${pt.ele}</ele>\n`;
              }
              gpx += `        <time>${pt.time}</time>\n`;
              gpx += `      </trkpt>\n`;
          });
          gpx += `    </trkseg>\n`;
      }
  });

  gpx += `  </trk>
</gpx>`;
  return gpx;
}


function displaySplitMap(goodSegments, avoidSegments) {
  const container = document.getElementById('map-preview');

  if (container._leaflet_map) {
    container._leaflet_map.remove();
    container._leaflet_map = null;
  }
  if (container._leaflet_id) {
    delete container._leaflet_id;
  }

  container.innerHTML = '';

  const map = L.map('map-preview', {
  fullscreenControl: true
});
container._leaflet_map = map;


  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  const allPoints = [];

  goodSegments.forEach(segment => {
    const latLngs = segment.map(pt => [pt.lat, pt.lon]);
    if (latLngs.length) {
      const poly = L.polyline(latLngs, {
        color: '#3d5930',
        weight: 4,
        opacity: 0.9
      }).addTo(map);
      allPoints.push(...latLngs);
    }
  });

  avoidSegments.forEach(segment => {
    const latLngs = segment.map(pt => [pt.lat, pt.lon]);
    if (latLngs.length) {
      const poly = L.polyline(latLngs, {
        color: '#a13939',
        weight: 4,
        opacity: 0.8
      }).addTo(map);
      allPoints.push(...latLngs);
    }
  });

  if (allPoints.length) {
    map.fitBounds(allPoints);
  }

  setTimeout(() => {
    map.invalidateSize();
  }, 200);
}

function downloadFile(content, filename) {
  const blob = new Blob([content], { type: "application/gpx+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}