/* ==========================================================================
   Shared modal components used across Leads, Lead Details, Follow-ups and
   Calendar pages: Add/Edit Lead, Assign Lead, Add/Edit Follow-up, Convert,
   Delete. Each action dispatches a document-level custom event so any page
   can refresh its own view without tight coupling.
   ========================================================================== */

/* ---------------------------- LEAD MODAL ---------------------------- */

function injectLeadModal() {
  if (document.getElementById("leadModal")) return;
  const salesUsers = DB.users.filter(u => u.role === "sales" && u.status === "active");
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.id = "leadModal";
  backdrop.innerHTML = `
    <div class="modal modal-lg">
      <div class="modal-header">
        <h3 id="leadModalTitle">Add Lead</h3>
        <button class="modal-close" data-close-modal>${icon("x")}</button>
      </div>
      <div class="modal-body">
        <form id="leadForm" novalidate>
          <input type="hidden" id="leadIdInput">
          <div class="form-grid">
            <div class="field" id="f_name"><label>Full Name <span class="required">*</span></label><input class="input" id="leadName" placeholder="e.g. Rohit Agarwal"><div class="error-msg">Full name is required.</div></div>
            <div class="field" id="f_company"><label>Company <span class="required">*</span></label><input class="input" id="leadCompany" placeholder="e.g. Agarwal Textiles Pvt Ltd"><div class="error-msg">Company name is required.</div></div>
            <div class="field" id="f_phone"><label>Phone <span class="required">*</span></label><input class="input" id="leadPhone" placeholder="+91 98765 43210"><div class="error-msg">A valid phone number is required.</div></div>
            <div class="field" id="f_altphone"><label>Alternate Phone <span class="optional">(optional)</span></label><input class="input" id="leadAltPhone" placeholder="+91 98765 43210"></div>
            <div class="field" id="f_email"><label>Email <span class="required">*</span></label><input class="input" type="email" id="leadEmail" placeholder="name@company.com"><div class="error-msg">A valid email is required.</div></div>
            <div class="field" id="f_source"><label>Lead Source <span class="required">*</span></label>
              <select class="select-field2" id="leadSource">${DB.settings.leadSources.map(s => `<option value="${s}">${s}</option>`).join("")}</select>
            </div>
            <div class="field span-2" id="f_requirement"><label>Requirement <span class="optional">(optional)</span></label><textarea class="textarea" id="leadRequirement" placeholder="Briefly describe what the customer needs..."></textarea></div>
            <div class="field" id="f_status"><label>Lead Status</label>
              <select class="select-field2" id="leadStatus">${DB.settings.leadStatuses.map(s => `<option value="${s}">${s}</option>`).join("")}</select>
            </div>
            <div class="field" id="f_priority"><label>Priority</label>
              <select class="select-field2" id="leadPriority">${PRIORITIES.map(p => `<option value="${p}">${p}</option>`).join("")}</select>
            </div>
            <div class="field" id="f_assigned"><label>Assigned Salesperson</label>
              <select class="select-field2" id="leadAssigned"><option value="">Unassigned</option>${salesUsers.map(u => `<option value="${u.id}">${u.name}</option>`).join("")}</select>
            </div>
            <div class="field" id="f_value"><label>Expected Value (₹) <span class="optional">(optional)</span></label><input class="input" type="number" min="0" id="leadValue" placeholder="e.g. 250000"></div>
            <div class="field" id="f_closing"><label>Expected Closing Date <span class="optional">(optional)</span></label><input class="input" type="date" id="leadClosing"></div>
            <div class="field span-2" id="f_notes"><label>Notes <span class="optional">(optional)</span></label><textarea class="textarea" id="leadNotes" placeholder="Any internal notes about this lead..."></textarea></div>
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" data-close-modal>Cancel</button>
        <button class="btn btn-primary" id="leadSaveBtn"><span class="btn-label">Save Lead</span></button>
      </div>
    </div>`;
  document.body.appendChild(backdrop);
  document.getElementById("leadSaveBtn").addEventListener("click", submitLeadForm);
}

function openAddLeadModal(prefill) {
  injectLeadModal();
  document.getElementById("leadModalTitle").textContent = "Add Lead";
  document.getElementById("leadForm").reset();
  document.getElementById("leadIdInput").value = "";
  document.querySelectorAll("#leadForm .field").forEach(f => f.classList.remove("has-error"));
  if (prefill && prefill.assignedTo) document.getElementById("leadAssigned").value = prefill.assignedTo;
  openModal("leadModal");
}

