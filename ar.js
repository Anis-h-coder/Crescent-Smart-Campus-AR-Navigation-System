/* ============================================================
   ar.js — Crescent Campus AR Navigation
   ============================================================ */

/* ── YOUR REPLIT URL ── */
const AI_SERVER = "";

/* ── URL PARAMS ── */
const params = new URLSearchParams(location.search);
const idx    = params.get("place");
const role   = params.get("role") || "student";

/* ── STATE ── */
let destination         = null;
let destinationNode     = null;
let arrived             = false;
let userHeading         = 0;
let smoothHeading       = 0;
let lastInstruction     = "";
let lastDistance        = Infinity;
let wrongDirectionCount = 0;
let filteredLat         = null;
let filteredLng         = null;
let campusGraph         = null;
let currentRoute        = [];
let currentTargetIndex  = 0;
let initialDistance     = null;
let watchId             = null;

/* ── VOICE: enabled by default, unlocked on first gesture ── */
let voiceEnabled  = true;
let voiceUnlocked = false;

function unlockVoice() {
  if (voiceUnlocked) return;
  voiceUnlocked = true;
  /* Speak a silent utterance to unblock the audio context on iOS/Android */
  try {
    const dummy = new SpeechSynthesisUtterance(" ");
    dummy.volume = 0;
    speechSynthesis.speak(dummy);
  } catch (e) { /* ignore */ }
}

["touchstart", "click", "keydown"].forEach(evt =>
  document.addEventListener(evt, unlockVoice, { once: true, passive: true })
);

/* ── DOM HELPERS ── */
function updateStatus(msg) {
  const el = document.getElementById("statusText");
  if (el) el.innerText = msg || "";
}
/* alias used throughout */
function setStatus(msg) { updateStatus(msg); }

function setNavInstruction(icon, text, distStr, etaStr, distPct) {
  if (window.setNavInstruction) window.setNavInstruction(icon, text, distStr, etaStr, distPct);
}
function setAIDetection(building, confidence) {
  if (window.setAIDetection) window.setAIDetection(building, confidence);
}
function setDestinationName(name) {
  if (window.setDestination) window.setDestination(name);
}

/* ── SPEECH ── */
function speak(text) {
  if (!voiceEnabled) return;
  if (!window.speechSynthesis) return;
  try {
    const msg = new SpeechSynthesisUtterance(text);
    msg.lang  = "en-US";
    msg.rate  = 0.95;
    speechSynthesis.cancel();
    speechSynthesis.speak(msg);
  } catch (e) {
    console.warn("Speech error:", e);
  }
}

/* ── CAMERA — runs immediately, does not wait for data ── */
function initCamera() {
  const video = document.getElementById("camera");
  if (!video) { console.error("Camera video element not found"); return; }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    console.error("getUserMedia not supported");
    setStatus("Camera not supported on this browser");
    return;
  }

  const constraints = {
    video: {
      facingMode: { ideal: "environment" },
      width:  { ideal: 1280 },
      height: { ideal: 720 }
    },
    audio: false
  };

  navigator.mediaDevices.getUserMedia(constraints)
    .then(stream => {
      video.srcObject = stream;
      video.muted     = true;
      video.setAttribute("playsinline", "");
      video.setAttribute("muted", "");

      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setStatus("Camera ready · GPS acquiring...");
            const captureCanvas = document.createElement("canvas");
            setInterval(() => captureFrame(video, captureCanvas), 12000);
          })
          .catch(err => {
            setStatus("Tap screen to enable camera");
            const resume = () => {
              video.play().catch(console.warn);
            };
            document.addEventListener("touchstart", resume, { once: true });
            document.addEventListener("click",      resume, { once: true });
          });
      }
    })
    .catch(err => {
      const msgs = {
        NotAllowedError:  "Camera permission denied — GPS only mode",
        NotFoundError:    "No camera found — GPS only mode",
        NotReadableError: "Camera in use by another app — GPS only mode"
      };
      setStatus(msgs[err.name] || "Camera unavailable — GPS only mode");
    });
}

/* ── CAPTURE FRAME ── */
function captureFrame(video, canvas) {
  if (!video || !video.videoWidth || !video.videoHeight) return;
  if (canvas.width  !== video.videoWidth)  canvas.width  = video.videoWidth;
  if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight;
  try {
    canvas.getContext("2d").drawImage(video, 0, 0);
    canvas.toBlob(blob => { if (blob) detectBuilding(blob); }, "image/jpeg", 0.6);
  } catch (e) { console.warn("Frame capture error:", e); }
}

