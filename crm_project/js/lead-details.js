/* ==========================================================================
   Lead Details page
   ========================================================================== */

let CURRENT_LEAD_ID = null;

function renderLeadDetailsPage() {
  CURRENT_LEAD_ID = qs("id");
  const lead = getLeadById(CURRENT_LEAD_ID);
  const container = document.getElementById("pageContent");

  if (!lead) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">${icon("alertCircle")}</div><h4>Lead not found</h4><p>The lead you're looking for doesn't exist or may have been deleted.</p><a href="leads.html" class="btn btn-primary">Back to Leads</a></div>`;
    return;
  }
  if (CURRENT_LAYOUT_USER.role !== "admin" && lead.assignedTo !== CURRENT_LAYOUT_USER.id) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">${icon("lock")}</div><h4>Access restricted</h4><p>This lead is not assigned to you.</p><a href="leads.html" class="btn btn-primary">Back to My Leads</a></div>`;
    return;
  }

  renderHeader(lead);
  renderInfoCards(lead);
  renderTabs(lead);
  wireActions(lead);
}

function renderHeader(lead) {
  document.getElementById("breadcrumbLeadName").textContent = lead.company;
  document.getElementById("leadTitleName").textContent = lead.company;
  document.getElementById("leadTitleSub").innerHTML = `${lead.name} &nbsp;·&nbsp; ${lead.id} &nbsp;·&nbsp; ${statusBadge(lead.status)} ${priorityDot(lead.priority)}`;

  const canManage = CURRENT_LAYOUT_USER.role === "admin";
  document.getElementById("moreActionsPanel").innerHTML = `
    ${canManage ? `<div class="dropdown-item" data-act="assign">${icon("users")} Assign Lead</div>` : ""}
    ${lead.status !== "Lost" && lead.status !== "Converted" ? `<div class="dropdown-item" data-act="lost">${icon("x")} Mark Lost</div>` : ""}
    ${canManage ? `<div class="dropdown-item danger" data-act="delete">${icon("trash")} Delete Lead</div>` : ""}
  `;
  document.getElementById("convertBtn").classList.toggle("hidden", lead.status === "Converted" || lead.status === "Lost");
}

function renderInfoCards(lead) {
  document.getElementById("leadInfoCard").innerHTML = `
    <div class="panel-header"><h3>Lead Information</h3></div>
    <div class="panel-body">
      <div class="form-grid" style="row-gap:14px;">
        ${infoField("Full Name", lead.name)}
        ${infoField("Company", lead.company)}
        ${infoField("Lead Source", lead.source)}
        ${infoField("Created Date", formatDate(lead.created))}
        <div class="span-2">${infoField("Requirement", lead.requirement || "—")}</div>
      </div>
    </div>`;

  document.getElementById("contactInfoCard").innerHTML = `
    <div class="panel-header"><h3>Contact Information</h3></div>
    <div class="panel-body">
      <div class="form-grid" style="row-gap:14px;">
        ${infoField("Phone", lead.phone)}
        ${infoField("Alternate Phone", lead.altPhone || "—")}
        <div class="span-2">${infoField("Email", lead.email)}</div>
      </div>
    </div>`;

  document.getElementById("salesInfoCard").innerHTML = `
    <div class="panel-header"><h3>Sales Information</h3></div>
    <div class="panel-body">
      <div class="form-grid" style="row-gap:14px;">
        ${infoField("Status", statusBadge(lead.status))}
        ${infoField("Priority", priorityDot(lead.priority))}
        ${infoField("Assigned Salesperson", userName(lead.assignedTo))}
        ${infoField("Expected Value", formatCurrency(lead.expectedValue))}
        ${infoField("Expected Closing", formatDate(lead.expectedClosing))}
        ${infoField("Last Contact", formatDate(lead.lastContact))}
      </div>
    </div>`;
}

function infoField(label, value) {
  return `<div><div class="text-faint fs-xs fw-600" style="text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px;">${label}</div><div class="fs-sm fw-500">${value}</div></div>`;
}

function renderTabs(lead) {
  renderFollowupTimeline(lead);
  renderActivityTimeline(lead);
  renderNotesTab(lead);
  renderQuotationsTab(lead);
  renderInvoicesTab(lead);
  renderPaymentsTab(lead);
}

