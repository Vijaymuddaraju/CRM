/* ==========================================================================
   Settings (Admin only) — General, CRM Settings, Notifications, Appearance
   ========================================================================== */

function renderSettingsPage() {
  wireTabs();
  renderGeneralTab();
  renderCrmSettingsTab();
  renderNotificationsTab();
  renderAppearanceTab();
}

function wireTabs() {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(btn.dataset.tab).classList.add("active");
    });
  });
}

function renderGeneralTab() {
  const g = DB.settings.general;
  document.getElementById("generalTab").innerHTML = `
    <div class="form-grid">
      <div class="field"><label>Company Name</label><input class="input" id="gCompanyName" value="${escapeHtml(g.companyName)}"></div>
      <div class="field"><label>Company Email</label><input class="input" type="email" id="gCompanyEmail" value="${escapeHtml(g.companyEmail)}"></div>
      <div class="field"><label>Phone</label><input class="input" id="gPhone" value="${escapeHtml(g.phone)}"></div>
      <div class="field"><label>Logo Initial</label><input class="input" id="gLogoInitial" maxlength="2" value="${escapeHtml(g.logoInitial)}"></div>
      <div class="field"><label>GST Number</label><input class="input" id="gGst" value="${escapeHtml(g.gst || "")}"></div>
      <div class="field"><label>Contact Person / Department</label><input class="input" id="gContactPerson" value="${escapeHtml(g.contactPerson || "")}"></div>
      <div class="field"><label>State Code</label><input class="input" id="gStateCode" value="${escapeHtml(g.stateCode || "")}"></div>
      <div class="field"><label>Website</label><input class="input" id="gWebsite" value="${escapeHtml(g.website || "")}"></div>
      <div class="field span-2"><label>Address</label><textarea class="textarea" id="gAddress">${escapeHtml(g.address)}</textarea></div>
    </div>
    <div class="section-title mt-4 mb-2">Bank Details (used on printed Invoices)</div>
    <div class="form-grid">
      <div class="field"><label>Account Holder Name</label><input class="input" id="gBankAccountHolder" value="${escapeHtml(g.bankAccountHolder || "")}"></div>
      <div class="field"><label>Bank Name</label><input class="input" id="gBankName" value="${escapeHtml(g.bankName || "")}"></div>
      <div class="field"><label>Account Type</label><input class="input" id="gBankAccountType" value="${escapeHtml(g.bankAccountType || "")}"></div>
      <div class="field"><label>Account Number</label><input class="input" id="gBankAccountNo" value="${escapeHtml(g.bankAccountNo || "")}"></div>
      <div class="field"><label>IFSC Code</label><input class="input" id="gBankIFSC" value="${escapeHtml(g.bankIFSC || "")}"></div>
      <div class="field"><label>Branch</label><input class="input" id="gBankBranch" value="${escapeHtml(g.bankBranch || "")}"></div>
    </div>
    <button class="btn btn-primary btn-sm mt-2" id="saveGeneralBtn"><span class="btn-label">Save Changes</span></button>`;
  document.getElementById("saveGeneralBtn").addEventListener("click", () => {
    Object.assign(DB.settings.general, {
      companyName: document.getElementById("gCompanyName").value.trim(),
      companyEmail: document.getElementById("gCompanyEmail").value.trim(),
      phone: document.getElementById("gPhone").value.trim(),
      logoInitial: document.getElementById("gLogoInitial").value.trim().toUpperCase() || "DM",
      gst: document.getElementById("gGst").value.trim(),
      contactPerson: document.getElementById("gContactPerson").value.trim(),
      stateCode: document.getElementById("gStateCode").value.trim(),
      website: document.getElementById("gWebsite").value.trim(),
      address: document.getElementById("gAddress").value.trim(),
      bankAccountHolder: document.getElementById("gBankAccountHolder").value.trim(),
      bankName: document.getElementById("gBankName").value.trim(),
      bankAccountType: document.getElementById("gBankAccountType").value.trim(),
      bankAccountNo: document.getElementById("gBankAccountNo").value.trim(),
      bankIFSC: document.getElementById("gBankIFSC").value.trim(),
      bankBranch: document.getElementById("gBankBranch").value.trim(),
    });
    saveDB();
    showToast("General settings saved successfully.", "success");
  });
}

function renderCrmSettingsTab() {
  document.getElementById("crmSettingsTab").innerHTML = `
    <div class="grid-2-even">
      <div>${tagEditorHtml("Lead Statuses", "leadStatuses")}</div>
      <div>${tagEditorHtml("Follow-up Types", "followupTypes")}</div>
      <div>${tagEditorHtml("Expense Categories", "expenseCategories")}</div>
    </div>
    <div class="field mt-4">
      <label>Lead Types</label>
      <div class="text-faint fs-sm mb-2">Fixed at capture time — Old Customer Reorder, Cold Call / Website / Other, Referral Lead.</div>
      <div class="flex flex-wrap gap-2">${LEAD_TYPES.map(t => `<span class="badge badge-neutral" style="padding:6px 10px;">${t}</span>`).join("")}</div>
    </div>`;
  ["leadStatuses", "followupTypes", "expenseCategories"].forEach(wireTagEditor);
}