function openEditLeadModal(leadId) {
  const lead = getLeadById(leadId);
  if (!lead) return;
  injectLeadModal();
  document.getElementById("leadModalTitle").textContent = "Edit Lead";
  document.querySelectorAll("#leadForm .field").forEach(f => f.classList.remove("has-error"));
  document.getElementById("leadIdInput").value = lead.id;
  document.getElementById("leadName").value = lead.name;
  document.getElementById("leadCompany").value = lead.company;
  document.getElementById("leadPhone").value = lead.phone;
  document.getElementById("leadAltPhone").value = lead.altPhone || "";
  document.getElementById("leadEmail").value = lead.email;
  document.getElementById("leadSource").value = lead.source;
  document.getElementById("leadRequirement").value = lead.requirement || "";
  document.getElementById("leadStatus").value = lead.status;
  document.getElementById("leadPriority").value = lead.priority;
  document.getElementById("leadAssigned").value = lead.assignedTo || "";
  document.getElementById("leadValue").value = lead.expectedValue || "";
  document.getElementById("leadClosing").value = lead.expectedClosing || "";
  document.getElementById("leadNotes").value = lead.notes || "";
  openModal("leadModal");
}

function submitLeadForm() {
  const req = { f_name: "leadName", f_company: "leadCompany", f_phone: "leadPhone", f_email: "leadEmail" };
  let valid = true;
  Object.entries(req).forEach(([fieldId, inputId]) => {
    const field = document.getElementById(fieldId);
    const val = document.getElementById(inputId).value.trim();
    let ok = !!val;
    if (inputId === "leadEmail" && ok) ok = /^\S+@\S+\.\S+$/.test(val);
    if (inputId === "leadPhone" && ok) ok = val.replace(/\D/g, "").length >= 10;
    field.classList.toggle("has-error", !ok);
    if (!ok) valid = false;
  });
  if (!valid) return;

  const btn = document.getElementById("leadSaveBtn");
  setBtnLoading(btn, true);
  setTimeout(() => {
    const id = document.getElementById("leadIdInput").value;
    const payload = {
      name: document.getElementById("leadName").value.trim(),
      company: document.getElementById("leadCompany").value.trim(),
      phone: document.getElementById("leadPhone").value.trim(),
      altPhone: document.getElementById("leadAltPhone").value.trim(),
      email: document.getElementById("leadEmail").value.trim(),
      source: document.getElementById("leadSource").value,
      requirement: document.getElementById("leadRequirement").value.trim(),
      status: document.getElementById("leadStatus").value,
      priority: document.getElementById("leadPriority").value,
      assignedTo: document.getElementById("leadAssigned").value,
      expectedValue: Number(document.getElementById("leadValue").value) || 0,
      expectedClosing: document.getElementById("leadClosing").value,
      notes: document.getElementById("leadNotes").value.trim(),
    };
    if (id) {
      Object.assign(getLeadById(id), payload);
      showToast("Lead updated successfully.", "success");
      document.dispatchEvent(new CustomEvent("lead:saved", { detail: { id, mode: "edit" } }));
    } else {
      const newLead = { id: nextId("LD", DB.leads), created: new Date().toISOString().slice(0, 10), lastContact: "", nextFollowup: "", ...payload };
      DB.leads.unshift(newLead);
      DB.activities.unshift({ id: "AC-" + Date.now(), type: "lead", message: `New lead <b>${escapeHtml(newLead.name)}</b> added via ${newLead.source}`, time: new Date().toISOString() });
      if (newLead.assignedTo) {
        DB.notifications.unshift({ id: "NT-" + Date.now(), category: "Leads", type: "info", message: `Lead assigned to ${userName(newLead.assignedTo)}.`, time: new Date().toISOString(), read: false, link: "leads.html" });
      }
      showToast("Lead created successfully.", "success");
      document.dispatchEvent(new CustomEvent("lead:saved", { detail: { id: newLead.id, mode: "add" } }));
    }
    saveDB();
    setBtnLoading(btn, false);
    closeModal("leadModal");
  }, 600);
}

