/* ==========================================================================
   Meetings page — Upcoming / Completed
   ========================================================================== */

let meetingsTable;
let activeMeetingTab = "upcoming";

function renderMeetingsPage() {
  const user = CURRENT_LAYOUT_USER;
  document.getElementById("pageSubText").textContent = user.role === "admin" ? "Track and manage every scheduled meeting across the team." : "Your scheduled meetings across all leads.";

  populateMeetingFilters();
  computeMeetingTabCounts();
  meetingsTable = createTableController({
    data: DB.meetings,
    pageSize: 8,
    mountBodyId: "meetingsTableBody",
    mountPaginationId: "meetingsPagination",
    mountCountId: "meetingsCount",
    filterFn: buildMeetingFilter(),
    renderRow: renderMeetingRow,
  });
  meetingsTable.render();

  document.getElementById("addMeetingBtn").addEventListener("click", () => openMeetingModal());
  document.getElementById("meetingSearchInput").addEventListener("input", debounce(refreshMeetings, 150));
  document.getElementById("meetingTypeFilter").addEventListener("change", debounce(refreshMeetings, 150));

  document.querySelectorAll(".meeting-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".meeting-tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      activeMeetingTab = tab.dataset.tab;
      refreshMeetings();
    });
  });

  document.addEventListener("meeting:saved", () => { computeMeetingTabCounts(); refreshMeetings(); });
  document.addEventListener("lead:saved", () => refreshMeetings());
}

function populateMeetingFilters() {
  document.getElementById("meetingTypeFilter").innerHTML = `<option value="">All Meeting Types</option>` + DB.settings.meetingTypes.map(t => `<option value="${t}">${t}</option>`).join("");
}

function computeMeetingTabCounts() {
  const rows = CURRENT_LAYOUT_USER.role === "admin" ? DB.meetings : DB.meetings.filter(m => m.salesperson === CURRENT_LAYOUT_USER.id);
  const counts = {
    upcoming: rows.filter(m => m.status !== "Completed").length,
    completed: rows.filter(m => m.status === "Completed").length,
  };
  Object.entries(counts).forEach(([k, v]) => {
    const el = document.getElementById(`tabCount_${k}`);
    if (el) el.textContent = v;
  });
}

function buildMeetingFilter() {
  const user = CURRENT_LAYOUT_USER;
  const term = document.getElementById("meetingSearchInput").value.trim().toLowerCase();
  const type = document.getElementById("meetingTypeFilter").value;
  return function (m) {
    if (user.role !== "admin" && m.salesperson !== user.id) return false;
    if (activeMeetingTab === "upcoming" && m.status === "Completed") return false;
    if (activeMeetingTab === "completed" && m.status !== "Completed") return false;
    if (type && m.type !== type) return false;
    if (term) {
      const lead = getLeadById(m.leadId);
      const hay = `${lead ? lead.company + lead.name : m.leadId} ${m.type} ${m.notes}`.toLowerCase();
      if (!hay.includes(term)) return false;
    }
    return true;
  };
}

function refreshMeetings() {
  meetingsTable.data = DB.meetings;
  meetingsTable.refresh(buildMeetingFilter());
}

const MEETING_TYPE_ICON_LIST = { "Virtual Meeting": "meeting", "Client Site Visit": "building", "Dealer Visit": "briefcase" };

function renderMeetingRow(m) {
  const lead = getLeadById(m.leadId);
  return `
    <tr>
      <td>
        <div class="cell-with-avatar">
          <div class="avatar avatar-sm">${lead ? initials(lead.name) : "?"}</div>
          <div><div class="cwa-name">${lead ? lead.company : m.leadId}</div><div class="cwa-sub">${lead ? lead.name : ""}</div></div>
        </div>
      </td>
      <td class="cell-muted">${userName(m.salesperson)}</td>
      <td><span class="flex items-center gap-2">${icon(MEETING_TYPE_ICON_LIST[m.type] || "meeting")} ${m.type}</span></td>
      <td class="cell-muted">${formatDate(m.date)}</td>
      <td class="cell-muted">${m.time}</td>
      <td class="cell-muted" style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${m.attachment ? icon("paperclip") + " " : ""}${m.notes || "—"}</td>
      <td>${statusBadge(m.status)}</td>
      <td class="cell-actions">
        <div class="dropdown" style="display:inline-block;">
          <button class="row-menu-btn">${icon("more")}</button>
          <div class="row-menu-panel">
            ${m.status !== "Completed" ? `<div class="dropdown-item" data-mt2-act="complete" data-mt2-id="${m.id}">${icon("check")} Complete</div>` : ""}
            <div class="dropdown-item" data-mt2-act="edit" data-mt2-id="${m.id}">${icon("edit")} Edit</div>
            <div class="dropdown-item danger" data-mt2-act="delete" data-mt2-id="${m.id}">${icon("trash")} Delete</div>
          </div>
        </div>
      </td>
    </tr>`;
}

document.addEventListener("click", (e) => {
  const item = e.target.closest("[data-mt2-act]");
  if (!item) return;
  const id = item.dataset.mt2Id;
  const act = item.dataset.mt2Act;
  if (act === "complete") completeMeeting(id);
  if (act === "edit") {
    const mt = DB.meetings.find(x => x.id === id);
    openMeetingModal(mt.leadId, id);
  }
  if (act === "delete") deleteMeeting(id);
});

document.addEventListener("layout:ready", renderMeetingsPage);