/* ── AI BUILDING DETECTION ── */
async function detectBuilding(imageBlob) {
  try {
    const formData = new FormData();
    formData.append("image", imageBlob);
    const response = await fetch(AI_SERVER + "/predict", { method: "POST", body: formData });
    if (!response.ok) throw new Error("Server returned " + response.status);
    const data = await response.json();
    if (!data || data.confidence < 90) { setAIDetection("No building detected", 0); return; }
    setAIDetection(data.building, Math.round(data.confidence));
  } catch (err) {
    console.log("AI detection (non-critical):", err.message);
  }
}

/* ── COMPASS ── */
/* FIX: reduced alpha from 0.8→0.5 so heading reacts faster.
        also added a 5° dead-zone to avoid flipping instructions on tiny jitter. */
function handleOrientation(event) {
  let heading;
  if (event.webkitCompassHeading !== undefined && event.webkitCompassHeading !== null) {
    heading = event.webkitCompassHeading;
  } else if (event.alpha !== null && event.alpha !== undefined) {
    heading = (360 - event.alpha) % 360;
  } else {
    return;
  }

  /* Smooth with a faster factor (0.5 instead of 0.8) */
  smoothHeading = smoothHeading * 0.5 + heading * 0.5;

  /* Only update if change exceeds dead-zone (5°) to suppress micro-jitter */
  const delta = Math.abs(smoothHeading - userHeading);
  const wrapped = delta > 180 ? 360 - delta : delta;
  if (wrapped > 5) {
    userHeading = smoothHeading;
  }
}

function requestOrientationPermission() {
  if (typeof DeviceOrientationEvent !== "undefined" &&
      typeof DeviceOrientationEvent.requestPermission === "function") {
    DeviceOrientationEvent.requestPermission()
      .then(state => {
        if (state === "granted")
          window.addEventListener("deviceorientation", handleOrientation, true);
      })
      .catch(console.warn);
  } else {
    window.addEventListener("deviceorientation", handleOrientation, true);
  }
}

/* ── GPS SMOOTHING ── */
/* FIX: alpha increased from 0.3→0.6 so position updates more responsively.
        This reduces the lag that made distances feel frozen or too large. */
function smoothGPS(lat, lng) {
  const alpha = 0.6;
  if (filteredLat === null) {
    filteredLat = lat;
    filteredLng = lng;
  } else {
    filteredLat = alpha * lat + (1 - alpha) * filteredLat;
    filteredLng = alpha * lng + (1 - alpha) * filteredLng;
  }
  return { lat: filteredLat, lng: filteredLng };
}

/* ══════════════════════════════════════════════════════
   ── CAMERA STARTS IMMEDIATELY — no data dependency ──
   ══════════════════════════════════════════════════════ */
initCamera();

/* ── LOAD DATA AND START NAVIGATION ── */
Promise.all([
  fetch("data/locations.json").then(r => r.json()),
  fetch("data/campusGraph.json").then(r => r.json())
])
.then(([locations, graph]) => {
  campusGraph = graph;

  if (idx === null || idx === undefined) {
    setStatus("No destination — go back and try again");
    return;
  }

  destination = locations[parseInt(idx)];

  if (!destination) { setStatus("Invalid destination"); return; }

  destinationNode = findNearestNode(destination.lat, destination.lng);
  setDestinationName(destination.name);
  setStatus("GPS acquiring...");

  /* Delay speech slightly so the audio context has time to unlock */
  setTimeout(() => speak(`Navigation started to ${destination.name}`), 1200);

  requestOrientationPermission();
  startNavigation();
})
.catch(err => {
  console.error("Data load error:", err);
  setStatus("Failed to load navigation data");
});

