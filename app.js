/**
 * Navigates to a specific screen within the single-page application structure.
 * It hides all screens and then shows only the target screen.
 */
function navigateTo(screenId) {
  // Select all elements with the class 'screen
  const screens = document.querySelectorAll('.screen');
  // Iterate over all screens and remove the 'active' class (hides them)
  screens.forEach(screen => screen.classList.remove('active'));
  // Add the 'active' class to the target screen, making it visible
  document.getElementById(screenId).classList.add('active');
}

/**
 * Executes code once the entire DOM is loaded and parsed.
 * This ensures that all HTML elements are available before script attempts to access them.
 */
document.addEventListener("DOMContentLoaded", () => {
  // === RECORD PAGE LOGIC ===
  // Get references to key elements on the Record page
  const startBtn = document.getElementById("startBtn");
  const stateToggle = document.getElementById("stateToggle");
  const endBtn = document.getElementById("endBtn");

  // Wrappers for toggling visibility between initial and recording state
  const recordInitialState = document.getElementById("recordInitialState");
  const recordCurrentState = document.getElementById("recordCurrentState");
  const currentStateLabel = document.getElementById("currentState");

  // Variables to manage the recording state
  let recording = false;
  let recordingData = [];

  // Return current UTC timestamp string
  function getCurrentUTCTime() {
    return new Date().toISOString();
  }

  // Format UTC string into a simple local time string
  function formatUTCToLocalSimpleTime(utcString) {
    const date = new Date(utcString);
    return date.toLocaleString();
  }

  // Return the current state label based on toggle state
  function getStateLabel() {
    return stateToggle.checked ? 'Avoid' : 'Good';
  }

  // Check if the start button exists (ensures we are on the record page context)
  if (startBtn) {
    // Initialize button width (if not already handled by CSS)
    startBtn.style.width = "200px";
    // Initially hide the End button
    endBtn?.classList.add("invisible");

    // --- INITIAL RECORD PAGE LOAD STATE ---

    // Ensure clean state when loading the page
    if (recordInitialState) recordInitialState.style.display = 'flex'; // It's a flex container
    if (recordCurrentState) recordCurrentState.style.display = 'none';

    /**
     * Event listener for the 'Start' or 'Toggle' button.
     * Handles the initiation of recording or toggling the state during recording.
     */
    startBtn.addEventListener('click', () => {
      if (!recording) {
        // Initial "Start" click
        recording = true;
        const currentUTC = getCurrentUTCTime();
        // Record the initial state and timestamp
        recordingData = [`Start: ${getStateLabel()} at ${currentUTC}`];

        // Update UI: switch state views, update label, button states
        if (recordInitialState) recordInitialState.style.display = 'none';
        if (recordCurrentState) recordCurrentState.style.display = 'flex'; // Show current state section
        // Update the current state label text
        currentStateLabel.textContent = `State: ${getStateLabel()} since ${formatUTCToLocalSimpleTime(currentUTC)}`;

        startBtn.textContent = 'Toggle'; // Change start button text to "Toggle"
        // Make the End button visible
        endBtn.classList.remove("invisible");
        endBtn.classList.add("visible");
      } else {
        // Subsequent "Toggle" button clicks (when recording is true)
        stateToggle.checked = !stateToggle.checked; // Toggle the checkbox state

        // Update the display and record the new state
        const currentUTC = getCurrentUTCTime();
        const entry = `Toggle: ${getStateLabel()} at ${currentUTC}`;
        recordingData.push(entry); // Add the state change entry to recording data
        // Update the displayed current state label
        currentStateLabel.textContent = `State: ${getStateLabel()} since ${formatUTCToLocalSimpleTime(currentUTC)}`;
      }
    });

    /**
     * Event listener for the state toggle switch (checkbox).
     * Logs state changes when the switch is manually toggled by the user during recording.
     */
    stateToggle.addEventListener('change', () => {
      if (recording) {
        const currentUTC = getCurrentUTCTime();
        const entry = `Toggle: ${getStateLabel()} at ${currentUTC}`;
        recordingData.push(entry);
        // Update the displayed current state label
        currentStateLabel.textContent = `State: ${getStateLabel()} since ${formatUTCToLocalSimpleTime(currentUTC)}`;
      }
    });

    /**
     * Event listener for the 'End' button.
     * Finalizes the recording, saves the data, and resets the UI.
     */
    endBtn.addEventListener('click', () => {
      recording = false;
      const currentUTC = getCurrentUTCTime();
      recordingData.push(`End: ${getStateLabel()} at ${currentUTC}`);
      const fullText = recordingData.join('\n');
      saveRecordingLocally(fullText);
      alert("Recording saved! You can now segment it from the Segment page.");

      // Reset UI state
      // Show initial state section, hide recording state section
      if (recordInitialState) recordInitialState.style.display = 'flex';
      if (recordCurrentState) recordCurrentState.style.display = 'none';

      startBtn.textContent = 'Start'; // Reset start button text
      endBtn.classList.add("invisible");
      endBtn.classList.remove("visible"); // Ensure endBtn is hidden

      // Reset toggle state for a fresh start
      stateToggle.checked = false;
    });
  }

  // === SEGMENT PAGE LOGIC ===
  // Get references to elements on the Segment page
  // Hidden input for GPX file selection
  const gpxFile = document.getElementById("gpxFile");
  // Button to trigger GPX file selection
  const uploadGpxBtn = document.getElementById("uploadGpxBtn");
  // Element to display selected GPX filename
  const gpxFilename = document.getElementById("gpxFilename");

  // Section displaying recording list
  const recordingSection = document.getElementById("recordingSection");
  // Dropdown for saved recordings
  const recordingSelect = document.getElementById("recordingSelect");
  // Element to display selected recording filename
  const txtFilename = document.getElementById("txtFilename");

  // Section containing the Process button
  const processSection = document.getElementById("processSection");
  // Button to initiate GPX processing
  const processBtn = document.getElementById("processBtn");

  // Section to display map and download buttons
  const resultSection = document.getElementById("resultSection");

  /**
   * Populates the 'recordingSelect' dropdown with saved recording files from localStorage.
   * It filters for items ending with '.txt' and starting with 'recording-'.
   */
  function populateRecordingList() {
    if (recordingSelect) {
      recordingSelect.innerHTML = '';
      // Iterate through all keys in localStorage
      Object.keys(localStorage).forEach(key => {
        // Check if the key matches the recording file naming convention
        if (key.endsWith('.txt') && key.startsWith('recording-')) {
          const option = document.createElement("option");
          option.value = key;

          // Extract and format the timestamp from the filename for display
          let timestampStr = key.replace("recording-", "").replace(".txt", "");
          // Re-add colons to the time part to make it a valid ISO string again for Date parsing
          timestampStr = timestampStr.replace(/T(\d{2})-(\d{2})-(\d{2})/, 'T$1:$2:$3');

          const date = new Date(timestampStr);

          // Handle cases where the date parsing might fail (e.g., corrupted filenames)
          if (isNaN(date.getTime())) {
            option.textContent = `Recording - Corrupted Name (${key.replace("recording-", "").replace(".txt", "")})`;
            return;
          }

          // Format the date into a user-friendly string
          const formattedDate = date.toLocaleString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
          });

          // Set display text for the option
          option.textContent = `Recording - ${formattedDate}`;
          // Add the option to the dropdown
          recordingSelect.appendChild(option);
        }
      });
    }
  }

  /**
   * Parses the text content of a recorded session into an array of interval objects.
   * Each interval includes the state ('Good'/'Avoid'), start time, and end time.
   */
  function parseRecordingText(text) {
    // Split the text into individual lines
    const lines = text.trim().split('\n');
    // Array to store the parsed intervals
    const intervals = [];

    // Tracks the state of the current active interval
    let currentState = null;
    // Tracks the start time of the current active interval
    let currentStartTime = null;

    // Iterate over each line of the recording text
    lines.forEach(line => {
      // Use regex to match 'Start', 'Toggle', or 'End' entries and capture their type, state, and raw time
      const match = line.match(/(Start|Toggle|End): (\w+) at (.+)/);
      // Skip lines that don't match the expected format
      if (!match) return;

      // Destructure matched groups
      const [, type, state, rawTime] = match;
      // Normalize the raw time to ensure it's a valid ISO string for Date parsing
      const time = rawTime.replace('+00:00Z', 'Z');

      // Logic for 'Start' and 'Toggle' events
      if (type === 'Start' || type === 'Toggle') {
        // If there was a previous active interval, close it before starting a new one
        if (currentState !== null && currentStartTime !== null) {
          intervals.push({ state: currentState, start: currentStartTime, end: time });
        }
        // Set the new current state and start time
        currentState = state;
        currentStartTime = time;
      }

      // Logic for 'End' event
      if (type === 'End') {
        // If there was an active interval, close it with the 'End' time
        if (currentState !== null && currentStartTime !== null) {
          intervals.push({ state: currentState, start: currentStartTime, end: time });
        }
      }
    });

    // Return the array of parsed intervals
    return intervals;
  }

  // Trigger file input when clicking the upload button
  if (uploadGpxBtn && gpxFile) {
    // When the 'Upload GPX' button is clicked, programmatically click the hidden file input
    uploadGpxBtn.addEventListener('click', () => gpxFile.click());

    // When a file is selected in the hidden GPX file input
    gpxFile.addEventListener('change', () => {
      const file = gpxFile.files[0];
      if (file) {
        gpxFilename.textContent = file.name;
        // Show sections related to recording selection and processing
        recordingSection.style.display = 'block';
        document.querySelector('.upload-txt-wrapper').style.display = 'flex';
        // Populate the dropdown with saved recordings
        populateRecordingList();
      }

    });
  }

  /**
   * Event listener for the recording select dropdown.
   * When a recording is selected, parse its content and display the Process button.
   */
  if (recordingSelect) {
    recordingSelect.addEventListener('change', () => {
      // Get the selected recording's key (filename)
      const selectedKey = recordingSelect.value;
      // Retrieve the content from localStorage
      const content = localStorage.getItem(selectedKey);
      // Display a shortened version of the selected recording's filename
      txtFilename.textContent = selectedKey.replace("recording-", "").replace(".txt", "");
      // Parse the recording text into intervals
      const parsedIntervals = parseRecordingText(content);
      // Log parsed intervals for debugging
      console.log("Parsed Intervals:", parsedIntervals);
      // Show the section containing the Process button
      processSection.style.display = 'block';
    });
  }

  /**
   * Event listener for the 'Process' button.
   * Handles reading the GPX file, parsing the recording intervals, and initiating the split process.
   */
  if (processBtn) {
    processBtn.addEventListener('click', () => {
      console.log("Process button clicked");

      // Get the selected recording
      const selectedKey = recordingSelect.value;
      // Get its content
      const txtContent = localStorage.getItem(selectedKey);

      // Validate that a recording is selected
      if (!selectedKey || !txtContent) {
        alert("Please select a valid recording.");
        return;
      }

      // Parse the recording intervals
      const intervals = parseRecordingText(txtContent);
      // Log for debugging
      console.log("Parsed intervals:", intervals);

      // Get the uploaded GPX file
      const file = gpxFile.files[0];

      // Validate that a GPX file is uploaded
      if (!file) {
        alert("Please upload a GPX file first.");
        return;
      }

      // Create a FileReader to read the GPX file
      const reader = new FileReader();
      // Callback for when the file is successfully read
      reader.onload = () => {
        // Get the content of the GPX file
        const gpxText = reader.result;
        console.log("GPX file read successfully");

        try {
          // Show the results section
          resultSection.style.display = 'block';
          // Call the core function to process the GPX and split it based on intervals
          processGpxAndSplit(gpxText, intervals);
        } catch (err) {
          console.error("Error in processGpxAndSplit:", err);
          alert("Something went wrong while processing the GPX file.");
        }
      };
      reader.readAsText(file);
    });
  }

  // --- Hidden input for testing local upload of txt recording ---
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

  // Initially populate list of saved recordings
  populateRecordingList();

});