function renderFollowupTimeline(lead) {
  const items = DB.followups.filter(f => f.leadId === lead.id).sort((a, b) => new Date(b.date + " " + b.time) - new Date(a.date + " " + a.time));
  const iconMap = { Pending: ["clock", "act-followup"], Completed: ["checkCircle", "act-invoice"], Overdue: ["alertCircle", "act-expense"] };
  document.getElementById("followupTimeline").innerHTML = items.length ? `<div class="timeline">${items.map(f => {
    const [ic, cls] = iconMap[f.status] || iconMap.Pending;
    return `<div class="timeline-item">
      <div class="timeline-dot ${cls}">${icon(ic)}</div>
      <div class="timeline-content">
        <div class="timeline-title">${f.type} ${statusBadge(f.status)}</div>
        <div class="timeline-desc">${f.notes || "No notes added."}</div>
        <div class="timeline-time">${formatDate(f.date)} · ${f.time}</div>
        ${f.status === "Pending" || f.status === "Overdue" ? `<div class="flex gap-2 mt-2">
          <button class="btn btn-secondary btn-sm" data-fu-act="complete" data-fu-id="${f.id}">${icon("check")} Complete</button>
          <button class="btn btn-ghost btn-sm" data-fu-act="reschedule" data-fu-id="${f.id}">${icon("edit")} Reschedule</button>
        </div>` : ""}
      </div>
    </div>`;
  }).join("")}</div>` : emptyPanel("No follow-ups yet", "Schedule the first follow-up for this lead.", null, null);

  document.querySelectorAll("[data-fu-act]").forEach(btn => {
    btn.addEventListener("click", () => {
      if (btn.dataset.fuAct === "complete") completeFollowup(btn.dataset.fuId);
      if (btn.dataset.fuAct === "reschedule") openFollowupModal(lead.id, btn.dataset.fuId);
    });
  });
}

function renderActivityTimeline(lead) {
  const items = DB.activities.filter(a => a.message.includes(lead.company) || a.message.includes(lead.name));
  const list = items.length ? items : DB.activities.slice(0, 3);
  document.getElementById("activityTimeline").innerHTML = `<div class="timeline">${list.map(a => `
    <div class="timeline-item">
      <div class="timeline-dot act-${a.type}">${icon(ACTIVITY_ICON_MAP_LOCAL[a.type] || "info")}</div>
      <div class="timeline-content"><div class="timeline-title">${a.message}</div><div class="timeline-time">${timeAgo(a.time)}</div></div>
    </div>`).join("")}</div>`;
}
const ACTIVITY_ICON_MAP_LOCAL = { lead: "leads", followup: "followups", quote: "quotations", invoice: "invoices", payment: "payments", expense: "expenses" };

function renderNotesTab(lead) {
  document.getElementById("notesTab").innerHTML = `
    <div class="field">
      <label>Internal Notes</label>
      <textarea class="textarea" id="notesTextarea" style="min-height:160px;">${escapeHtml(lead.notes || "")}</textarea>
    </div>
    <button class="btn btn-primary btn-sm" id="saveNotesBtn">${icon("check")} Save Notes</button>
  `;
  document.getElementById("saveNotesBtn").addEventListener("click", (e) => {
    lead.notes = document.getElementById("notesTextarea").value;
    saveDB();
    setBtnLoading(e.currentTarget, true);
    setTimeout(() => { setBtnLoading(e.currentTarget, false); showToast("Notes saved successfully.", "success"); }, 400);
  });
}

function renderQuotationsTab(lead) {
  const items = DB.quotations.filter(q => q.leadId === lead.id);
  document.getElementById("quotationsTab").innerHTML = items.length ? `
    <div class="table-scroll"><table class="data-table">
      <thead><tr><th>Quotation #</th><th>Amount</th><th>Date</th><th>Valid Until</th><th>Status</th><th class="cell-actions">Action</th></tr></thead>
      <tbody>${items.map(q => `<tr><td class="cell-primary">${q.id}</td><td>${formatCurrency(q.amount)}</td><td class="cell-muted">${formatDate(q.date)}</td><td class="cell-muted">${formatDate(q.validUntil)}</td><td>${statusBadge(q.status)}</td><td class="cell-actions"><a href="quotations.html?id=${q.id}" class="btn btn-secondary btn-sm">${icon("eye")} View</a></td></tr>`).join("")}</tbody>
    </table></div>` : emptyPanel("No quotations yet", "Create a quotation once this lead is qualified.", `quotations.html?new=1&leadId=${lead.id}`, "Create Quotation");
}