/* ── NAVIGATION LOOP ── */
function startNavigation() {
  if (!navigator.geolocation) { setStatus("GPS not supported on this device"); return; }
  watchId = navigator.geolocation.watchPosition(
    onPositionUpdate,
    onPositionError,
    { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
  );
}

function onPositionError(err) {
  const msgs = {
    1: "GPS permission denied — enable location",
    2: "GPS signal unavailable",
    3: "GPS timeout — retrying..."
  };
  setStatus(msgs[err.code] || "GPS error");
}

function onPositionUpdate(position) {
  if (arrived) return;

  /* FIX: tightened accuracy threshold from 100m→50m for better position quality */
  if (position.coords.accuracy > 50) {
    setStatus(`Improving GPS accuracy... (±${Math.round(position.coords.accuracy)}m)`);
    return;
  }

  const smoothed = smoothGPS(position.coords.latitude, position.coords.longitude);
  const userLat  = smoothed.lat;
  const userLng  = smoothed.lng;

  const CAMPUS_LAT    = 12.8747;
  const CAMPUS_LNG    = 80.0838;
  const CAMPUS_RADIUS = 1200;

  const campusDist = calculateDistance(userLat, userLng, CAMPUS_LAT, CAMPUS_LNG);

  if (campusDist > CAMPUS_RADIUS) {
    setStatus("You are outside Crescent campus");
    setNavInstruction("📍", "Move closer to campus to start navigation", "", "", 0);
    return;
  }

  const destDist = calculateDistance(userLat, userLng, destination.lat, destination.lng);

  /* FIX: reduced arrival threshold from 12m→8m — 12m was triggering too early */
  if (destDist < 8) {
    showArrival();
    return;
  }

  if (initialDistance === null) initialDistance = destDist;

  const currentNode = findNearestNode(userLat, userLng);

  if (currentRoute.length === 0 || currentTargetIndex >= currentRoute.length) {
    const route = aStar(currentNode, destinationNode);
    if (!route || route.length === 0) {
      setStatus("No path — using direct navigation");
      updateDirectDirect(userLat, userLng, destDist);
      return;
    }
    currentRoute       = route;
    currentTargetIndex = 0;
    setStatus("Route calculated");
  }

  const nextNodeKey = currentRoute[currentTargetIndex];
  const nextNode    = campusGraph.nodes[nextNodeKey];

  if (!nextNode) { currentRoute = []; return; }

  const nodeDistance = calculateDistance(userLat, userLng, nextNode.lat, nextNode.lng);

  updateDirection(userLat, userLng, nextNode.lat, nextNode.lng, destDist, nodeDistance);
  detectWrongDirection(nodeDistance, currentNode);

  if (nodeDistance < 10) {
    currentTargetIndex = Math.min(currentTargetIndex + 1, currentRoute.length - 1);
  }

  setStatus(`Navigating · ${Math.round(destDist)}m to ${destination.name}`);

/* ── MINI MAP UPDATE ── */
if (window.setMMPositions) {
  window.setMMPositions(
    userLat, userLng,
    destination.lat, destination.lng,
    userHeading
  );
}
}

/* ── DIRECT FALLBACK ── */
function updateDirectDirect(userLat, userLng, destDist) {
  const bearing = calculateBearing(userLat, userLng, destination.lat, destination.lng);
  const diff    = normalizeBearingDiff(bearing - userHeading);
  applyInstruction(diff, destDist, destDist);
}

/* ── WRONG DIRECTION ── */
function detectWrongDirection(nodeDistance, currentNode) {
  if (nodeDistance > lastDistance + 8) {
    wrongDirectionCount++;
  } else {
    wrongDirectionCount = 0;
  }

  if (wrongDirectionCount >= 4) {
    setStatus("Re-routing...");
    speak("Re-routing");
    const newRoute = aStar(currentNode, destinationNode);
    if (newRoute && newRoute.length > 0) {
      currentRoute       = newRoute;
      currentTargetIndex = 0;
    }
    wrongDirectionCount = 0;
  }
  lastDistance = nodeDistance;
}

/* ── DIRECTION ── */
function updateDirection(userLat, userLng, nextLat, nextLng, destDist, nodeDist) {
  const bearing = calculateBearing(userLat, userLng, nextLat, nextLng);
  const diff    = normalizeBearingDiff(bearing - userHeading);
  applyInstruction(diff, destDist, nodeDist);
}

/* FIX: extracted into helper — ensures diff is always in (-180, 180] */
function normalizeBearingDiff(diff) {
  return ((diff % 360) + 540) % 360 - 180;
}

/* FIX: widened the "straight" zone from ±20° to ±25° to reduce
        false left/right triggers caused by minor heading wobble.
        Added hysteresis: only speak a new instruction if it differs
        from the last one (unchanged logic) AND passes the angle band. */
function applyInstruction(diff, destDist, nodeDist) {
  let instruction, icon;

  const abs = Math.abs(diff);
  if      (abs  < 25)               { instruction = "Go straight";  icon = "⬆"; }
  else if (diff >= 25  && diff < 65) { instruction = "Slight right"; icon = "↗"; }
  else if (diff >= 65  && diff < 155){ instruction = "Turn right";   icon = "➡"; }
  else if (diff <= -25 && diff > -65){ instruction = "Slight left";  icon = "↖"; }
  else if (diff <= -65 && diff > -155){ instruction = "Turn left";   icon = "⬅"; }
  else                               { instruction = "Turn around";  icon = "🔄"; }

  const walkingSpeedMs = 4500 / 3600;
  const etaSec  = destDist / walkingSpeedMs;
  const etaStr  = etaSec < 60 ? `${Math.round(etaSec)}s` : `${Math.round(etaSec / 60)}min`;
  const distStr = destDist < 1000
    ? `${Math.round(destDist)}m`
    : `${(destDist / 1000).toFixed(2)}km`;
  const distPct = initialDistance
    ? Math.max(0, Math.min(100, (1 - destDist / initialDistance) * 100))
    : 0;

  if (window.setArrowDirection) window.setArrowDirection(diff);
  setNavInstruction(icon, instruction, distStr, etaStr, distPct);

  if (instruction !== lastInstruction) {
    speak(instruction);
    lastInstruction = instruction;
  }
}

/* ── ARRIVAL ── */
function showArrival() {
  arrived = true;

  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }

  const arrowEl = document.getElementById("navArrow");
  if (arrowEl) arrowEl.style.display = "none";

  const hintEl = document.getElementById("arrowHint");
  if (hintEl) hintEl.style.display = "none";

  setNavInstruction("📍", `🎉 You've arrived at ${destination.name}!`, "0m", "0s", 100);
  setStatus("Navigation complete");

/* ── MINI MAP: freeze on destination ── */
if (window.setMMPositions) {
  window.setMMPositions(
    destination.lat, destination.lng,
    destination.lat, destination.lng,
    userHeading
  );
}
  setAIDetection(destination.name, 100);
  speak(`You have arrived at ${destination.name}`);
}

