function navigateTo(screenId) {
  const screens = document.querySelectorAll('.screen');
  screens.forEach(screen => screen.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');
}

document.addEventListener("DOMContentLoaded", () => {
  // === RECORD PAGE LOGIC ===
  const startBtn = document.getElementById("startBtn");
  const stateToggle = document.getElementById("stateToggle");
  const currentStateLabel = document.getElementById("currentState");
  const endBtn = document.getElementById("endBtn");
  const initialState = document.getElementById("initialState");
  const toggleRow = document.getElementById("toggleRow");

  let recording = false;
  let recordingData = [];

  function getCurrentUTCTime() {
    return new Date().toISOString();
  }

  // Helper function to format UTC date to local simple time string
  function formatUTCToLocalSimpleTime(utcString) {
    const date = new Date(utcString);
    return date.toLocaleString(); // Uses user's default locale and time format
  }

  function getStateLabel() {
    return stateToggle.checked ? 'Avoid' : 'Good';
  }

  if (startBtn) {
    startBtn.style.width = "200px";
    endBtn?.classList.add("invisible");

    startBtn.addEventListener('click', () => {
      if (!recording) {
        // Initial "Start" click
        recording = true;
        const currentUTC = getCurrentUTCTime(); // Get UTC for internal data storage
        recordingData = [`Start: ${getStateLabel()} at ${currentUTC}`];
        startBtn.textContent = 'Toggle';
        currentStateLabel.textContent = `State: ${getStateLabel()} since ${formatUTCToLocalSimpleTime(currentUTC)}`;
        currentStateLabel.style.display = 'block';
        initialState.style.display = 'none';
        toggleRow.style.display = 'none'; // Hide the toggle itself
        endBtn.classList.remove("invisible");
        endBtn.classList.add("visible");
      } else {
        // Subsequent "Toggle" button clicks (when recording is true)
        // Programmatically toggle the checkbox state
        stateToggle.checked = !stateToggle.checked; // <--- FIX IS HERE

        // Then, update the display and record the new state
        const currentUTC = getCurrentUTCTime();
        const entry = `Toggle: ${getStateLabel()} at ${currentUTC}`;
        recordingData.push(entry);
        currentStateLabel.textContent = `State: ${getStateLabel()} since ${formatUTCToLocalSimpleTime(currentUTC)}`;
      }
    });

    stateToggle.addEventListener('change', () => {
      // This listener handles direct changes to the checkbox OR changes initiated by startBtn's click handler
      if (recording) {
        const currentUTC = getCurrentUTCTime();
        const entry = `Toggle: ${getStateLabel()} at ${currentUTC}`;
        recordingData.push(entry);
        currentStateLabel.textContent = `State: ${getStateLabel()} since ${formatUTCToLocalSimpleTime(currentUTC)}`;
      }
    });

    endBtn.addEventListener('click', () => {
      recording = false;
      const currentUTC = getCurrentUTCTime(); // Get UTC for internal data storage
      recordingData.push(`End: ${getStateLabel()} at ${currentUTC}`);
      const fullText = recordingData.join('\n');
      saveRecordingLocally(fullText);
      alert("Recording saved! You can now segment it from the Segment page.");

      // Reset UI
      startBtn.textContent = 'Start';
      currentStateLabel.style.display = 'none';
      initialState.style.display = 'block';
      toggleRow.style.display = 'flex';
      endBtn.classList.add("invisible");
      endBtn.classList.remove("visible");
    });
  }

  // === SEGMENT PAGE LOGIC ===
  const gpxFile = document.getElementById("gpxFile");
  const uploadGpxBtn = document.getElementById("uploadGpxBtn");
  const gpxFilename = document.getElementById("gpxFilename");

  const recordingSection = document.getElementById("recordingSection");
  const recordingSelect = document.getElementById("recordingSelect");
  const txtFilename = document.getElementById("txtFilename");

  const processSection = document.getElementById("processSection");
  const processBtn = document.getElementById("processBtn");

  const resultSection = document.getElementById("resultSection");
  // These constants are declared here, but their elements are in HTML,
  // and their event listeners are set within processGpxAndSplit
  const downloadGoodGpxBtn = document.getElementById("downloadGoodGpxBtn");
  const downloadAvoidGpxBtn = document.getElementById("downloadAvoidGpxBtn");


  function populateRecordingList() {
    if (recordingSelect) {
      recordingSelect.innerHTML = '';
      Object.keys(localStorage).forEach(key => {
        if (key.endsWith('.txt') && key.startsWith('recording-')) {
          const option = document.createElement("option");
          option.value = key; // Keep the original UTC filename as the value for internal use

          // Extract the timestamp part from the filename
          let timestampStr = key.replace("recording-", "").replace(".txt", "");

          // FIX: Replace hyphens in the time portion with colons for Date parsing
          timestampStr = timestampStr.replace(/T(\d{2})-(\d{2})-(\d{2})/, 'T$1:$2:$3');

          const date = new Date(timestampStr);

          // Check if the date is valid before formatting
          if (isNaN(date.getTime())) {
            option.textContent = `Recording - Corrupted Name (${key.replace("recording-", "").replace(".txt", "")})`;
            return;
          }

          // Format the date to a local, readable string
          const formattedDate = date.toLocaleString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
          });

          option.textContent = `Recording - ${formattedDate}`; // Display the formatted date
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
      const time = rawTime.replace('+00:00Z', 'Z'); // Ensure consistent Z suffix

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
      txtFilename.textContent = selectedKey.replace("recording-", "").replace(".txt", ""); // Display raw filename in the label
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
          processGpxAndSplit(gpxText, intervals); // This function now also attaches download handlers
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
  populateRecordingList(); // Call on DOMContentLoaded to populate list initially
});

function saveRecordingLocally(content) {
  const now = new Date();
  // Ensure timestamp is consistent (hyphens for saving)
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
  let currentSegmentPoints = []; // Stores point data {lat, lon, ele, time}

  let lastTime = null;
  const maxGap = 5 * 60 * 1000; // 5 minutes in milliseconds

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
    const time = timeEl.textContent; // Original time string for GPX export

    const pointData = { lat, lon, ele, time }; // Collect all necessary point data

    // Handle time gaps *before* adding the current point
    if (lastTime !== null && (ptTime - lastTime > maxGap)) {
      if (currentSegmentPoints.length > 0) {
        if (currentSegmentType === "Good") {
          goodSegments.push(currentSegmentPoints);
        } else if (currentSegmentType === "Avoid") {
          avoidSegments.push(currentSegmentPoints);
        }
        currentSegmentPoints = []; // Reset for a new segment
        currentSegmentType = null; // Reset segment type as well
      }
    }

    if (interval) {
      const newSegmentType = interval.state;

      // If the state has changed OR we just started a new segment after a gap/no-interval
      if (newSegmentType !== currentSegmentType && currentSegmentPoints.length > 0) {
        // Finalize the previous segment
        if (currentSegmentType === "Good") {
          goodSegments.push(currentSegmentPoints);
        } else if (currentSegmentType === "Avoid") {
          avoidSegments.push(currentSegmentPoints);
        }
        currentSegmentPoints = []; // Reset for the new type of segment
      }

      currentSegmentType = newSegmentType; // Update the current segment type
      currentSegmentPoints.push(pointData); // Add the point to the current active segment
    } else {
      // If no interval matches (point is outside defined 'Good' or 'Avoid' periods)
      // Finalize any ongoing segment
      if (currentSegmentPoints.length > 0) {
        if (currentSegmentType === "Good") {
          goodSegments.push(currentSegmentPoints);
        } else if (currentSegmentType === "Avoid") {
          avoidSegments.push(currentSegmentPoints);
        }
        currentSegmentPoints = []; // Reset
        currentSegmentType = null; // Reset
      }
    }
    lastTime = ptTime; // Update lastTime for the next iteration
  });

  // After the loop, push any remaining active segment
  if (currentSegmentPoints.length > 0) {
    if (currentSegmentType === "Good") {
      goodSegments.push(currentSegmentPoints);
    } else if (currentSegmentType === "Avoid") {
      avoidSegments.push(currentSegmentPoints);
    }
  }

  // --- Generate GPX content for download ---
  const goodGpxContent = generateGpxContent(goodSegments);
  const avoidGpxContent = generateGpxContent(avoidSegments);

  displaySplitMap(goodSegments, avoidSegments); // Display map (visual)

  // Attach event listeners for download buttons after GPX content is ready
  const downloadGoodGpxBtn = document.getElementById("downloadGoodGpxBtn");
  const downloadAvoidGpxBtn = document.getElementById("downloadAvoidGpxBtn");

  if (downloadGoodGpxBtn) {
    downloadGoodGpxBtn.onclick = () => downloadFile(goodGpxContent, 'good.gpx');
  }
  if (downloadAvoidGpxBtn) {
    downloadAvoidGpxBtn.onclick = () => downloadFile(avoidGpxContent, 'avoid.gpx');
  }
}

// --- New helper function: generateGpxContent ---
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

  // Check if a Leaflet map instance already exists on this container
  // Leaflet usually stores a reference under the _leaflet_map property (or _leaflet_id for older versions/internal use)
  if (container._leaflet_map) { // This is the more reliable property to check for an active map instance
    container._leaflet_map.remove(); // Call the remove method on the existing map instance
    container._leaflet_map = null;   // Clear the reference
  }
  // Also, ensure the _leaflet_id (internal to Leaflet) is cleared if it exists
  if (container._leaflet_id) {
    delete container._leaflet_id;
  }


  container.innerHTML = ''; // Clear any existing content inside the div

  // Initialize the new map
  const map = L.map('map-preview');
  container._leaflet_map = map; // Store the map instance directly on the container element

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  const allPoints = [];

  goodSegments.forEach(segment => {
    // Only extract lat/lon for map display
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
    // Only extract lat/lon for map display
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