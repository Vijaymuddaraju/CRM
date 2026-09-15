/* ==========================================================================
   Estimations — admin-only internal cost tracking (line-item builder)
   Never sent or shown to customers — Draft/Final status only.
   ========================================================================== */

let estimatesTable;
let estimateItems = [];

function renderEstimationsPage() {
  populateEstimateFilters();
  estimatesTable = createTableController({
    data: DB.estimations, pageSize: 8,
    mountBodyId: "estimatesTableBody", mountPaginationId: "estimatesPagination", mountCountId: "estimatesCount",
    filterFn: buildEstimateFilter(), renderRow: renderEstimateRow,
  });
  estimatesTable.render();

  document.getElementById("addEstimateBtn").addEventListener("click", () => openEstimateModal());
  ["estimateSearchInput", "estimateStatusFilter"].forEach(id => {
    document.getElementById(id).addEventListener(id === "estimateSearchInput" ? "input" : "change", debounce(refreshEstimates, 150));
  });

  injectEstimateModal();
  injectEstimatePreviewModal();

  document.addEventListener("estimate:saved", refreshEstimates);
}

function populateEstimateFilters() {
  document.getElementById("estimateStatusFilter").innerHTML = `<option value="">All Statuses</option>` + ["Draft", "Final"].map(s => `<option value="${s}">${s}</option>`).join("");
}
function buildEstimateFilter() {
  const term = document.getElementById("estimateSearchInput").value.trim().toLowerCase();
  const status = document.getElementById("estimateStatusFilter").value;
  return function (e) {
    if (term && !(e.id.toLowerCase().includes(term) || e.title.toLowerCase().includes(term))) return false;
    if (status && e.status !== status) return false;
    return true;
  };
}
function refreshEstimates() { estimatesTable.data = DB.estimations; estimatesTable.refresh(buildEstimateFilter()); }

function renderEstimateRow(e) {
  const lead = e.leadId ? getLeadById(e.leadId) : null;
  return `
    <tr>
      <td class="cell-primary">${escapeHtml(e.title)}</td>
      <td class="cell-muted">${lead ? lead.company : "—"}</td>
      <td>${formatCurrency(e.amount)}</td>
      <td class="cell-muted">${formatDate(e.date)}</td>
      <td>${statusBadge(e.status)}</td>
      <td class="cell-muted">${userName(e.createdBy)}</td>
      <td class="cell-actions">
        <div class="dropdown" style="display:inline-block;">
          <button class="row-menu-btn">${icon("more")}</button>
          <div class="row-menu-panel">
            <div class="dropdown-item" data-e-act="preview" data-e-id="${e.id}">${icon("eye")} Preview</div>
            <div class="dropdown-item" data-e-act="edit" data-e-id="${e.id}">${icon("edit")} Edit</div>
            ${e.status === "Draft" ? `<div class="dropdown-item" data-e-act="finalize" data-e-id="${e.id}">${icon("check")} Mark Final</div>` : ""}
            <div class="dropdown-item danger" data-e-act="delete" data-e-id="${e.id}">${icon("trash")} Delete</div>
          </div>
        </div>
      </td>
    </tr>`;
}

document.addEventListener("click", (e) => {
  const item = e.target.closest("[data-e-act]");
  if (!item) return;
  const id = item.dataset.eId;
  const est = DB.estimations.find(x => x.id === id);
  const act = item.dataset.eAct;
  if (act === "preview") openEstimatePreview(id);
  if (act === "edit") openEstimateModal(id);
  if (act === "finalize") { est.status = "Final"; saveDB(); showToast("Estimation marked as final.", "success"); document.dispatchEvent(new CustomEvent("estimate:saved")); }
  if (act === "delete") {
    confirmAction({ title: "Delete Estimation", message: `Delete estimation ${id}? This cannot be undone.`, onConfirm: () => {
      const idx = DB.estimations.findIndex(x => x.id === id);
      if (idx > -1) DB.estimations.splice(idx, 1);
      saveDB(); showToast("Estimation deleted.", "success"); document.dispatchEvent(new CustomEvent("estimate:saved"));
    }});
  }
});

/* ---------------------------- ESTIMATE BUILDER MODAL ---------------------------- */