/* ---------------------------- ASSIGN MODAL ---------------------------- */

function injectAssignModal() {
  if (document.getElementById("assignModal")) return;
  const salesUsers = DB.users.filter(u => u.role === "sales" && u.status === "active");
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.id = "assignModal";
  backdrop.innerHTML = `
    <div class="modal modal-sm">
      <div class="modal-header"><h3>Assign Lead</h3><button class="modal-close" data-close-modal>${icon("x")}</button></div>
      <div class="modal-body">
        <input type="hidden" id="assignLeadId">
        <p class="fs-sm text-muted mb-4" id="assignLeadLabel"></p>
        <div class="field">
          <label>Salesperson <span class="required">*</span></label>
          <select class="select-field2" id="assignSalesperson">${salesUsers.map(u => `<option value="${u.id}">${u.name}</option>`).join("")}</select>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" data-close-modal>Cancel</button>
        <button class="btn btn-primary" id="assignSaveBtn"><span class="btn-label">Assign Lead</span></button>
      </div>
    </div>`;
  document.body.appendChild(backdrop);
  document.getElementById("assignSaveBtn").addEventListener("click", () => {
    const leadId = document.getElementById("assignLeadId").value;
    const lead = getLeadById(leadId);
    if (!lead) return;
    const btn = document.getElementById("assignSaveBtn");
    setBtnLoading(btn, true);
    setTimeout(() => {
      lead.assignedTo = document.getElementById("assignSalesperson").value;
      DB.notifications.unshift({ id: "NT-" + Date.now(), category: "Leads", type: "info", message: `Lead assigned to ${userName(lead.assignedTo)}.`, time: new Date().toISOString(), read: false, link: "leads.html" });
      saveDB();
      setBtnLoading(btn, false);
      closeModal("assignModal");
      showToast(`Lead assigned to ${userName(lead.assignedTo)}.`, "info");
      document.dispatchEvent(new CustomEvent("lead:assigned", { detail: { id: leadId } }));
    }, 500);
  });
}

function openAssignModal(leadId) {
  const lead = getLeadById(leadId);
  if (!lead) return;
  injectAssignModal();
  document.getElementById("assignLeadId").value = leadId;
  document.getElementById("assignLeadLabel").textContent = `${lead.company} — ${lead.name}`;
  document.getElementById("assignSalesperson").value = lead.assignedTo || "";
  openModal("assignModal");
}

/* ---------------------------- FOLLOW-UP MODAL ---------------------------- */

function injectFollowupModal() {
  if (document.getElementById("followupModal")) return;
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.id = "followupModal";
  backdrop.innerHTML = `
    <div class="modal">
      <div class="modal-header"><h3 id="followupModalTitle">Add Follow-up</h3><button class="modal-close" data-close-modal>${icon("x")}</button></div>
      <div class="modal-body">
        <input type="hidden" id="followupIdInput">
        <p class="fs-sm text-muted mb-4" id="followupLeadLabel"></p>
        <div class="form-grid">
          <div class="field" id="ff_lead"><label>Lead <span class="required">*</span></label>
            <select class="select-field2" id="followupLead">${DB.leads.map(l => `<option value="${l.id}">${l.company} — ${l.name}</option>`).join("")}</select>
          </div>
          <div class="field" id="ff_type"><label>Follow-up Type</label>
            <select class="select-field2" id="followupType">${DB.settings.followupTypes.map(t => `<option value="${t}">${t}</option>`).join("")}</select>
          </div>
          <div class="field" id="ff_date"><label>Date <span class="required">*</span></label><input class="input" type="date" id="followupDate"><div class="error-msg">Please pick a date.</div></div>
          <div class="field" id="ff_time"><label>Time <span class="required">*</span></label><input class="input" type="time" id="followupTime"><div class="error-msg">Please pick a time.</div></div>
          <div class="field span-2" id="ff_notes"><label>Notes <span class="optional">(optional)</span></label><textarea class="textarea" id="followupNotes" placeholder="What needs to be discussed?"></textarea></div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" data-close-modal>Cancel</button>
        <button class="btn btn-primary" id="followupSaveBtn"><span class="btn-label">Save Follow-up</span></button>
      </div>
    </div>`;
  document.body.appendChild(backdrop);
  document.getElementById("followupSaveBtn").addEventListener("click", submitFollowupForm);
}

