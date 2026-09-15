/* ==========================================================================
   Income page
   ========================================================================== */

let incomeTable;
const INCOME_SOURCES = ["Client Payment", "Advance Payment", "Consulting", "Other"];

function renderIncomePage() {
  renderIncomeSummary();
  incomeTable = createTableController({
    data: DB.income, pageSize: 8,
    mountBodyId: "incomeTableBody", mountPaginationId: "incomePagination", mountCountId: "incomeCount",
    filterFn: buildIncomeFilter(), renderRow: renderIncomeRow,
  });
  incomeTable.render();
  document.getElementById("addIncomeBtn").addEventListener("click", () => openIncomeModal());
  document.getElementById("incomeSearchInput").addEventListener("input", debounce(refreshIncome, 150));
  injectIncomeModal();
  document.addEventListener("income:saved", () => { renderIncomeSummary(); refreshIncome(); });
}

function renderIncomeSummary() {
  const total = DB.income.reduce((s, i) => s + i.amount, 0);
  const thisMonth = DB.income.filter(i => i.date.startsWith("2026-09")).reduce((s, i) => s + i.amount, 0);
  document.getElementById("incomeSummary").innerHTML = `
    <div class="kpi-card" style="cursor:default;"><div class="kpi-card-top"><div class="kpi-icon" style="background:var(--success-soft);color:var(--success);">${icon("income")}</div></div><div class="kpi-value">${formatCurrency(total)}</div><div class="kpi-label">Total Income</div></div>
    <div class="kpi-card" style="cursor:default;"><div class="kpi-card-top"><div class="kpi-icon" style="background:var(--info-soft);color:var(--info);">${icon("trendUp")}</div></div><div class="kpi-value">${formatCurrency(thisMonth)}</div><div class="kpi-label">This Month</div></div>`;
}

function buildIncomeFilter() {
  const term = document.getElementById("incomeSearchInput").value.trim().toLowerCase();
  return (i) => !term || i.title.toLowerCase().includes(term) || i.id.toLowerCase().includes(term) || i.source.toLowerCase().includes(term);
}
function refreshIncome() { incomeTable.data = DB.income; incomeTable.refresh(buildIncomeFilter()); }

function renderIncomeRow(i) {
  return `<tr>
    <td class="cell-primary">${i.title}</td>
    <td><span class="badge badge-neutral">${i.source}</span></td>
    <td class="text-success">${formatCurrency(i.amount)}</td>
    <td class="cell-muted">${formatDate(i.date)}</td>
    <td class="cell-muted">${i.reference || "—"}</td>
    <td class="cell-muted" style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${i.description || "—"}</td>
    <td class="cell-actions">
      <div class="dropdown" style="display:inline-block;">
        <button class="row-menu-btn">${icon("more")}</button>
        <div class="row-menu-panel">
          <div class="dropdown-item" data-inc-act="edit" data-inc-id="${i.id}">${icon("edit")} Edit</div>
          <div class="dropdown-item danger" data-inc-act="delete" data-inc-id="${i.id}">${icon("trash")} Delete</div>
        </div>
      </div>
    </td>
  </tr>`;
}

document.addEventListener("click", (e) => {
  const item = e.target.closest("[data-inc-act]");
  if (!item) return;
  const id = item.dataset.incId, act = item.dataset.incAct;
  if (act === "edit") openIncomeModal(id);
  if (act === "delete") confirmAction({ title: "Delete Income Record", message: "Are you sure you want to delete this income record? This action cannot be undone.", onConfirm: () => {
    const idx = DB.income.findIndex(x => x.id === id);
    if (idx > -1) DB.income.splice(idx, 1);
    saveDB(); showToast("Income record deleted successfully.", "success"); document.dispatchEvent(new CustomEvent("income:saved"));
  }});
});