function injectEstimateModal() {
  if (document.getElementById("estimateModal")) return;
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.id = "estimateModal";
  backdrop.innerHTML = `
    <div class="modal modal-xl">
      <div class="modal-header"><h3 id="estimateModalTitle">Add Estimation</h3><button class="modal-close" data-close-modal>${icon("x")}</button></div>
      <div class="modal-body">
        <input type="hidden" id="estimateIdInput">
        <div class="form-grid mb-2">
          <div class="field span-2"><label>Title <span class="required">*</span></label><input class="input" id="estimateTitle" placeholder="e.g. Agarwal Textiles — Bulk ERP Estimate"></div>
          <div class="field"><label>Related Lead <span class="optional">(optional)</span></label>
            <select class="select-field2" id="estimateLead"><option value="">None</option>${DB.leads.map(l => `<option value="${l.id}">${l.company} — ${l.id}</option>`).join("")}</select>
          </div>
          <div class="field"><label>Date</label><input class="input" type="date" id="estimateDate"></div>
        </div>

        <div class="section-title mb-2">Cost Items</div>
        <div class="line-items">
          <table>
            <thead><tr><th style="width:40%;">Description</th><th>Qty</th><th>Rate (₹)</th><th>Tax %</th><th>Total</th><th></th></tr></thead>
            <tbody id="estimateItemsBody"></tbody>
          </table>
          <div class="add-row-btn" id="addEstimateItemBtn">${icon("plus")} Add Item</div>
        </div>

        <div class="totals-box" id="estimateTotalsBox"></div>
      </div>
      <div class="modal-footer spread">
        <button class="btn btn-ghost" id="estimatePreviewBtn" type="button">${icon("eye")} Preview</button>
        <div class="flex gap-2">
          <button class="btn btn-secondary" data-close-modal>Cancel</button>
          <button class="btn btn-secondary" id="estimateSaveDraftBtn"><span class="btn-label">Save Draft</span></button>
          <button class="btn btn-primary" id="estimateSaveFinalBtn"><span class="btn-label">Save as Final</span></button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(backdrop);

  document.getElementById("addEstimateItemBtn").addEventListener("click", () => { estimateItems.push({ desc: "", qty: 1, rate: 0, tax: 0 }); renderEstimateItems(); });
  document.getElementById("estimateSaveDraftBtn").addEventListener("click", () => submitEstimateForm("Draft"));
  document.getElementById("estimateSaveFinalBtn").addEventListener("click", () => submitEstimateForm("Final"));
  document.getElementById("estimatePreviewBtn").addEventListener("click", () => {
    const draft = collectEstimateDraft();
    renderEstimatePreviewContent(draft);
    openModal("estimatePreviewModal");
  });
}

function renderEstimateItems() {
  const body = document.getElementById("estimateItemsBody");
  body.innerHTML = estimateItems.map((it, i) => `
    <tr data-idx="${i}">
      <td><input type="text" value="${escapeHtml(it.desc)}" data-field="desc" placeholder="Item description"></td>
      <td style="width:70px;"><input type="number" min="0" value="${it.qty}" data-field="qty"></td>
      <td style="width:120px;"><input type="number" min="0" value="${it.rate}" data-field="rate"></td>
      <td style="width:90px;"><input type="number" min="0" max="100" value="${it.tax}" data-field="tax"></td>
      <td class="cell-muted" style="width:120px;white-space:nowrap;">${formatCurrency(estimateLineTotal(it))}</td>
      <td><button class="remove-row-btn" data-remove="${i}">${icon("trash")}</button></td>
    </tr>`).join("");

  body.querySelectorAll("input").forEach(input => {
    input.addEventListener("input", (e) => {
      const idx = e.target.closest("tr").dataset.idx;
      const field = e.target.dataset.field;
      estimateItems[idx][field] = field === "desc" ? e.target.value : Number(e.target.value) || 0;
      renderEstimateItems();
      renderEstimateTotals();
      const row = body.querySelector(`tr[data-idx="${idx}"] [data-field="${field}"]`);
      if (row) {
        row.focus();
        if (row.type === "text") { const val = row.value; row.setSelectionRange(val.length, val.length); }
      }
    });
  });
  body.querySelectorAll("[data-remove]").forEach(btn => {
    btn.addEventListener("click", () => { estimateItems.splice(Number(btn.dataset.remove), 1); renderEstimateItems(); renderEstimateTotals(); });
  });
  renderEstimateTotals();
}

function estimateLineTotal(it) {
  return it.qty * it.rate * (1 + it.tax / 100);
}

function renderEstimateTotals() {
  const subtotal = estimateItems.reduce((s, it) => s + it.qty * it.rate, 0);
  const taxTotal = estimateItems.reduce((s, it) => s + (it.qty * it.rate) * (it.tax / 100), 0);
  const grand = subtotal + taxTotal;
  document.getElementById("estimateTotalsBox").innerHTML = `
    <div class="totals-row"><span>Subtotal</span><span>${formatCurrency(subtotal)}</span></div>
    <div class="totals-row"><span>Tax</span><span>+ ${formatCurrency(taxTotal)}</span></div>
    <div class="totals-row grand"><span>Grand Total</span><span>${formatCurrency(grand)}</span></div>`;
  return grand;
}

function openEstimateModal(estimateId) {
  injectEstimateModal();
  document.getElementById("estimateIdInput").value = estimateId || "";
  if (estimateId) {
    const e = DB.estimations.find(x => x.id === estimateId);
    document.getElementById("estimateModalTitle").textContent = `Edit Estimation — ${e.id}`;
    document.getElementById("estimateTitle").value = e.title;
    document.getElementById("estimateLead").value = e.leadId || "";
    document.getElementById("estimateDate").value = e.date;
    estimateItems = e.items.map(i => ({ ...i }));
  } else {
    document.getElementById("estimateModalTitle").textContent = "Add Estimation";
    document.getElementById("estimateTitle").value = "";
    document.getElementById("estimateLead").value = "";
    document.getElementById("estimateDate").value = "2026-09-10";
    estimateItems = [{ desc: "", qty: 1, rate: 0, tax: 0 }];
  }
  renderEstimateItems();
  openModal("estimateModal");
}

function collectEstimateDraft() {
  return {
    title: document.getElementById("estimateTitle").value.trim(),
    leadId: document.getElementById("estimateLead").value,
    date: document.getElementById("estimateDate").value,
    items: estimateItems,
    amount: Math.round(renderEstimateTotals()),
  };
}

function submitEstimateForm(status) {
  const title = document.getElementById("estimateTitle").value.trim();
  if (!title) { showToast("Please fill all required fields.", "error"); return; }
  if (!estimateItems.length || estimateItems.every(it => !it.desc)) { showToast("Please add at least one cost item.", "error"); return; }

  const btn = status === "Draft" ? document.getElementById("estimateSaveDraftBtn") : document.getElementById("estimateSaveFinalBtn");
  setBtnLoading(btn, true);
  setTimeout(() => {
    const id = document.getElementById("estimateIdInput").value;
    const draft = collectEstimateDraft();
    if (id) {
      const e = DB.estimations.find(x => x.id === id);
      Object.assign(e, draft, { status });
      showToast("Estimation updated successfully.", "success");
    } else {
      DB.estimations.unshift({ id: nextId("EST", DB.estimations), createdBy: CURRENT_LAYOUT_USER.id, ...draft, status });
      showToast(status === "Draft" ? "Estimation saved as draft." : "Estimation saved as final.", "success");
    }
    saveDB();
    setBtnLoading(btn, false);
    closeModal("estimateModal");
    document.dispatchEvent(new CustomEvent("estimate:saved"));
  }, 600);
}

/* ---------------------------- PREVIEW MODAL (internal only, no export) ---------------------------- */
function injectEstimatePreviewModal() {
  if (document.getElementById("estimatePreviewModal")) return;
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.id = "estimatePreviewModal";
  backdrop.innerHTML = `<div class="modal modal-lg"><div class="modal-header"><h3>Estimation Summary</h3><button class="modal-close" data-close-modal>${icon("x")}</button></div><div class="modal-body" id="estimatePreviewBody"></div><div class="modal-footer"><button class="btn btn-secondary" data-close-modal>Close</button></div></div>`;
  document.body.appendChild(backdrop);
}

function openEstimatePreview(estimateId) {
  const e = DB.estimations.find(x => x.id === estimateId);
  injectEstimatePreviewModal();
  renderEstimatePreviewContent(e);
  openModal("estimatePreviewModal");
}

function renderEstimatePreviewContent(e) {
  const lead = e.leadId ? getLeadById(e.leadId) : null;
  const subtotal = e.items.reduce((s, it) => s + it.qty * it.rate, 0);
  const taxTotal = e.items.reduce((s, it) => s + (it.qty * it.rate) * (it.tax / 100), 0);
  const grand = subtotal + taxTotal;
  document.getElementById("estimatePreviewBody").innerHTML = `
    <div class="mb-4">
      <div class="fw-700" style="font-size:16px;">${escapeHtml(e.title || "Untitled Estimation")}</div>
      <div class="text-faint fs-sm">${e.id || "Not saved yet"} · ${formatDate(e.date)}${lead ? " · " + escapeHtml(lead.company) : ""}</div>
      <div class="text-faint fs-xs mt-1">Internal use only — never shared with the customer.</div>
    </div>
    <div class="line-items mb-4"><table>
      <thead><tr><th>Description</th><th>Qty</th><th>Rate</th><th>Tax</th><th>Total</th></tr></thead>
      <tbody>${e.items.map(it => `<tr><td>${escapeHtml(it.desc)}</td><td>${it.qty}</td><td>${formatCurrency(it.rate)}</td><td>${it.tax}%</td><td>${formatCurrency(estimateLineTotal(it))}</td></tr>`).join("")}</tbody>
    </table></div>
    <div class="totals-box">
      <div class="totals-row"><span>Subtotal</span><span>${formatCurrency(subtotal)}</span></div>
      <div class="totals-row"><span>Tax</span><span>+ ${formatCurrency(taxTotal)}</span></div>
      <div class="totals-row grand"><span>Grand Total</span><span>${formatCurrency(grand)}</span></div>
    </div>`;
}

document.addEventListener("layout:ready", renderEstimationsPage);