function openFollowupModal(leadId, followupId) {
  injectFollowupModal();
  document.querySelectorAll("#followupModal .field").forEach(f => f.classList.remove("has-error"));
  const leadSelect = document.getElementById("followupLead");
  const idInput = document.getElementById("followupIdInput");
  if (followupId) {
    const fu = DB.followups.find(f => f.id === followupId);
    document.getElementById("followupModalTitle").textContent = "Edit Follow-up";
    idInput.value = followupId;
    leadSelect.value = fu.leadId;
    document.getElementById("followupType").value = fu.type;
    document.getElementById("followupDate").value = fu.date;
    document.getElementById("followupTime").value = fu.time;
    document.getElementById("followupNotes").value = fu.notes || "";
  } else {
    document.getElementById("followupModalTitle").textContent = "Add Follow-up";
    idInput.value = "";
    if (leadId) leadSelect.value = leadId;
    document.getElementById("followupType").value = "Phone Call";
    document.getElementById("followupDate").value = "2026-09-10";
    document.getElementById("followupTime").value = "10:00";
    document.getElementById("followupNotes").value = "";
  }
  const lead = getLeadById(leadSelect.value);
  document.getElementById("followupLeadLabel").textContent = lead ? `${lead.company} — ${lead.name}` : "";
  leadSelect.disabled = !!leadId;
  openModal("followupModal");
}

function submitFollowupForm() {
  let valid = true;
  ["ff_date", "ff_time"].forEach(fid => {
    const inputId = fid === "ff_date" ? "followupDate" : "followupTime";
    const field = document.getElementById(fid);
    const ok = !!document.getElementById(inputId).value;
    field.classList.toggle("has-error", !ok);
    if (!ok) valid = false;
  });
  if (!valid) return;

  const btn = document.getElementById("followupSaveBtn");
  setBtnLoading(btn, true);
  setTimeout(() => {
    const id = document.getElementById("followupIdInput").value;
    const leadId = document.getElementById("followupLead").value;
    const lead = getLeadById(leadId);
    const payload = {
      leadId,
      type: document.getElementById("followupType").value,
      date: document.getElementById("followupDate").value,
      time: document.getElementById("followupTime").value,
      notes: document.getElementById("followupNotes").value.trim(),
    };
    if (id) {
      Object.assign(DB.followups.find(f => f.id === id), payload);
      showToast("Follow-up updated successfully.", "success");
    } else {
      const salesperson = lead ? lead.assignedTo : (getCurrentUser() || {}).id;
      DB.followups.unshift({ id: nextId("FU", DB.followups), salesperson, status: "Pending", ...payload });
      if (lead) lead.nextFollowup = payload.date;
      DB.calendarEvents.unshift({ id: "EV-" + Date.now(), title: `${payload.type}: ${lead ? lead.company : leadId}`, type: "Follow-up", date: payload.date, time: payload.time, assignedTo: salesperson, relatedId: leadId });
      showToast("Follow-up scheduled successfully.", "success");
    }
    saveDB();
    setBtnLoading(btn, false);
    closeModal("followupModal");
    document.dispatchEvent(new CustomEvent("followup:saved", { detail: { leadId } }));
  }, 500);
}

function completeFollowup(followupId) {
  const fu = DB.followups.find(f => f.id === followupId);
  if (!fu) return;
  fu.status = "Completed";
  const lead = getLeadById(fu.leadId);
  DB.activities.unshift({ id: "AC-" + Date.now(), type: "followup", message: `<b>${userName(fu.salesperson)}</b> completed follow-up with ${lead ? escapeHtml(lead.company) : fu.leadId}`, time: new Date().toISOString() });
  saveDB();
  showToast("Follow-up marked as completed.", "success");
  document.dispatchEvent(new CustomEvent("followup:saved", { detail: { leadId: fu.leadId } }));
}

function deleteFollowup(followupId) {
  confirmAction({
    title: "Delete Follow-up",
    message: "Are you sure you want to delete this follow-up? This action cannot be undone.",
    confirmLabel: "Delete",
    onConfirm: () => {
      const idx = DB.followups.findIndex(f => f.id === followupId);
      if (idx > -1) DB.followups.splice(idx, 1);
      saveDB();
      showToast("Follow-up deleted.", "success");
      document.dispatchEvent(new CustomEvent("followup:saved", {}));
    }
  });
}

