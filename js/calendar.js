/* ==========================================================================
   Calendar page — Month / Week / Day views over DB.calendarEvents
   ========================================================================== */

let calView = "month";
let calCursor = new Date(2026, 8, 10); // Sept 10, 2026 — matches seed "today"

const EVENT_TYPE_COLOR = { "Follow-up": "#4f46e5", Meeting: "#0891b2", "Payment Reminder": "#d97706", Other: "#6b7086" };

function renderCalendarPage() {
  document.getElementById("addEventBtn").addEventListener("click", () => openEventModal());
  document.querySelectorAll(".cal-view-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".cal-view-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      calView = btn.dataset.view;
      renderCalendarBody();
    });
  });
  document.getElementById("calPrevBtn").addEventListener("click", () => { shiftCursor(-1); renderCalendarBody(); });
  document.getElementById("calNextBtn").addEventListener("click", () => { shiftCursor(1); renderCalendarBody(); });
  document.getElementById("calTodayBtn").addEventListener("click", () => { calCursor = new Date(2026, 8, 10); renderCalendarBody(); });

  injectEventModal();
  renderCalendarBody();

  document.addEventListener("followup:saved", renderCalendarBody);
  document.addEventListener("cal:saved", renderCalendarBody);
}

function shiftCursor(dir) {
  if (calView === "month") calCursor.setMonth(calCursor.getMonth() + dir);
  else if (calView === "week") calCursor.setDate(calCursor.getDate() + dir * 7);
  else calCursor.setDate(calCursor.getDate() + dir);
}

function toISO(d) { return d.toISOString().slice(0, 10); }

function eventsForUser() {
  const user = CURRENT_LAYOUT_USER;
  return user.role === "admin" ? DB.calendarEvents : DB.calendarEvents.filter(e => e.assignedTo === user.id);
}

function renderCalendarBody() {
  const label = document.getElementById("calRangeLabel");
  const grid = document.getElementById("calendarGrid");
  const events = eventsForUser();

  if (calView === "month") {
    label.textContent = calCursor.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
    grid.innerHTML = renderMonthGrid(events);
  } else if (calView === "week") {
    const start = new Date(calCursor); start.setDate(start.getDate() - start.getDay());
    const end = new Date(start); end.setDate(end.getDate() + 6);
    label.textContent = `${start.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} – ${end.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`;
    grid.innerHTML = renderWeekView(events, start);
  } else {
    label.textContent = calCursor.toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
    grid.innerHTML = renderDayView(events, calCursor);
  }
  wireEventClicks();
}