/** Saves recording content locally in the browser's localStorage
 * The recording is stored with a unique filename based on the current timestamp */
function saveRecordingLocally(content) {
  // Get the current date and time
  const now = new Date();
  // Format the timestamp for the filename: ISO string, with colons replaced by dashes for file compatibility
  const timestamp = now.toISOString().replace(/:/g, '-');
  // Construct the filename using the timestamp
  const filename = `recording-${timestamp}.txt`;
  // Store the content in localStorage under the generated filename
  localStorage.setItem(filename, content);
  // Log a confirmation message to the console
  console.log("Recording saved as:", filename);
}

/**
 * Processes GPX track data and splits it into "Good" and "Avoid" segments
 * based on a set of provided time intervals and their associated states.
 * It also handles large time gaps in the track data, splitting segments accordingly.
 * Finally, it generates GPX content for each segment type, displays them on a map,
 */
function processGpxAndSplit(gpxText, intervals) {
  // Create a new DOMParser to parse the XML string
  const parser = new DOMParser();
  // Parse the GPX text into an XML Document object
  const xmlDoc = parser.parseFromString(gpxText, "application/xml");
  // Get all <trkpt> (track point) elements from the XML document and convert to an array
  const trkpts = Array.from(xmlDoc.getElementsByTagName("trkpt"));

  // Initialize arrays to store the processed "Good" and "Avoid" segments
  const goodSegments = [];
  const avoidSegments = [];

  // Variables to track the current segment being built
  let currentSegmentType = null;
  let currentSegmentPoints = [];

  // Variables for gap detection
  let lastTime = null;
  const maxGap = 5 * 60 * 1000;

  // Iterate over each track point in the GPX data
  trkpts.forEach(pt => {
    // Get the <time> element for the current track point
    const timeEl = pt.getElementsByTagName("time")[0];
    // If no time element is found, skip this point (it's invalid)
    if (!timeEl) return;
    // Parse the time string to a Date object and get its timestamp (milliseconds since epoch)
    const ptTime = new Date(timeEl.textContent).getTime();

    // Find the interval that this track point falls within
    const interval = intervals.find(i => {
      const start = new Date(i.start).getTime();
      const end = new Date(i.end).getTime();
      // Check if the point's time is within the interval's start and end times
      return ptTime >= start && ptTime < end;
    });

    // Extract latitude and longitude attributes from the track point
    const lat = parseFloat(pt.getAttribute("lat"));
    const lon = parseFloat(pt.getAttribute("lon"));
    // Get the <ele> (elevation) element if it exists
    const eleEl = pt.getElementsByTagName("ele")[0];
    // Extract elevation, defaulting to undefined if not present
    const ele = eleEl ? parseFloat(eleEl.textContent) : undefined;
    // Get the original time string
    const time = timeEl.textContent;

    // Create an object to store the data for the current point
    const pointData = { lat, lon, ele, time };

    // --- Gap Detection Logic ---
    // Check if there was a previous point and if the time difference exceeds the maximum allowed gap
    if (lastTime !== null && (ptTime - lastTime > maxGap)) {
      if (currentSegmentPoints.length > 0) {
        // If a gap is detected and there are points in the current segment,
        // finalize the current segment before starting a new one
        if (currentSegmentType === "Good") {
          goodSegments.push(currentSegmentPoints);
        } else if (currentSegmentType === "Avoid") {
          avoidSegments.push(currentSegmentPoints);
        }
        // Reset segment variables
        currentSegmentPoints = [];
        currentSegmentType = null;
      }
    }

    // --- Segment Assignment Logic ---
    // If the current point falls within a defined interval:
    if (interval) {
      const newSegmentType = interval.state;

      // If the segment type has changed AND there are points in the current segment,
      // finalize the previous segment
      if (newSegmentType !== currentSegmentType && currentSegmentPoints.length > 0) {
        if (currentSegmentType === "Good") {
          goodSegments.push(currentSegmentPoints);
        } else if (currentSegmentType === "Avoid") {
          avoidSegments.push(currentSegmentPoints);
        }
        // Reset points for the new segment
        currentSegmentPoints = [];
      }

      // Update the current segment type and add the point to the current segment
      currentSegmentType = newSegmentType;
      currentSegmentPoints.push(pointData);
    } else {
      // If the point does NOT fall within any defined interval:
      // If there are points in the current segment, finalize it (as it's now outside a defined interval)
      if (currentSegmentPoints.length > 0) {
        if (currentSegmentType === "Good") {
          goodSegments.push(currentSegmentPoints);
        } else if (currentSegmentType === "Avoid") {
          avoidSegments.push(currentSegmentPoints);
        }
        // Reset segment variables (no active segment type)
        currentSegmentPoints = [];
        currentSegmentType = null;
      }
    }
    // Update the last processed time
    lastTime = ptTime;
  });

  // --- Finalize any remaining segment after iterating through all points ---
  if (currentSegmentPoints.length > 0) {
    if (currentSegmentType === "Good") {
      goodSegments.push(currentSegmentPoints);
    } else if (currentSegmentType === "Avoid") {
      avoidSegments.push(currentSegmentPoints);
    }
  }

  // Generate the final GPX XML content for "Good" and "Avoid" segments
  const goodGpxContent = generateGpxContent(goodSegments);
  const avoidGpxContent = generateGpxContent(avoidSegments);

  // Display the split segments on the Leaflet map
  displaySplitMap(goodSegments, avoidSegments);

  // Get references to the download buttons
  const downloadGoodGpxBtn = document.getElementById("downloadGoodGpxBtn");
  const downloadAvoidGpxBtn = document.getElementById("downloadAvoidGpxBtn");

  // Assign click handlers to the download buttons to download the respective GPX files
  if (downloadGoodGpxBtn) {
    downloadGoodGpxBtn.onclick = () => downloadFile(goodGpxContent, 'good.gpx');
  }
  if (downloadAvoidGpxBtn) {
    downloadAvoidGpxBtn.onclick = () => downloadFile(avoidGpxContent, 'avoid.gpx');
  }
}

