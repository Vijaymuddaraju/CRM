/* ==========================================================================
   Follow-ups page — Today's / Upcoming / Overdue / Completed
   ========================================================================== */

let followupsTable;
let activeFollowupTab = "today";
const TODAY_REF = "2026-09-10";

function renderFollowupsPage() {
  const user = CURRENT_LAYOUT_USER;
  document.getElementById("pageSubText").textContent = user.role === "admin" ? "Track and manage every scheduled follow-up across the team." : "Your scheduled follow-ups across all leads.";

  computeTabCounts();
  followupsTable = createTableController({
    data: DB.followups,
    pageSize: 8,
    mountBodyId: "followupsTableBody",
    mountPaginationId: "followupsPagination",
    mountCountId: "followupsCount",
    filterFn: buildFollowupFilter(),
    renderRow: renderFollowupRow,
  });
  followupsTable.render();

  document.getElementById("addFollowupBtn").addEventListener("click", () => openFollowupModal());
  document.getElementById("followupSearchInput").addEventListener("input", debounce(refreshFollowups, 150));

  document.querySelectorAll(".followup-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".followup-tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      activeFollowupTab = tab.dataset.tab;
      refreshFollowups();
    });
  });

  document.addEventListener("followup:saved", () => { computeTabCounts(); refreshFollowups(); });
  document.addEventListener("lead:saved", () => refreshFollowups());
}

function computeTabCounts() {
  const rows = CURRENT_LAYOUT_USER.role === "admin" ? DB.followups : DB.followups.filter(f => f.salesperson === CURRENT_LAYOUT_USER.id);
  const counts = {
    today: rows.filter(f => f.date === TODAY_REF && f.status !== "Completed").length,
    upcoming: rows.filter(f => f.date > TODAY_REF && f.status === "Pending").length,
    overdue: rows.filter(f => f.status === "Overdue" || (f.date < TODAY_REF && f.status === "Pending")).length,
    completed: rows.filter(f => f.status === "Completed").length,
  };
  Object.entries(counts).forEach(([k, v]) => {
    const el = document.getElementById(`tabCount_${k}`);
    if (el) el.textContent = v;
  });
}

function buildFollowupFilter() {
  const user = CURRENT_LAYOUT_USER;
  const term = document.getElementById("followupSearchInput").value.trim().toLowerCase();
  return function (f) {
    if (user.role !== "admin" && f.salesperson !== user.id) return false;
    if (activeFollowupTab === "today" && !(f.date === TODAY_REF && f.status !== "Completed")) return false;
    if (activeFollowupTab === "upcoming" && !(f.date > TODAY_REF && f.status === "Pending")) return false;
    if (activeFollowupTab === "overdue" && !(f.status === "Overdue" || (f.date < TODAY_REF && f.status === "Pending"))) return false;
    if (activeFollowupTab === "completed" && f.status !== "Completed") return false;
    if (term) {
      const lead = getLeadById(f.leadId);
      const hay = `${lead ? lead.company + lead.name : f.leadId} ${f.type} ${f.notes}`.toLowerCase();
      if (!hay.includes(term)) return false;
    }
    return true;
  };
}

function refreshFollowups() {
  followupsTable.data = DB.followups;
  followupsTable.refresh(buildFollowupFilter());
}

const TYPE_ICON = { "Phone Call": "phone", Email: "mail", Meeting: "meeting", WhatsApp: "whatsapp", Other: "tag" };

function renderFollowupRow(f) {
  const lead = getLeadById(f.leadId);
  const isOverdue = f.status === "Overdue" || (f.date < TODAY_REF && f.status === "Pending");
  const displayStatus = isOverdue ? "Overdue" : f.status;
  return `
    <tr>
      <td>
        <div class="cell-with-avatar">
          <div class="avatar avatar-sm">${lead ? initials(lead.name) : "?"}</div>
          <div><div class="cwa-name">${lead ? lead.company : f.leadId}</div><div class="cwa-sub">${lead ? lead.name : ""}</div></div>
        </div>
      </td>
      <td class="cell-muted">${userName(f.salesperson)}</td>
      <td><span class="flex items-center gap-2">${icon(TYPE_ICON[f.type] || "tag")} ${f.type}</span></td>
      <td class="cell-muted">${formatDate(f.date)}</td>
      <td class="cell-muted">${f.time}</td>
      <td class="cell-muted" style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${f.notes || "—"}</td>
      <td>${statusBadge(displayStatus)}</td>
      <td class="cell-actions">
        <div class="dropdown" style="display:inline-block;">
          <button class="row-menu-btn">${icon("more")}</button>
          <div class="row-menu-panel">
            ${f.status !== "Completed" ? `<div class="dropdown-item" data-fu2-act="complete" data-fu2-id="${f.id}">${icon("check")} Complete</div>` : ""}
            ${f.status !== "Completed" ? `<div class="dropdown-item" data-fu2-act="reschedule" data-fu2-id="${f.id}">${icon("calendar")} Reschedule</div>` : ""}
            <div class="dropdown-item" data-fu2-act="edit" data-fu2-id="${f.id}">${icon("edit")} Edit</div>
            <div class="dropdown-item danger" data-fu2-act="delete" data-fu2-id="${f.id}">${icon("trash")} Delete</div>
          </div>
        </div>
      </td>
    </tr>`;
}

document.addEventListener("click", (e) => {
  const item = e.target.closest("[data-fu2-act]");
  if (!item) return;
  const id = item.dataset.fu2Id;
  const act = item.dataset.fu2Act;
  if (act === "complete") completeFollowup(id);
  if (act === "reschedule" || act === "edit") {
    const fu = DB.followups.find(x => x.id === id);
    openFollowupModal(fu.leadId, id);
  }
  if (act === "delete") deleteFollowup(id);
});

document.addEventListener("layout:ready", renderFollowupsPage);
