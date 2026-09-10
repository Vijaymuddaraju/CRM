/* ==========================================================================
   Purchase Orders (Admin only)
   ========================================================================== */

let poTable;
const PO_STATUSES = ["Draft", "Pending", "Approved", "Completed", "Cancelled"];

function renderPOPage() {
  document.getElementById("poStatusFilter").innerHTML = `<option value="">All Statuses</option>` + PO_STATUSES.map(s => `<option value="${s}">${s}</option>`).join("");
  poTable = createTableController({
    data: DB.purchaseOrders, pageSize: 8,
    mountBodyId: "poTableBody", mountPaginationId: "poPagination", mountCountId: "poCount",
    filterFn: buildPOFilter(), renderRow: renderPORow,
  });
  poTable.render();
  document.getElementById("addPOBtn").addEventListener("click", () => openPOModal());
  ["poSearchInput", "poStatusFilter"].forEach(id => document.getElementById(id).addEventListener(id === "poSearchInput" ? "input" : "change", debounce(refreshPO, 150)));
  injectPOModal();
  document.addEventListener("po:saved", refreshPO);
}

function buildPOFilter() {
  const term = document.getElementById("poSearchInput").value.trim().toLowerCase();
  const status = document.getElementById("poStatusFilter").value;
  return (p) => {
    if (term && !(p.id.toLowerCase().includes(term) || p.vendor.toLowerCase().includes(term))) return false;
    if (status && p.status !== status) return false;
    return true;
  };
}
function refreshPO() { poTable.data = DB.purchaseOrders; poTable.refresh(buildPOFilter()); }

function renderPORow(p) {
  return `<tr>
    <td class="cell-primary">${p.id}</td>
    <td>${p.vendor}</td>
    <td class="cell-muted">${formatDate(p.date)}</td>
    <td class="cell-muted">${formatDate(p.expectedDate)}</td>
    <td>${formatCurrency(p.amount)}</td>
    <td>${statusBadge(p.status)}</td>
    <td class="cell-muted" style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${p.notes || "—"}</td>
    <td class="cell-actions">
      <div class="dropdown" style="display:inline-block;">
        <button class="row-menu-btn">${icon("more")}</button>
        <div class="row-menu-panel">
          <div class="dropdown-item" data-po-act="edit" data-po-id="${p.id}">${icon("edit")} Edit</div>
          ${p.status === "Pending" ? `<div class="dropdown-item" data-po-act="approve" data-po-id="${p.id}">${icon("check")} Approve</div>` : ""}
          ${p.status === "Approved" ? `<div class="dropdown-item" data-po-act="complete" data-po-id="${p.id}">${icon("checkCircle")} Mark Completed</div>` : ""}
          ${!["Completed", "Cancelled"].includes(p.status) ? `<div class="dropdown-item" data-po-act="cancel" data-po-id="${p.id}">${icon("x")} Cancel</div>` : ""}
          <div class="dropdown-item danger" data-po-act="delete" data-po-id="${p.id}">${icon("trash")} Delete</div>
        </div>
      </div>
    </td>
  </tr>`;
}

document.addEventListener("click", (e) => {
  const item = e.target.closest("[data-po-act]");
  if (!item) return;
  const id = item.dataset.poId, act = item.dataset.poAct;
  const po = DB.purchaseOrders.find(x => x.id === id);
  if (act === "edit") openPOModal(id);
  if (act === "approve") { po.status = "Approved"; saveDB(); showToast("Purchase order approved.", "success"); document.dispatchEvent(new CustomEvent("po:saved")); }
  if (act === "complete") { po.status = "Completed"; saveDB(); showToast("Purchase order marked completed.", "success"); document.dispatchEvent(new CustomEvent("po:saved")); }
  if (act === "cancel") { po.status = "Cancelled"; saveDB(); showToast("Purchase order cancelled.", "warning"); document.dispatchEvent(new CustomEvent("po:saved")); }
  if (act === "delete") confirmAction({ title: "Delete Purchase Order", message: `Delete ${id}? This cannot be undone.`, onConfirm: () => {
    const idx = DB.purchaseOrders.findIndex(x => x.id === id);
    if (idx > -1) DB.purchaseOrders.splice(idx, 1);
    saveDB(); showToast("Purchase order deleted.", "success"); document.dispatchEvent(new CustomEvent("po:saved"));
  }});
});