/**
 * Generates a GPX XML string from an array of track segments.
 * Each segment is represented as a <trkseg> containing multiple <trkpt> elements.
 */
function generateGpxContent(segments) {
  let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1" creator="SegmentApp">
  <trk>
    <name>Segmented Track</name>\n`;

  // Iterate over each segment
  segments.forEach((segment) => {
      if (segment.length > 0) {
          // Add the <trkseg> start tag
          gpx += `    <trkseg>\n`;
          // Iterate over each point within the current segment
          segment.forEach(pt => {
              // Add the <trkpt> start tag with lat and lon attributes
              gpx += `      <trkpt lat="${pt.lat}" lon="${pt.lon}">\n`;
              // If elevation data exists, add the <ele> tag
              if (pt.ele !== undefined) {
                  gpx += `        <ele>${pt.ele}</ele>\n`;
              }
              // Add the <time> tag
              gpx += `        <time>${pt.time}</time>\n`;
              gpx += `      </trkpt>\n`;
          });
          // Close the <trkseg> tag
          gpx += `    </trkseg>\n`;
      }
  });

  // Close the <trk> and <gpx> tags
  gpx += `  </trk>
</gpx>`;
  // Return the complete GPX XML string
  return gpx;
}

/**
 * Initializes or updates a Leaflet map to display "Good" and "Avoid" GPX segments.
 * Clears any existing map instance on the container before re-initializing.
 */
function displaySplitMap(goodSegments, avoidSegments) {
  // Get the map container element
  const container = document.getElementById('map-preview');

  // Check if a Leaflet map instance already exists on the container and remove it.
  // Prevents multiple map instances being created on the same element
  if (container._leaflet_map) {
    container._leaflet_map.remove();
    // Clear the reference
    container._leaflet_map = null;
  }
  // Clear any Leaflet-specific ID that might linger, preventing re-initialization issues
  if (container._leaflet_id) {
    delete container._leaflet_id;
  }

  // Clear any previous HTML content in the container
  container.innerHTML = '';

  // Initialize a new Leaflet map on the 'map-preview' element
  // Enable the fullscreen control
  const map = L.map('map-preview', {
  fullscreenControl: true
});
  // Store a reference to the Leaflet map instance on the container element for later removal
container._leaflet_map = map;

// Add OpenStreetMap tile layer to the map
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  // Array to collect all coordinates for fitting the map bounds
  const allPoints = [];

  // Iterate through good segments and add them to the map
  goodSegments.forEach(segment => {
    // Convert point objects to Leaflet-compatible [lat, lon] arrays
    const latLngs = segment.map(pt => [pt.lat, pt.lon]);
    // Only add if there are points in the segment
    if (latLngs.length) {
      // Create a polyline for the segment with a specific 'Good' color
      const poly = L.polyline(latLngs, {
        color: '#3d5930',
        weight: 4,
        opacity: 0.9
      }).addTo(map);
      // Add these points to the overall collection for bounding box calculation
      allPoints.push(...latLngs);
    }
  });

  // Iterate through avoid segments and add them to the map
  avoidSegments.forEach(segment => {
    // Convert point objects to Leaflet-compatible [lat, lon] arrays
    const latLngs = segment.map(pt => [pt.lat, pt.lon]);
    // Only add if there are points in the segment
    if (latLngs.length) {
      // Create a polyline for the segment with a specific 'Avoid' color
      const poly = L.polyline(latLngs, {
        color: '#a13939',
        weight: 4,
        opacity: 0.8
      }).addTo(map);
      // Add these points to the overall collection for bounding box calculation
      allPoints.push(...latLngs);
    }
  });

  // If there are any points to display, fit the map view to show all of them
  if (allPoints.length) {
    map.fitBounds(allPoints);
  }

  // Invalidate map size after a short delay to ensure it renders correctly
  setTimeout(() => {
    map.invalidateSize();
  }, 200);
}

// Initiates a file download in the browser
function downloadFile(content, filename) {
  // Create a Blob object from the content, specifying GPX XML type
  const blob = new Blob([content], { type: "application/gpx+xml" });
  // Create a URL for the Blob
  const url = URL.createObjectURL(blob);
  // Create a temporary anchor (<a>) element
  const a = document.createElement("a");
  // Set the href of the anchor to the Blob URL
  a.href = url;
  // Set the download attribute to specify the filename
  a.download = filename;
  // Append the anchor to the document body (it doesn't need to be visible)
  document.body.appendChild(a);
  a.click();
  // Remove the temporary anchor from the document
  document.body.removeChild(a);
  // Release the Blob URL to free up memory
  URL.revokeObjectURL(url);
}