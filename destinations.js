/* ============================================================
   destinations.js — Crescent Campus Destination Selector
   Wired to premium destinations.html DOM IDs
   ============================================================ */

const role       = new URLSearchParams(location.search).get("role") || "visitor";
const accentCount = 6;
let allCards     = [];

/* ── ROLE LABEL ── */
const roleLabels = { student: "Student", admin: "Admin", visitor: "Visitor" };
const roleLabelEl = document.getElementById("roleLabel");
if (roleLabelEl) roleLabelEl.innerText = roleLabels[role] || "Visitor";

/* ── ICON MAP ── */
function getIcon(name) {
  const lower = (name || "").toLowerCase();
  const iconMap = {
    "gate":        "🚪",
    "main":        "🚪",
    "computer":    "💻",
    "electrical":  "⚡",
    "mechanical":  "⚙️",
    "convocation": "🎓",
    "science":     "🔬",
    "library":     "📚",
    "canteen":     "🍽️",
    "medical":     "🏥",
    "parking":     "🅿️",
    "hostel":      "🏠",
    "admin":       "🏛️",
    "sports":      "🏆",
    "block":       "🏢"
  };
  for (const [key, icon] of Object.entries(iconMap)) {
    if (lower.includes(key)) return icon;
  }
  return "📍";
}

/* ── LOAD LOCATIONS ── */
fetch("data/locations.json")
  .then(r => r.json())
  .then(data => {
    /* Remove skeleton loaders */
    ["sk1", "sk2", "sk3"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.remove();
    });

    const accessible = data.filter(l => l.access && l.access.includes(role));

    /* Update stats */
    const totalEl  = document.getElementById("totalLoc");
    const accessEl = document.getElementById("accessLoc");
    if (totalEl)  totalEl.innerText  = data.length;
    if (accessEl) accessEl.innerText = accessible.length;

    const countEl = document.getElementById("visibleCount");
    if (countEl) countEl.innerText =
      accessible.length + " location" + (accessible.length !== 1 ? "s" : "");

    const list = document.getElementById("list");
    if (!list) return;

    if (!accessible.length) {
      list.innerHTML = `
        <div class="state-card">
          <span>🔒</span>
          <h3>No accessible locations</h3>
          <p>No destinations available for your role (${role})</p>
        </div>`;
      return;
    }

    let accentIdx = 0;

    data.forEach((l, i) => {
      if (!l.access || !l.access.includes(role)) return;

      const accent = `accent-${accentIdx % accentCount}`;
      accentIdx++;

      const card = document.createElement("div");
      card.className = `dest-card ${accent}`;
      card.dataset.name = (l.name || "").toLowerCase();
      card.style.animationDelay = (accentIdx * 0.04) + "s";

      card.innerHTML = `
        <div class="dest-stripe"></div>
        <div class="dest-inner">
          <div class="dest-icon">${getIcon(l.name)}</div>
          <div class="dest-body">
            <div class="dest-name">${l.name}</div>
            <div class="dest-meta">📍 Crescent Campus &nbsp;·&nbsp; ${role}</div>
            <span class="dest-badge">🧭 AR Navigate</span>
          </div>
          <div class="dest-chevron">›</div>
        </div>`;

      card.onclick = () => {
        location.href = `confirm.html?place=${i}&role=${role}`;
      };

      list.appendChild(card);
      allCards.push(card);
    });
  })
  .catch(() => {
    const list = document.getElementById("list");
    if (list) list.innerHTML = `
      <div class="state-card">
        <span>⚠️</span>
        <h3>Could not load locations</h3>
        <p>Please check your connection and try again</p>
      </div>`;
  });

/* ── SEARCH ── */
function filterSearch(val) {
  const q       = val.trim().toLowerCase();
  const clearBtn = document.getElementById("searchClear");
  if (clearBtn) clearBtn.classList.toggle("show", q.length > 0);

  let visible = 0;
  allCards.forEach(card => {
    const match = card.dataset.name.includes(q);
    card.style.display = match ? "flex" : "none";
    if (match) visible++;
  });

  const countEl = document.getElementById("visibleCount");
  if (countEl) countEl.innerText =
    visible + " location" + (visible !== 1 ? "s" : "");

  /* Empty search state */
  const list    = document.getElementById("list");
  const emptyEl = list ? list.querySelector(".state-card.search-empty") : null;

  if (visible === 0 && q && list) {
    if (!emptyEl) {
      const div = document.createElement("div");
      div.className = "state-card search-empty";
      div.innerHTML = `<span>🔍</span><h3>No results for "${val}"</h3><p>Try a different building name</p>`;
      list.appendChild(div);
    }
  } else if (emptyEl) {
    emptyEl.remove();
  }
}

function clearSearch() {
  const input = document.getElementById("searchInput");
  if (input) input.value = "";
  filterSearch("");
}

/* Expose to HTML oninput/onclick */
window.filterSearch = filterSearch;
window.clearSearch  = clearSearch;