/* ---------------------------- CONVERT / DELETE LEAD ---------------------------- */

function convertLead(leadId) {
  const lead = getLeadById(leadId);
  if (!lead) return;
  confirmAction({
    title: "Convert Lead",
    message: `Mark "${lead.company}" as Converted? This indicates the deal has been won.`,
    confirmLabel: "Convert Lead",
    danger: false,
    onConfirm: () => {
      lead.status = "Converted";
      saveDB();
      showToast("Lead converted successfully.", "success");
      document.dispatchEvent(new CustomEvent("lead:converted", { detail: { id: leadId } }));
    }
  });
}

function markLeadLost(leadId) {
  const lead = getLeadById(leadId);
  if (!lead) return;
  confirmAction({
    title: "Mark Lead as Lost",
    message: `Mark "${lead.company}" as Lost? You can still view this lead but it will be excluded from active pipeline reports.`,
    confirmLabel: "Mark as Lost",
    onConfirm: () => {
      lead.status = "Lost";
      saveDB();
      showToast("Lead marked as lost.", "warning");
      document.dispatchEvent(new CustomEvent("lead:converted", { detail: { id: leadId } }));
    }
  });
}

function deleteLead(leadId) {
  const lead = getLeadById(leadId);
  if (!lead) return;
  confirmAction({
    title: "Delete Lead",
    message: `Are you sure you want to delete "${lead.company}"? This action cannot be undone.`,
    confirmLabel: "Delete",
    onConfirm: () => {
      const idx = DB.leads.findIndex(l => l.id === leadId);
      if (idx > -1) DB.leads.splice(idx, 1);
      saveDB();
      showToast("Lead deleted successfully.", "success");
      document.dispatchEvent(new CustomEvent("lead:deleted", { detail: { id: leadId } }));
    }
  });
}

/* ---------------------------- PAYMENT MODAL ---------------------------- */

