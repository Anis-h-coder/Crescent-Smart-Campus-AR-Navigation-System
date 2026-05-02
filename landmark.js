/* ============================================================
   landmark.js — Crescent Campus AI Landmark Recognition
   Wired to premium landmark.html UI hooks
   ============================================================ */

/* ── YOUR REPLIT URL — update this after deploying to Replit ── */
const AI_SERVER = "";

let video            = null;
let detectedBuilding = "";
let isScanning       = false;

/* ── WAIT FOR PAGE LOAD ── */
document.addEventListener("DOMContentLoaded", startCamera);

/* ── START CAMERA ── */
function startCamera() {
  video = document.getElementById("camera");
  if (!video) return;

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    window.setStatus("Camera not supported in this browser");
    return;
  }

  /* Try rear camera — lower resolution saves memory */
  navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: { ideal: "environment" },
      width:  { ideal: 640 },
      height: { ideal: 480 }
    },
    audio: false
  })
  .then(stream => {
    video.srcObject = stream;
    window.setStatus("Point camera at a building");
  })
  .catch(err => {
    console.warn("Rear camera failed, trying any camera:", err);
    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      .then(stream => {
        video.srcObject = stream;
        window.setStatus("Point camera at a building");
      })
      .catch(error => {
        console.error("Camera unavailable:", error);
        window.setStatus("Camera permission denied");
      });
  });
}

/* ── CAPTURE IMAGE & DETECT ── */
function captureImage() {
  if (isScanning) return;

  if (!video || !video.videoWidth) {
    window.setStatus("Camera not ready — please wait");
    return;
  }

  isScanning = true;
  window.setScanning(true);

  const canvas = document.createElement("canvas");
  canvas.width  = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);

  canvas.toBlob(blob => {
    if (!blob) {
      window.setStatus("Could not capture image");
      window.setScanning(false);
      isScanning = false;
      return;
    }
    sendToAI(blob);
  }, "image/jpeg", 0.7);
}

/* ── SEND TO AI SERVER ── */
function sendToAI(blob) {
  const formData = new FormData();
  formData.append("image", blob, "capture.jpg");

  fetch(AI_SERVER + "/predict", {
    method: "POST",
    body:   formData
  })
  .then(response => {
    if (!response.ok) throw new Error("Server returned " + response.status);
    return response.json();
  })
  .then(data => {
    isScanning = false;

    if (!data || data.error) {
      window.setScanning(false);
      window.setStatus("Detection failed — try again");
      return;
    }

    detectedBuilding = data.building || "Unknown Building";

    /* Accept both 0-1 and 0-100 confidence formats */
    const rawConf  = parseFloat(data.confidence) || 0;
    const confNorm = rawConf > 1 ? rawConf / 100 : rawConf;

    window.showResult(detectedBuilding, confNorm);
  })
  .catch(err => {
    isScanning = false;
    console.error("AI server error:", err);
    window.setScanning(false);
    window.setStatus("Cannot reach AI server — check connection");
  });
}

/* ── OPEN BUILDING DETAILS ── */
function openDetails() {
  if (!detectedBuilding) return;
  const role = localStorage.getItem("role") || "visitor";
  location.href =
    "building-info.html?name=" + encodeURIComponent(detectedBuilding) +
    "&role="                    + encodeURIComponent(role);
}

/* Expose to HTML onclick attributes */
window.captureImage = captureImage;
window.openDetails  = openDetails;