function injectPOModal() {
  if (document.getElementById("poModal")) return;
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.id = "poModal";
  backdrop.innerHTML = `<div class="modal">
    <div class="modal-header"><h3 id="poModalTitle">Add Purchase Order</h3><button class="modal-close" data-close-modal>${icon("x")}</button></div>
    <div class="modal-body">
      <input type="hidden" id="poIdInput">
      <div class="form-grid">
        <div class="field span-2" id="pof_vendor"><label>Vendor / Customer <span class="required">*</span></label><input class="input" id="poVendor"><div class="error-msg">Vendor is required.</div></div>
        <div class="field"><label>Date</label><input class="input" type="date" id="poDate"></div>
        <div class="field"><label>Expected Date</label><input class="input" type="date" id="poExpectedDate"></div>
        <div class="field" id="pof_amount"><label>Amount (₹) <span class="required">*</span></label><input class="input" type="number" min="0" id="poAmount"><div class="error-msg">Enter a valid amount.</div></div>
        <div class="field"><label>Status</label><select class="select-field2" id="poStatus">${PO_STATUSES.map(s => `<option>${s}</option>`).join("")}</select></div>
        <div class="field span-2"><label>Notes <span class="optional">(optional)</span></label><textarea class="textarea" id="poNotes"></textarea></div>
      </div>
    </div>
    <div class="modal-footer"><button class="btn btn-secondary" data-close-modal>Cancel</button><button class="btn btn-primary" id="poSaveBtn"><span class="btn-label">Save Purchase Order</span></button></div>
  </div>`;
  document.body.appendChild(backdrop);
  document.getElementById("poSaveBtn").addEventListener("click", () => {
    let valid = true;
    document.getElementById("pof_vendor").classList.toggle("has-error", !document.getElementById("poVendor").value.trim());
    if (!document.getElementById("poVendor").value.trim()) valid = false;
    const amt = Number(document.getElementById("poAmount").value);
    document.getElementById("pof_amount").classList.toggle("has-error", !(amt > 0));
    if (!(amt > 0)) valid = false;
    if (!valid) return;
    const btn = document.getElementById("poSaveBtn");
    setBtnLoading(btn, true);
    setTimeout(() => {
      const id = document.getElementById("poIdInput").value;
      const payload = { vendor: document.getElementById("poVendor").value.trim(), date: document.getElementById("poDate").value, expectedDate: document.getElementById("poExpectedDate").value, amount: amt, status: document.getElementById("poStatus").value, notes: document.getElementById("poNotes").value.trim() };
      if (id) { Object.assign(DB.purchaseOrders.find(x => x.id === id), payload); showToast("Purchase order updated successfully.", "success"); }
      else { DB.purchaseOrders.unshift({ id: nextId("PO", DB.purchaseOrders), ...payload }); showToast("Purchase order created successfully.", "success"); }
      saveDB();
      setBtnLoading(btn, false);
      closeModal("poModal");
      document.dispatchEvent(new CustomEvent("po:saved"));
    }, 500);
  });
}
function openPOModal(id) {
  injectPOModal();
  document.querySelectorAll("#poModal .field").forEach(f => f.classList.remove("has-error"));
  document.getElementById("poIdInput").value = id || "";
  if (id) {
    const p = DB.purchaseOrders.find(x => x.id === id);
    document.getElementById("poModalTitle").textContent = `Edit Purchase Order — ${p.id}`;
    document.getElementById("poVendor").value = p.vendor;
    document.getElementById("poDate").value = p.date;
    document.getElementById("poExpectedDate").value = p.expectedDate;
    document.getElementById("poAmount").value = p.amount;
    document.getElementById("poStatus").value = p.status;
    document.getElementById("poNotes").value = p.notes || "";
  } else {
    document.getElementById("poModalTitle").textContent = "Add Purchase Order";
    document.getElementById("poVendor").value = "";
    document.getElementById("poDate").value = "2026-09-10";
    document.getElementById("poExpectedDate").value = "";
    document.getElementById("poAmount").value = "";
    document.getElementById("poStatus").value = "Draft";
    document.getElementById("poNotes").value = "";
  }
  openModal("poModal");
}

document.addEventListener("layout:ready", renderPOPage);
