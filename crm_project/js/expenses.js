/* ==========================================================================
   Expenses page
   ========================================================================== */

let expensesTable;

function renderExpensesPage() {
  renderExpenseSummary();
  document.getElementById("expenseCategoryFilter").innerHTML = `<option value="">All Categories</option>` + DB.settings.expenseCategories.map(c => `<option>${c}</option>`).join("");
  expensesTable = createTableController({
    data: DB.expenses, pageSize: 8,
    mountBodyId: "expensesTableBody", mountPaginationId: "expensesPagination", mountCountId: "expensesCount",
    filterFn: buildExpenseFilter(), renderRow: renderExpenseRow,
  });
  expensesTable.render();
  document.getElementById("addExpenseBtn").addEventListener("click", () => openExpenseModal());
  ["expenseSearchInput", "expenseCategoryFilter"].forEach(id => document.getElementById(id).addEventListener(id === "expenseSearchInput" ? "input" : "change", debounce(refreshExpenses, 150)));
  injectExpenseModal();
  document.addEventListener("expense:saved", () => { renderExpenseSummary(); refreshExpenses(); });
}

function renderExpenseSummary() {
  const total = DB.expenses.reduce((s, e) => s + e.amount, 0);
  const thisMonthTotal = DB.expenses.filter(e => e.date.startsWith("2026-09")).reduce((s, e) => s + e.amount, 0);
  const topCategory = Object.entries(DB.expenses.reduce((acc, e) => { acc[e.category] = (acc[e.category] || 0) + e.amount; return acc; }, {})).sort((a, b) => b[1] - a[1])[0];
  document.getElementById("expenseSummary").innerHTML = `
    <div class="kpi-card" style="cursor:default;"><div class="kpi-card-top"><div class="kpi-icon" style="background:var(--danger-soft);color:var(--danger);">${icon("expenses")}</div></div><div class="kpi-value">${formatCurrency(total)}</div><div class="kpi-label">Total Expenses</div></div>
    <div class="kpi-card" style="cursor:default;"><div class="kpi-card-top"><div class="kpi-icon" style="background:var(--warning-soft);color:var(--warning);">${icon("clock")}</div></div><div class="kpi-value">${formatCurrency(thisMonthTotal)}</div><div class="kpi-label">This Month</div></div>
    <div class="kpi-card" style="cursor:default;"><div class="kpi-card-top"><div class="kpi-icon" style="background:var(--info-soft);color:var(--info);">${icon("tag")}</div></div><div class="kpi-value">${topCategory ? topCategory[0] : "—"}</div><div class="kpi-label">Top Category</div></div>`;
}

function buildExpenseFilter() {
  const term = document.getElementById("expenseSearchInput").value.trim().toLowerCase();
  const category = document.getElementById("expenseCategoryFilter").value;
  return (e) => {
    if (term && !(e.title.toLowerCase().includes(term) || e.id.toLowerCase().includes(term))) return false;
    if (category && e.category !== category) return false;
    return true;
  };
}
function refreshExpenses() { expensesTable.data = DB.expenses; expensesTable.refresh(buildExpenseFilter()); }

function renderExpenseRow(e) {
  return `<tr>
    <td class="cell-primary">${e.title}</td>
    <td><span class="badge badge-neutral">${e.category}</span></td>
    <td>${formatCurrency(e.amount)}</td>
    <td class="cell-muted">${formatDate(e.date)}</td>
    <td class="cell-muted">${e.method}</td>
    <td class="cell-muted" style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${e.description || "—"}</td>
    <td class="cell-actions">
      <div class="dropdown" style="display:inline-block;">
        <button class="row-menu-btn">${icon("more")}</button>
        <div class="row-menu-panel">
          <div class="dropdown-item" data-exp-act="edit" data-exp-id="${e.id}">${icon("edit")} Edit</div>
          <div class="dropdown-item danger" data-exp-act="delete" data-exp-id="${e.id}">${icon("trash")} Delete</div>
        </div>
      </div>
    </td>
  </tr>`;
}

document.addEventListener("click", (e) => {
  const item = e.target.closest("[data-exp-act]");
  if (!item) return;
  const id = item.dataset.expId, act = item.dataset.expAct;
  if (act === "edit") openExpenseModal(id);
  if (act === "delete") confirmAction({ title: "Delete Expense", message: "Are you sure you want to delete this expense? This action cannot be undone.", onConfirm: () => {
    const idx = DB.expenses.findIndex(x => x.id === id);
    if (idx > -1) DB.expenses.splice(idx, 1);
    saveDB(); showToast("Expense deleted successfully.", "success"); document.dispatchEvent(new CustomEvent("expense:saved"));
  }});
});

