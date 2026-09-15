/* ==========================================================================
   Leads page — list, filter, sort, paginate, and row actions.
   ========================================================================== */

let leadsTable;

function renderLeadsPage() {
  const user = CURRENT_LAYOUT_USER;
  const isAdmin = user.role === "admin";

  document.getElementById("pageTitleText").textContent = isAdmin ? "Leads" : "My Leads";
  document.getElementById("pageSubText").textContent = isAdmin ? "Manage and track every lead across your sales pipeline." : "Leads currently assigned to you.";
  if (!isAdmin) {
    document.getElementById("assignedFilterWrap").classList.add("hidden");
    document.getElementById("addLeadBtn").classList.add("hidden");
    document.getElementById("importLeadsBtn").classList.add("hidden");
  }

  populateFilterOptions();
  applyUrlParamFilters();

  leadsTable = createTableController({
    data: DB.leads,
    pageSize: 8,
    mountBodyId: "leadsTableBody",
    mountPaginationId: "leadsPagination",
    mountCountId: "leadsCount",
    filterFn: buildFilterFn(),
    renderRow: renderLeadRow,
  });
  leadsTable.render();
  wireRowMenus(document.getElementById("leadsTableBody"));

  document.getElementById("addLeadBtn").addEventListener("click", () => openAddLeadModal());
  document.getElementById("importLeadsBtn").addEventListener("click", () => showToast("Import Leads is simulated in this prototype — CSV import will be available after backend integration.", "info"));
  document.getElementById("exportLeadsBtn").addEventListener("click", () => showToast("Leads exported successfully (simulated).", "success"));

  ["searchInput", "statusFilter", "leadTypeFilter", "assignedFilter", "priorityFilter", "dateFromFilter", "dateToFilter"].forEach(id => {
    const el = document.getElementById(id);
    el.addEventListener(id === "searchInput" ? "input" : "change", debounce(() => leadsTable.refresh(buildFilterFn()), 150));
  });

  document.querySelectorAll(".data-table thead th.sortable").forEach(th => {
    th.addEventListener("click", () => {
      document.querySelectorAll(".data-table thead th").forEach(t => t.classList.remove("sorted"));
      th.classList.add("sorted");
      leadsTable.setSort(th.dataset.sort);
    });
  });

  document.addEventListener("lead:saved", refreshLeadsTable);
  document.addEventListener("lead:assigned", refreshLeadsTable);
  document.addEventListener("lead:converted", refreshLeadsTable);
  document.addEventListener("lead:deleted", refreshLeadsTable);
}

function refreshLeadsTable() {
  leadsTable.data = DB.leads;
  leadsTable.refresh(buildFilterFn());
}

function populateFilterOptions() {
  document.getElementById("statusFilter").innerHTML = `<option value="">All Statuses</option>` + DB.settings.leadStatuses.map(s => `<option value="${s}">${s}</option>`).join("");
  document.getElementById("leadTypeFilter").innerHTML = `<option value="">All Lead Types</option>` + DB.settings.leadTypes.map(s => `<option value="${s}">${s}</option>`).join("");
  document.getElementById("priorityFilter").innerHTML = `<option value="">All Priorities</option>` + PRIORITIES.map(p => `<option value="${p}">${p}</option>`).join("");
  const salesUsers = DB.users.filter(u => u.role === "sales");
  document.getElementById("assignedFilter").innerHTML = `<option value="">All Salespeople</option>` + salesUsers.map(u => `<option value="${u.id}">${u.name}</option>`).join("");
}

function applyUrlParamFilters() {
  const status = qs("status");
  if (status) document.getElementById("statusFilter").value = status;
  const leadType = qs("leadType");
  if (leadType) document.getElementById("leadTypeFilter").value = leadType;
}

function buildFilterFn() {
  const user = CURRENT_LAYOUT_USER;
  const term = document.getElementById("searchInput").value.trim().toLowerCase();
  const status = document.getElementById("statusFilter").value;
  const leadType = document.getElementById("leadTypeFilter").value;
  const assigned = document.getElementById("assignedFilter").value;
  const priority = document.getElementById("priorityFilter").value;
  const dateFrom = document.getElementById("dateFromFilter").value;
  const dateTo = document.getElementById("dateToFilter").value;

  return function (l) {
    if (user.role !== "admin" && l.assignedTo !== user.id) return false;
    if (term && !(l.name.toLowerCase().includes(term) || l.company.toLowerCase().includes(term) || l.id.toLowerCase().includes(term) || l.email.toLowerCase().includes(term))) return false;
    if (status && l.status !== status) return false;
    if (leadType && l.leadType !== leadType) return false;
    if (assigned && l.assignedTo !== assigned) return false;
    if (priority && l.priority !== priority) return false;
    if (dateFrom && l.created < dateFrom) return false;
    if (dateTo && l.created > dateTo) return false;
    return true;
  };
}

function renderLeadRow(l) {
  const canManage = CURRENT_LAYOUT_USER.role === "admin";
  const chance = CONVERSION_CHANCES.find(c => c.value === l.conversionChance);
  return `
    <tr>
      <td>
        <div class="cell-with-avatar" title="${chance ? chance.label : "Conversion chance not set"}">
          <span class="conversion-dot" style="background:${conversionChanceColor(l.conversionChance)};"></span>
          <div class="avatar avatar-sm">${initials(l.name)}</div>
          <div><div class="cwa-name">${l.name}</div><div class="cwa-sub">${l.company}</div></div>
        </div>
      </td>
      <td class="cell-muted">${l.company}</td>
      <td class="cell-muted" style="white-space:nowrap;">${l.phone}</td>
      <td class="cell-muted">${l.email}</td>
      <td>${userName(l.assignedTo)}</td>
      <td>${statusBadge(l.status)}</td>
      <td class="cell-muted">${formatDate(l.nextFollowup)}</td>
      <td class="cell-muted">${formatDate(l.created)}</td>
      <td class="cell-actions">
        <div class="dropdown" style="display:inline-block;">
          <button class="row-menu-btn">${icon("more")}</button>
          <div class="row-menu-panel">
            <a class="dropdown-item" href="lead-details.html?id=${l.id}">${icon("eye")} View</a>
            <div class="dropdown-item" data-act="edit" data-id="${l.id}">${icon("edit")} Edit</div>
            ${canManage ? `<div class="dropdown-item" data-act="assign" data-id="${l.id}">${icon("users")} Assign</div>` : ""}
            <div class="dropdown-item" data-act="followup" data-id="${l.id}">${icon("followups")} Add Follow-up</div>
            ${l.status !== "Converted" && l.status !== "Lost" ? `<div class="dropdown-item" data-act="convert" data-id="${l.id}">${icon("checkCircle")} Convert</div>` : ""}
            ${canManage ? `<div class="dropdown-item danger" data-act="delete" data-id="${l.id}">${icon("trash")} Delete</div>` : ""}
          </div>
        </div>
      </td>
    </tr>`;
}

document.addEventListener("click", (e) => {
  const item = e.target.closest("[data-act]");
  if (!item) return;
  const id = item.dataset.id;
  const act = item.dataset.act;
  if (act === "edit") openEditLeadModal(id);
  if (act === "assign") openAssignModal(id);
  if (act === "followup") openFollowupModal(id);
  if (act === "convert") convertLead(id);
  if (act === "delete") deleteLead(id);
});

document.addEventListener("layout:ready", renderLeadsPage);
