/* ============================================================
   confirm.js — Crescent Campus Route Confirmation
   Wired to premium confirm.html DOM IDs
   ============================================================ */

const params = new URLSearchParams(location.search);
const idx    = params.get("place");
const role   = params.get("role") || "student";

/* ── GUARD: no destination ── */
if (idx === null) {
  alert("Invalid navigation request");
  location.href = "index.html";
}

/* ── LOGIN CHECK ── */
if (role === "student" && !localStorage.getItem("student")) {
  alert("Please login with your college email");
  location.href = "student-login.html";
}

/* ── LOAD DESTINATION NAME ── */
fetch("data/locations.json")
  .then(r => r.json())
  .then(data => {
    const dest = data[parseInt(idx)];

    if (!dest) {
      alert("Destination not found");
      location.href = "index.html";
      return;
    }

    /* Update hero destination name */
    const placeNameEl = document.getElementById("placeName");
    if (placeNameEl) placeNameEl.innerText = dest.name;
  })
  .catch(() => {
    alert("Could not load navigation data");
    location.href = "index.html";
  });

/* ── START AR NAVIGATION ── */
function startAR() {
  location.href = `ar.html?place=${idx}&role=${role}`;
}