function tagEditorHtml(label, settingsKey) {
  return `
    <div class="field">
      <label>${label}</label>
      <div class="flex flex-wrap gap-2 mb-2" id="tags_${settingsKey}"></div>
      <div class="flex gap-2">
        <input class="input" id="tagInput_${settingsKey}" placeholder="Add new ${label.toLowerCase().slice(0, -1)}...">
        <button class="btn btn-secondary" data-add-tag="${settingsKey}">${icon("plus")}</button>
      </div>
    </div>`;
}

function wireTagEditor(key) {
  renderTags(key);
  document.querySelector(`[data-add-tag="${key}"]`).addEventListener("click", () => {
    const input = document.getElementById(`tagInput_${key}`);
    const val = input.value.trim();
    if (!val) return;
    if (DB.settings[key].includes(val)) { showToast("This value already exists.", "warning"); return; }
    DB.settings[key].push(val);
    saveDB();
    input.value = "";
    renderTags(key);
    showToast("Added successfully.", "success");
  });
}

function renderTags(key) {
  const wrap = document.getElementById(`tags_${key}`);
  wrap.innerHTML = DB.settings[key].map((val, i) => `
    <span class="badge badge-neutral" style="padding:6px 10px;gap:8px;">
      ${escapeHtml(val)}
      <button data-remove-tag="${key}" data-idx="${i}" style="background:none;border:none;cursor:pointer;color:var(--text-faint);display:flex;">${icon("x")}</button>
    </span>`).join("") || `<span class="text-faint fs-sm">None added yet.</span>`;
  wrap.querySelectorAll("[data-remove-tag]").forEach(btn => {
    btn.addEventListener("click", () => {
      DB.settings[key].splice(Number(btn.dataset.idx), 1);
      saveDB();
      renderTags(key);
    });
  });
}

function renderNotificationsTab() {
  const n = DB.settings.notifications;
  document.getElementById("notifSettingsTab").innerHTML = `
    <div class="switch-row"><div><div class="switch-row-label">Email Notifications</div><div class="switch-row-desc">Send system notifications to team members via email.</div></div><label class="switch"><input type="checkbox" id="setEmailNotif" ${n.email ? "checked" : ""}><span class="slider"></span></label></div>
    <div class="switch-row"><div><div class="switch-row-label">Follow-up Reminders</div><div class="switch-row-desc">Remind salespeople before scheduled follow-ups.</div></div><label class="switch"><input type="checkbox" id="setFollowupReminders" ${n.followupReminders ? "checked" : ""}><span class="slider"></span></label></div>
    <div class="switch-row"><div><div class="switch-row-label">Payment Reminders</div><div class="switch-row-desc">Alert the team about pending and overdue payments.</div></div><label class="switch"><input type="checkbox" id="setPaymentReminders" ${n.paymentReminders ? "checked" : ""}><span class="slider"></span></label></div>`;
  [["setEmailNotif", "email"], ["setFollowupReminders", "followupReminders"], ["setPaymentReminders", "paymentReminders"]].forEach(([id, key]) => {
    document.getElementById(id).addEventListener("change", (e) => { n[key] = e.target.checked; saveDB(); showToast("Notification settings updated.", "success"); });
  });
}

function renderAppearanceTab() {
  const currentTheme = localStorage.getItem("crm_theme") || "light";
  document.getElementById("appearanceTab").innerHTML = `
    <div class="field">
      <label>Theme</label>
      <div class="flex gap-3 mt-1">
        <div class="radio-row"><input type="radio" name="themeRadio" value="light" ${currentTheme === "light" ? "checked" : ""}><span>Light Mode</span></div>
        <div class="radio-row"><input type="radio" name="themeRadio" value="dark" ${currentTheme === "dark" ? "checked" : ""}><span>Dark Mode</span></div>
      </div>
    </div>
    <div class="field">
      <label>Sidebar Behavior</label>
      <select class="select-field2" id="sidebarBehaviorSelect" style="max-width:260px;">
        <option value="expanded" ${DB.settings.appearance.sidebarBehavior === "expanded" ? "selected" : ""}>Expanded by default</option>
        <option value="collapsed" ${DB.settings.appearance.sidebarBehavior === "collapsed" ? "selected" : ""}>Collapsed by default</option>
      </select>
    </div>`;
  document.querySelectorAll('input[name="themeRadio"]').forEach(radio => {
    radio.addEventListener("change", (e) => {
      document.documentElement.setAttribute("data-theme", e.target.value);
      localStorage.setItem("crm_theme", e.target.value);
      DB.settings.appearance.theme = e.target.value;
      saveDB();
    });
  });
  document.getElementById("sidebarBehaviorSelect").addEventListener("change", (e) => {
    DB.settings.appearance.sidebarBehavior = e.target.value;
    localStorage.setItem("crm_sidebar_collapsed", e.target.value === "collapsed" ? "1" : "0");
    document.getElementById("appShell").classList.toggle("collapsed", e.target.value === "collapsed");
    saveDB();
    showToast("Appearance settings updated.", "success");
  });
}

document.addEventListener("layout:ready", renderSettingsPage);