function renderInvoicesTab(lead) {
  const items = DB.invoices.filter(i => i.customer === lead.company);
  document.getElementById("invoicesTab").innerHTML = items.length ? `
    <div class="table-scroll"><table class="data-table">
      <thead><tr><th>Invoice #</th><th>Amount</th><th>Paid</th><th>Due Date</th><th>Status</th><th class="cell-actions">Action</th></tr></thead>
      <tbody>${items.map(i => `<tr><td class="cell-primary">${i.id}</td><td>${formatCurrency(i.amount)}</td><td>${formatCurrency(i.paidAmount)}</td><td class="cell-muted">${formatDate(i.dueDate)}</td><td>${statusBadge(i.status)}</td><td class="cell-actions"><a href="invoices.html?id=${i.id}" class="btn btn-secondary btn-sm">${icon("eye")} View</a></td></tr>`).join("")}</tbody>
    </table></div>` : emptyPanel("No invoices yet", "Invoices created for this customer will appear here.", null, null);
}

function renderPaymentsTab(lead) {
  const items = DB.payments.filter(p => p.customer === lead.company);
  document.getElementById("paymentsTab").innerHTML = items.length ? `
    <div class="table-scroll"><table class="data-table">
      <thead><tr><th>Payment ID</th><th>Amount</th><th>Date</th><th>Method</th><th>Status</th></tr></thead>
      <tbody>${items.map(p => `<tr><td class="cell-primary">${p.id}</td><td>${formatCurrency(p.amount)}</td><td class="cell-muted">${formatDate(p.date)}</td><td>${p.method}</td><td>${statusBadge(p.status === "Completed" ? "Paid" : p.status)}</td></tr>`).join("")}</tbody>
    </table></div>` : emptyPanel("No payments recorded", "Payments received from this customer will appear here.", null, null);
}

function emptyPanel(title, desc, href, cta) {
  return `<div class="empty-state">
    <div class="empty-icon">${icon("info")}</div>
    <h4>${title}</h4><p>${desc}</p>
    ${href ? `<a href="${href}" class="btn btn-primary btn-sm">${cta}</a>` : ""}
  </div>`;
}

function wireActions(lead) {
  document.getElementById("editLeadBtn").onclick = () => openEditLeadModal(lead.id);
  document.getElementById("followupLeadBtn").onclick = () => openFollowupModal(lead.id);
  document.getElementById("quoteLeadBtn").onclick = () => window.location.href = `quotations.html?new=1&leadId=${lead.id}`;
  document.getElementById("convertBtn").onclick = () => convertLead(lead.id);
  document.getElementById("moreActionsBtn").onclick = (e) => { e.stopPropagation(); toggleDropdown("moreActionsPanel"); };
  document.getElementById("moreActionsPanel").addEventListener("click", (e) => {
    const item = e.target.closest("[data-act]");
    if (!item) return;
    if (item.dataset.act === "assign") openAssignModal(lead.id);
    if (item.dataset.act === "lost") markLeadLost(lead.id);
    if (item.dataset.act === "delete") { deleteLead(lead.id); }
  });

  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(btn.dataset.tab).classList.add("active");
    });
  });

  if (!window.__leadDetailsEventsWired) {
    window.__leadDetailsEventsWired = true;
    document.addEventListener("lead:saved", () => renderLeadDetailsPage());
    document.addEventListener("lead:assigned", () => renderLeadDetailsPage());
    document.addEventListener("lead:converted", () => renderLeadDetailsPage());
    document.addEventListener("lead:deleted", () => window.location.href = "leads.html");
    document.addEventListener("followup:saved", () => renderFollowupTimeline(getLeadById(CURRENT_LEAD_ID)));
  }
}

document.addEventListener("layout:ready", renderLeadDetailsPage);