function injectPaymentModal() {
  if (document.getElementById("paymentModal")) return;
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.id = "paymentModal";
  backdrop.innerHTML = `
    <div class="modal">
      <div class="modal-header"><h3 id="paymentModalTitle">Record Payment</h3><button class="modal-close" data-close-modal>${icon("x")}</button></div>
      <div class="modal-body">
        <div class="form-grid">
          <div class="field" id="pf_customer"><label>Customer <span class="required">*</span></label><input class="input" id="paymentCustomer" placeholder="Customer name"></div>
          <div class="field" id="pf_invoice"><label>Invoice <span class="optional">(optional)</span></label>
            <select class="select-field2" id="paymentInvoice"><option value="">Not linked to an invoice</option>${DB.invoices.map(i => `<option value="${i.id}">${i.id} — ${i.customer}</option>`).join("")}</select>
          </div>
          <div class="field" id="pf_amount"><label>Amount (₹) <span class="required">*</span></label><input class="input" type="number" min="0" id="paymentAmount"><div class="error-msg">Please enter a valid amount.</div></div>
          <div class="field" id="pf_date"><label>Payment Date <span class="required">*</span></label><input class="input" type="date" id="paymentDate"></div>
          <div class="field" id="pf_method"><label>Payment Method</label>
            <select class="select-field2" id="paymentMethod">${PAYMENT_METHODS.map(m => `<option>${m}</option>`).join("")}</select>
          </div>
          <div class="field" id="pf_ref"><label>Reference Number <span class="optional">(optional)</span></label><input class="input" id="paymentReference" placeholder="e.g. NEFT1234567"></div>
          <div class="field span-2" id="pf_notes"><label>Notes <span class="optional">(optional)</span></label><textarea class="textarea" id="paymentNotes"></textarea></div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" data-close-modal>Cancel</button>
        <button class="btn btn-primary" id="paymentSaveBtn"><span class="btn-label">Record Payment</span></button>
      </div>
    </div>`;
  document.body.appendChild(backdrop);

  document.getElementById("paymentInvoice").addEventListener("change", (e) => {
    const inv = DB.invoices.find(i => i.id === e.target.value);
    if (inv) {
      document.getElementById("paymentCustomer").value = inv.customer;
      document.getElementById("paymentAmount").value = inv.amount - inv.paidAmount;
    }
  });

  document.getElementById("paymentSaveBtn").addEventListener("click", () => {
    let valid = true;
    const custField = document.getElementById("pf_customer");
    custField.classList.toggle("has-error", !document.getElementById("paymentCustomer").value.trim());
    if (!document.getElementById("paymentCustomer").value.trim()) valid = false;
    const amtField = document.getElementById("pf_amount");
    const amt = Number(document.getElementById("paymentAmount").value);
    amtField.classList.toggle("has-error", !(amt > 0));
    if (!(amt > 0)) valid = false;
    const dateField = document.getElementById("pf_date");
    dateField.classList.toggle("has-error", !document.getElementById("paymentDate").value);
    if (!document.getElementById("paymentDate").value) valid = false;
    if (!valid) return;

    const btn = document.getElementById("paymentSaveBtn");
    setBtnLoading(btn, true);
    setTimeout(() => {
      const invoiceId = document.getElementById("paymentInvoice").value;
      const customer = document.getElementById("paymentCustomer").value.trim();
      const payment = {
        id: nextId("PAY", DB.payments),
        customer, invoiceId, amount: amt,
        date: document.getElementById("paymentDate").value,
        method: document.getElementById("paymentMethod").value,
        reference: document.getElementById("paymentReference").value.trim(),
        status: "Completed",
        notes: document.getElementById("paymentNotes").value.trim(),
      };
      DB.payments.unshift(payment);
      DB.income.unshift({ id: nextId("INC", DB.income), title: `${customer} Payment`, source: "Client Payment", amount: amt, date: payment.date, reference: invoiceId || payment.id, description: `Payment recorded via ${payment.method}.` });
      if (invoiceId) {
        const inv = DB.invoices.find(i => i.id === invoiceId);
        inv.paidAmount = Math.min(inv.amount, inv.paidAmount + amt);
        inv.status = inv.paidAmount >= inv.amount ? "Paid" : "Partially Paid";
      }
      DB.activities.unshift({ id: "AC-" + Date.now(), type: "payment", message: `Payment of <b>${formatCurrency(amt)}</b> received from ${escapeHtml(customer)}`, time: new Date().toISOString() });
      saveDB();
      setBtnLoading(btn, false);
      closeModal("paymentModal");
      showToast("Payment recorded successfully.", "success");
      document.dispatchEvent(new CustomEvent("payment:saved", { detail: { invoiceId } }));
    }, 600);
  });
}

function openPaymentModal(invoiceId) {
  injectPaymentModal();
  document.querySelectorAll("#paymentModal .field").forEach(f => f.classList.remove("has-error"));
  document.getElementById("paymentInvoice").innerHTML = `<option value="">Not linked to an invoice</option>` + DB.invoices.map(i => `<option value="${i.id}">${i.id} — ${i.customer}</option>`).join("");
  document.getElementById("paymentCustomer").value = "";
  document.getElementById("paymentAmount").value = "";
  document.getElementById("paymentDate").value = "2026-09-10";
  document.getElementById("paymentMethod").value = "Bank Transfer";
  document.getElementById("paymentReference").value = "";
  document.getElementById("paymentNotes").value = "";
  if (invoiceId) {
    const inv = DB.invoices.find(i => i.id === invoiceId);
    document.getElementById("paymentInvoice").value = invoiceId;
    document.getElementById("paymentCustomer").value = inv.customer;
    document.getElementById("paymentAmount").value = inv.amount - inv.paidAmount;
  }
  openModal("paymentModal");
}

/* ---------------------------- Generic row-menu behavior ----------------------------
   Uses a single delegated listener so dynamically re-rendered table rows
   (after sort/filter/paginate) never need re-wiring. wireRowMenus() is kept
   as a no-op-compatible call for readability at call sites. */
function wireRowMenus() {}
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".row-menu-btn");
  if (btn) {
    e.stopPropagation();
    const panel = btn.nextElementSibling;
    const wasOpen = panel.classList.contains("open");
    document.querySelectorAll(".row-menu-panel.open").forEach(p => p.classList.remove("open"));
    if (!wasOpen) panel.classList.add("open");
    return;
  }
  if (!e.target.closest(".row-menu-panel")) {
    document.querySelectorAll(".row-menu-panel.open").forEach(p => p.classList.remove("open"));
  }
});