function renderMonthGrid(events) {
  const year = calCursor.getFullYear(), month = calCursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayIso = "2026-09-10";

  let cells = "";
  for (let i = 0; i < startOffset; i++) cells += `<div class="cal-cell cal-cell-empty"></div>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, month, d);
    const iso = toISO(dateObj);
    const dayEvents = events.filter(e => e.date === iso);
    const isToday = iso === todayIso;
    cells += `<div class="cal-cell ${isToday ? "cal-today" : ""}" data-date="${iso}">
      <div class="cal-cell-date">${d}</div>
      <div class="cal-cell-events">
        ${dayEvents.slice(0, 3).map(e => `<div class="cal-event-chip" data-ev-id="${e.id}" style="background:${EVENT_TYPE_COLOR[e.type]}22;color:${EVENT_TYPE_COLOR[e.type]};"><span class="dot-tag" style="background:${EVENT_TYPE_COLOR[e.type]}"></span>${e.time} ${escapeHtml(e.title)}</div>`).join("")}
        ${dayEvents.length > 3 ? `<div class="cal-more-chip" data-date="${iso}">+${dayEvents.length - 3} more</div>` : ""}
      </div>
    </div>`;
  }
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return `
    <div class="cal-grid-header">${weekdays.map(w => `<div>${w}</div>`).join("")}</div>
    <div class="cal-grid-body">${cells}</div>`;
}

function renderWeekView(events, start) {
  let html = `<div class="cal-week-list">`;
  for (let i = 0; i < 7; i++) {
    const d = new Date(start); d.setDate(d.getDate() + i);
    const iso = toISO(d);
    const dayEvents = events.filter(e => e.date === iso).sort((a, b) => a.time.localeCompare(b.time));
    html += `<div class="cal-week-day">
      <div class="cal-week-day-head">${d.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" })}</div>
      <div class="cal-week-day-body">
        ${dayEvents.length ? dayEvents.map(e => `<div class="cal-event-chip block" data-ev-id="${e.id}" style="background:${EVENT_TYPE_COLOR[e.type]}22;color:${EVENT_TYPE_COLOR[e.type]};"><span class="dot-tag" style="background:${EVENT_TYPE_COLOR[e.type]}"></span>${e.time} ${escapeHtml(e.title)}</div>`).join("") : `<div class="text-faint fs-xs">No events</div>`}
      </div>
    </div>`;
  }
  html += `</div>`;
  return html;
}

function renderDayView(events, day) {
  const iso = toISO(day);
  const dayEvents = events.filter(e => e.date === iso).sort((a, b) => a.time.localeCompare(b.time));
  if (!dayEvents.length) return `<div class="empty-state"><div class="empty-icon">${icon("calendar")}</div><h4>No events scheduled</h4><p>There are no events for this day.</p></div>`;
  return `<div class="timeline" style="padding:var(--sp-2) 0;">${dayEvents.map(e => `
    <div class="timeline-item">
      <div class="timeline-dot" style="background:${EVENT_TYPE_COLOR[e.type]}22;color:${EVENT_TYPE_COLOR[e.type]};">${icon(e.type === "Meeting" ? "meeting" : e.type === "Payment Reminder" ? "rupee" : "followups")}</div>
      <div class="timeline-content">
        <div class="timeline-title" data-ev-id="${e.id}" style="cursor:pointer;">${escapeHtml(e.title)}</div>
        <div class="timeline-desc">${e.type} · ${userName(e.assignedTo)}</div>
        <div class="timeline-time">${e.time}</div>
      </div>
    </div>`).join("")}</div>`;
}

function wireEventClicks() {
  document.querySelectorAll("[data-ev-id]").forEach(el => {
    el.addEventListener("click", (ev) => { ev.stopPropagation(); openEventDetailsModal(el.dataset.evId); });
  });
  document.querySelectorAll(".cal-more-chip").forEach(el => {
    el.addEventListener("click", (ev) => { ev.stopPropagation(); calView = "day"; calCursor = new Date(el.dataset.date + "T00:00:00"); document.querySelectorAll(".cal-view-btn").forEach(b => b.classList.toggle("active", b.dataset.view === "day")); renderCalendarBody(); });
  });
  document.querySelectorAll(".cal-cell[data-date]").forEach(cell => {
    cell.addEventListener("click", () => openEventModal(cell.dataset.date));
  });
}

/* ---------- Event modal (add + view) ---------- */
function injectEventModal() {
  if (document.getElementById("eventModal")) return;
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.id = "eventModal";
  backdrop.innerHTML = `
    <div class="modal modal-sm">
      <div class="modal-header"><h3>Add Event</h3><button class="modal-close" data-close-modal>${icon("x")}</button></div>
      <div class="modal-body">
        <div class="field"><label>Title <span class="required">*</span></label><input class="input" id="evTitle" placeholder="e.g. Follow-up call with ABC Ltd"></div>
        <div class="field"><label>Event Type</label>
          <select class="select-field2" id="evType"><option>Follow-up</option><option>Meeting</option><option>Payment Reminder</option><option>Other</option></select>
        </div>
        <div class="form-grid">
          <div class="field"><label>Date <span class="required">*</span></label><input class="input" type="date" id="evDate"></div>
          <div class="field"><label>Time <span class="required">*</span></label><input class="input" type="time" id="evTime"></div>
        </div>
        <div class="field"><label>Assigned To</label>
          <select class="select-field2" id="evAssigned">${DB.users.filter(u => u.status === "active").map(u => `<option value="${u.id}">${u.name}</option>`).join("")}</select>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" data-close-modal>Cancel</button>
        <button class="btn btn-primary" id="evSaveBtn"><span class="btn-label">Save Event</span></button>
      </div>
    </div>`;
  document.body.appendChild(backdrop);
  document.getElementById("evSaveBtn").addEventListener("click", () => {
    const title = document.getElementById("evTitle").value.trim();
    const date = document.getElementById("evDate").value;
    const time = document.getElementById("evTime").value;
    if (!title || !date || !time) { showToast("Please fill all required fields.", "error"); return; }
    const btn = document.getElementById("evSaveBtn");
    setBtnLoading(btn, true);
    setTimeout(() => {
      DB.calendarEvents.unshift({ id: "EV-" + Date.now(), title, type: document.getElementById("evType").value, date, time, assignedTo: document.getElementById("evAssigned").value, relatedId: "" });
      saveDB();
      setBtnLoading(btn, false);
      closeModal("eventModal");
      showToast("Event added to calendar.", "success");
      document.dispatchEvent(new CustomEvent("cal:saved"));
    }, 500);
  });
}
function openEventModal(dateStr) {
  injectEventModal();
  document.getElementById("evTitle").value = "";
  document.getElementById("evType").value = "Follow-up";
  document.getElementById("evDate").value = dateStr || toISO(calCursor);
  document.getElementById("evTime").value = "10:00";
  document.getElementById("evAssigned").value = CURRENT_LAYOUT_USER.id;
  openModal("eventModal");
}

function openEventDetailsModal(evId) {
  const e = DB.calendarEvents.find(x => x.id === evId);
  if (!e) return;
  let backdrop = document.getElementById("eventViewModal");
  if (!backdrop) {
    backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    backdrop.id = "eventViewModal";
    document.body.appendChild(backdrop);
  }
  const lead = e.relatedId ? getLeadById(e.relatedId) : null;
  backdrop.innerHTML = `
    <div class="modal modal-sm">
      <div class="modal-header"><h3>Event Details</h3><button class="modal-close" data-close-modal>${icon("x")}</button></div>
      <div class="modal-body">
        <h4 class="mb-3">${escapeHtml(e.title)}</h4>
        <div class="form-grid" style="row-gap:14px;">
          ${infoField("Type", e.type)}
          ${infoField("Date", formatDate(e.date))}
          ${infoField("Time", e.time)}
          ${infoField("Assigned To", userName(e.assignedTo))}
        </div>
        ${lead ? `<hr class="divider"><a href="lead-details.html?id=${lead.id}" class="btn btn-secondary btn-sm">${icon("eye")} View Related Lead</a>` : ""}
      </div>
      <div class="modal-footer"><button class="btn btn-secondary" data-close-modal>Close</button></div>
    </div>`;
  openModal("eventViewModal");
}
function infoField(label, value) {
  return `<div><div class="text-faint fs-xs fw-600" style="text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px;">${label}</div><div class="fs-sm fw-500">${value}</div></div>`;
}

document.addEventListener("layout:ready", renderCalendarPage);