/* ── A* PATH FINDING ── */
const _gScore = {};
const _fScore = {};

function aStar(start, goal) {
  if (!campusGraph || !campusGraph.nodes || !campusGraph.edges) return [];
  if (!campusGraph.nodes[start] || !campusGraph.nodes[goal])     return [];
  if (start === goal) return [goal];

  const open     = new Set([start]);
  const cameFrom = {};
  const gScore   = _gScore;
  const fScore   = _fScore;

  for (const n in campusGraph.nodes) {
    gScore[n] = Infinity;
    fScore[n] = Infinity;
  }

  gScore[start] = 0;
  fScore[start] = heuristic(start, goal);

  let iterations = 0;
  const MAX_ITER = 2000;

  while (open.size > 0 && iterations++ < MAX_ITER) {
    let current = null;
    let bestF   = Infinity;
    for (const n of open) {
      if (fScore[n] < bestF) { bestF = fScore[n]; current = n; }
    }

    if (current === goal) return reconstructPath(cameFrom, current);

    open.delete(current);

    const edges = campusGraph.edges.filter(e => e.from === current);
    for (const e of edges) {
      const tentative = gScore[current] + (e.distance || 1);
      if (tentative < gScore[e.to]) {
        cameFrom[e.to] = current;
        gScore[e.to]   = tentative;
        fScore[e.to]   = tentative + heuristic(e.to, goal);
        open.add(e.to);
      }
    }
  }
  return [];
}

function heuristic(a, b) {
  const A = campusGraph.nodes[a];
  const B = campusGraph.nodes[b];
  if (!A || !B) return Infinity;
  return calculateDistance(A.lat, A.lng, B.lat, B.lng);
}

function reconstructPath(cameFrom, current) {
  const path = [current];
  while (cameFrom[current]) {
    current = cameFrom[current];
    path.unshift(current);
  }
  return path;
}

/* ── NEAREST NODE ── */
function findNearestNode(lat, lng) {
  let min     = Infinity;
  let nearest = null;
  for (const key in campusGraph.nodes) {
    const node = campusGraph.nodes[key];
    const d    = calculateDistance(lat, lng, node.lat, node.lng);
    if (d < min) { min = d; nearest = key; }
  }
  return nearest;
}

/* ── HAVERSINE ── */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R    = 6371000;
  const toR  = x => x * Math.PI / 180;
  const dLat = toR(lat2 - lat1);
  const dLon = toR(lon2 - lon1);
  const a    =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toR(lat1)) * Math.cos(toR(lat2)) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* ── BEARING ── */
function calculateBearing(lat1, lon1, lat2, lon2) {
  const toR  = x => x * Math.PI / 180;
  const toD  = x => x * 180 / Math.PI;
  const dLon = toR(lon2 - lon1);
  const y    = Math.sin(dLon) * Math.cos(toR(lat2));
  const x    =
    Math.cos(toR(lat1)) * Math.sin(toR(lat2)) -
    Math.sin(toR(lat1)) * Math.cos(toR(lat2)) * Math.cos(dLon);
  return (toD(Math.atan2(y, x)) + 360) % 360;
}