function injectExpenseModal() {
  if (document.getElementById("expenseModal")) return;
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.id = "expenseModal";
  backdrop.innerHTML = `<div class="modal">
    <div class="modal-header"><h3 id="expenseModalTitle">Add Expense</h3><button class="modal-close" data-close-modal>${icon("x")}</button></div>
    <div class="modal-body">
      <input type="hidden" id="expenseIdInput">
      <div class="form-grid">
        <div class="field span-2" id="ef_title"><label>Expense Title <span class="required">*</span></label><input class="input" id="expenseTitle"><div class="error-msg">Title is required.</div></div>
        <div class="field"><label>Category</label><select class="select-field2" id="expenseCategory">${DB.settings.expenseCategories.map(c => `<option>${c}</option>`).join("")}</select></div>
        <div class="field" id="ef_amount"><label>Amount (₹) <span class="required">*</span></label><input class="input" type="number" min="0" id="expenseAmount"><div class="error-msg">Enter a valid amount.</div></div>
        <div class="field"><label>Date</label><input class="input" type="date" id="expenseDate"></div>
        <div class="field"><label>Payment Method</label><select class="select-field2" id="expenseMethod">${PAYMENT_METHODS.map(m => `<option>${m}</option>`).join("")}</select></div>
        <div class="field span-2"><label>Description <span class="optional">(optional)</span></label><textarea class="textarea" id="expenseDescription"></textarea></div>
        <div class="field span-2"><label>Attachment <span class="optional">(optional)</span></label>
          <div class="upload-box" data-icon="paperclip"><div class="upload-title">Click to attach a receipt</div><div class="upload-sub">Uploads are simulated in this prototype.</div></div>
        </div>
      </div>
    </div>
    <div class="modal-footer"><button class="btn btn-secondary" data-close-modal>Cancel</button><button class="btn btn-primary" id="expenseSaveBtn"><span class="btn-label">Save Expense</span></button></div>
  </div>`;
  document.body.appendChild(backdrop);
  decorateIconButtons(backdrop);
  backdrop.querySelector(".upload-box").addEventListener("click", () => showToast("File attached (simulated).", "info"));
  document.getElementById("expenseSaveBtn").addEventListener("click", () => {
    let valid = true;
    document.getElementById("ef_title").classList.toggle("has-error", !document.getElementById("expenseTitle").value.trim());
    if (!document.getElementById("expenseTitle").value.trim()) valid = false;
    const amt = Number(document.getElementById("expenseAmount").value);
    document.getElementById("ef_amount").classList.toggle("has-error", !(amt > 0));
    if (!(amt > 0)) valid = false;
    if (!valid) return;
    const btn = document.getElementById("expenseSaveBtn");
    setBtnLoading(btn, true);
    setTimeout(() => {
      const id = document.getElementById("expenseIdInput").value;
      const payload = { title: document.getElementById("expenseTitle").value.trim(), category: document.getElementById("expenseCategory").value, amount: amt, date: document.getElementById("expenseDate").value, method: document.getElementById("expenseMethod").value, description: document.getElementById("expenseDescription").value.trim() };
      if (id) { Object.assign(DB.expenses.find(x => x.id === id), payload); showToast("Expense updated successfully.", "success"); }
      else {
        DB.expenses.unshift({ id: nextId("EXP", DB.expenses), ...payload });
        DB.activities.unshift({ id: "AC-" + Date.now(), type: "expense", message: `Expense <b>${escapeHtml(payload.title)}</b> of ${formatCurrency(amt)} recorded`, time: new Date().toISOString() });
        showToast("Expense added successfully.", "success");
      }
      saveDB();
      setBtnLoading(btn, false);
      closeModal("expenseModal");
      document.dispatchEvent(new CustomEvent("expense:saved"));
    }, 500);
  });
}
function openExpenseModal(id) {
  injectExpenseModal();
  document.querySelectorAll("#expenseModal .field").forEach(f => f.classList.remove("has-error"));
  document.getElementById("expenseIdInput").value = id || "";
  if (id) {
    const e = DB.expenses.find(x => x.id === id);
    document.getElementById("expenseModalTitle").textContent = "Edit Expense";
    document.getElementById("expenseTitle").value = e.title;
    document.getElementById("expenseCategory").value = e.category;
    document.getElementById("expenseAmount").value = e.amount;
    document.getElementById("expenseDate").value = e.date;
    document.getElementById("expenseMethod").value = e.method;
    document.getElementById("expenseDescription").value = e.description || "";
  } else {
    document.getElementById("expenseModalTitle").textContent = "Add Expense";
    document.getElementById("expenseTitle").value = "";
    document.getElementById("expenseCategory").value = DB.settings.expenseCategories[0];
    document.getElementById("expenseAmount").value = "";
    document.getElementById("expenseDate").value = "2026-09-10";
    document.getElementById("expenseMethod").value = "Bank Transfer";
    document.getElementById("expenseDescription").value = "";
  }
  openModal("expenseModal");
}

document.addEventListener("layout:ready", renderExpensesPage);
