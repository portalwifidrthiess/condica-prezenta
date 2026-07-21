(() => {
  "use strict";

  // ---------- state ----------
  const state = {
    company: null,   // {id, name}
    action: null,    // 'checkin' | 'checkout'
    employee: null,  // string
  };

  // ---------- helpers ----------
  const $ = (id) => document.getElementById(id);

  function showScreen(id) {
    document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
    $(id).classList.add("active");
  }

  function formatDateHeader() {
    const d = new Date();
    const s = d.toLocaleDateString("ro-RO", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function formatTime(d) {
    return d.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" });
  }

  function resetToStart() {
    state.company = null;
    state.action = null;
    state.employee = null;
    showScreen("screen-company");
  }

  // ---------- init header + company grid ----------
  $("headerDate").textContent = formatDateHeader();

  const companyGrid = $("companyGrid");
  COMPANIES.forEach((c) => {
    const btn = document.createElement("button");
    btn.className = "company-card";
    btn.textContent = c.name;
    btn.addEventListener("click", () => {
      state.company = c;
      $("selectedCompanyLabel").textContent = c.name;
      showScreen("screen-action");
    });
    companyGrid.appendChild(btn);
  });

  // ---------- action selection ----------
  document.querySelectorAll(".action-card").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.action = btn.dataset.action;
      buildEmployeeGrid();
      $("employeeStepLabel").textContent =
        state.action === "checkin" ? "Pasul 3 — alege numele tău (sosire)" : "Pasul 3 — alege numele tău (plecare)";
      showScreen("screen-employee");
    });
  });

  // ---------- employee grid ----------
  function buildEmployeeGrid() {
    const grid = $("employeeGrid");
    grid.innerHTML = "";
    state.company.employees.forEach((name) => {
      const btn = document.createElement("button");
      btn.className = "employee-card";
      btn.textContent = name;
      btn.addEventListener("click", () => {
        state.employee = name;
        if (state.action === "checkin") {
          openSignatureScreen();
        } else {
          openDepartureScreen();
        }
      });
      grid.appendChild(btn);
    });
  }

  // ---------- back links ----------
  document.querySelectorAll("[data-back]").forEach((btn) => {
    btn.addEventListener("click", () => showScreen(btn.dataset.back));
  });

  // ============================================================
  // SIGNATURE PAD (sosire)
  // ============================================================
  const canvas = $("signatureCanvas");
  const ctx = canvas.getContext("2d");
  let drawing = false;
  let hasStroke = false;

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1D2A38";
  }

  function pointerPos(evt) {
    const rect = canvas.getBoundingClientRect();
    const t = evt.touches ? evt.touches[0] : evt;
    return { x: t.clientX - rect.left, y: t.clientY - rect.top };
  }

  function startDraw(evt) {
    evt.preventDefault();
    drawing = true;
    hasStroke = true;
    $("signPlaceholder").style.opacity = "0";
    const p = pointerPos(evt);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    $("confirmSignature").disabled = false;
  }
  function moveDraw(evt) {
    if (!drawing) return;
    evt.preventDefault();
    const p = pointerPos(evt);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }
  function endDraw() { drawing = false; }

  canvas.addEventListener("mousedown", startDraw);
  canvas.addEventListener("mousemove", moveDraw);
  window.addEventListener("mouseup", endDraw);
  canvas.addEventListener("touchstart", startDraw, { passive: false });
  canvas.addEventListener("touchmove", moveDraw, { passive: false });
  canvas.addEventListener("touchend", endDraw);

  function clearCanvas() {
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    hasStroke = false;
    $("signPlaceholder").style.opacity = "1";
    $("confirmSignature").disabled = true;
  }

  $("clearSignature").addEventListener("click", clearCanvas);

  function openSignatureScreen() {
    $("signatureEmployeeName").textContent = state.employee;
    showScreen("screen-signature");
    requestAnimationFrame(() => {
      resizeCanvas();
      clearCanvas();
    });
  }

  $("confirmSignature").addEventListener("click", () => {
    if (!hasStroke) return;
    submitEntry("checkin");
  });

  // ============================================================
  // DEPARTURE CONFIRM (ieșire din tură)
  // ============================================================
  function openDepartureScreen() {
    $("departureEmployeeName").textContent = state.employee;
    $("departureTimePreview").textContent = formatTime(new Date());
    showScreen("screen-confirm-departure");
  }

  $("confirmDeparture").addEventListener("click", () => {
    submitEntry("checkout");
  });

  // ============================================================
  // SUBMIT TO GOOGLE APPS SCRIPT
  // ============================================================
  function submitEntry(action) {
    const now = new Date();
    const payload = {
      action,                       // 'checkin' | 'checkout'
      company: state.company.name,
      employee: state.employee,
      clientTime: now.toISOString(),
    };

    if (action === "checkin" && hasStroke) {
      // trimitem desenul semnăturii, ca dovadă în caz de control
      payload.signature = canvas.toDataURL("image/png");
    }

    const busyBtn = action === "checkin" ? $("confirmSignature") : $("confirmDeparture");
    busyBtn.disabled = true;
    busyBtn.textContent = "Se trimite…";

    fetch(APPS_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors", // Apps Script web apps don't return readable CORS headers
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    })
      .then(() => {
        showSuccess(action, now);
      })
      .catch(() => {
        showError("Nu s-a putut trimite înregistrarea. Verifică internetul și încearcă din nou.");
      })
      .finally(() => {
        busyBtn.disabled = false;
        busyBtn.textContent = action === "checkin" ? "Confirmă sosirea" : "Confirmă plecarea";
      });
  }

  function showSuccess(action, time) {
    $("stampLabel").textContent = action === "checkin" ? "SOSIRE" : "PLECARE";
    $("stampTime").textContent = formatTime(time);
    $("successMessage").textContent =
      action === "checkin"
        ? `${state.employee} — sosire înregistrată la ${formatTime(time)}.`
        : `${state.employee} — ieșire din tură înregistrată la ${formatTime(time)}.`;
    // restart stamp animation
    const stamp = $("stamp");
    stamp.style.animation = "none";
    void stamp.offsetWidth;
    stamp.style.animation = "";
    showScreen("screen-success");
  }

  function showError(msg) {
    $("errorMessage").textContent = msg;
    showScreen("screen-error");
  }

  $("newEntry").addEventListener("click", resetToStart);
  $("errorBack").addEventListener("click", () => showScreen("screen-employee"));

  window.addEventListener("resize", () => {
    if ($("screen-signature").classList.contains("active")) {
      resizeCanvas();
    }
  });
})();