function injectIncomeModal() {
  if (document.getElementById("incomeModal")) return;
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.id = "incomeModal";
  backdrop.innerHTML = `<div class="modal">
    <div class="modal-header"><h3 id="incomeModalTitle">Add Income</h3><button class="modal-close" data-close-modal>${icon("x")}</button></div>
    <div class="modal-body">
      <input type="hidden" id="incomeIdInput">
      <div class="form-grid">
        <div class="field span-2" id="incf_title"><label>Income Title <span class="required">*</span></label><input class="input" id="incomeTitle"><div class="error-msg">Title is required.</div></div>
        <div class="field"><label>Source</label><select class="select-field2" id="incomeSource">${INCOME_SOURCES.map(s => `<option>${s}</option>`).join("")}</select></div>
        <div class="field" id="incf_amount"><label>Amount (₹) <span class="required">*</span></label><input class="input" type="number" min="0" id="incomeAmount"><div class="error-msg">Enter a valid amount.</div></div>
        <div class="field"><label>Date</label><input class="input" type="date" id="incomeDate"></div>
        <div class="field"><label>Reference <span class="optional">(optional)</span></label><input class="input" id="incomeReference" placeholder="e.g. INV-1023"></div>
        <div class="field span-2"><label>Description <span class="optional">(optional)</span></label><textarea class="textarea" id="incomeDescription"></textarea></div>
      </div>
    </div>
    <div class="modal-footer"><button class="btn btn-secondary" data-close-modal>Cancel</button><button class="btn btn-primary" id="incomeSaveBtn"><span class="btn-label">Save Income</span></button></div>
  </div>`;
  document.body.appendChild(backdrop);
  document.getElementById("incomeSaveBtn").addEventListener("click", () => {
    let valid = true;
    document.getElementById("incf_title").classList.toggle("has-error", !document.getElementById("incomeTitle").value.trim());
    if (!document.getElementById("incomeTitle").value.trim()) valid = false;
    const amt = Number(document.getElementById("incomeAmount").value);
    document.getElementById("incf_amount").classList.toggle("has-error", !(amt > 0));
    if (!(amt > 0)) valid = false;
    if (!valid) return;
    const btn = document.getElementById("incomeSaveBtn");
    setBtnLoading(btn, true);
    setTimeout(() => {
      const id = document.getElementById("incomeIdInput").value;
      const payload = { title: document.getElementById("incomeTitle").value.trim(), source: document.getElementById("incomeSource").value, amount: amt, date: document.getElementById("incomeDate").value, reference: document.getElementById("incomeReference").value.trim(), description: document.getElementById("incomeDescription").value.trim() };
      if (id) { Object.assign(DB.income.find(x => x.id === id), payload); showToast("Income record updated successfully.", "success"); }
      else { DB.income.unshift({ id: nextId("INC", DB.income), ...payload }); showToast("Income recorded successfully.", "success"); }
      saveDB();
      setBtnLoading(btn, false);
      closeModal("incomeModal");
      document.dispatchEvent(new CustomEvent("income:saved"));
    }, 500);
  });
}
function openIncomeModal(id) {
  injectIncomeModal();
  document.querySelectorAll("#incomeModal .field").forEach(f => f.classList.remove("has-error"));
  document.getElementById("incomeIdInput").value = id || "";
  if (id) {
    const i = DB.income.find(x => x.id === id);
    document.getElementById("incomeModalTitle").textContent = "Edit Income";
    document.getElementById("incomeTitle").value = i.title;
    document.getElementById("incomeSource").value = i.source;
    document.getElementById("incomeAmount").value = i.amount;
    document.getElementById("incomeDate").value = i.date;
    document.getElementById("incomeReference").value = i.reference || "";
    document.getElementById("incomeDescription").value = i.description || "";
  } else {
    document.getElementById("incomeModalTitle").textContent = "Add Income";
    document.getElementById("incomeTitle").value = "";
    document.getElementById("incomeSource").value = INCOME_SOURCES[0];
    document.getElementById("incomeAmount").value = "";
    document.getElementById("incomeDate").value = "2026-09-10";
    document.getElementById("incomeReference").value = "";
    document.getElementById("incomeDescription").value = "";
  }
  openModal("incomeModal");
}

document.addEventListener("layout:ready", renderIncomePage);
