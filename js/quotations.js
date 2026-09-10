/* ==========================================================================
   Quotations — list + line-item builder modal
   ========================================================================== */

let quotationsTable;
let quoteItems = [];

function renderQuotationsPage() {
  populateQuoteFilters();
  quotationsTable = createTableController({
    data: DB.quotations, pageSize: 8,
    mountBodyId: "quotesTableBody", mountPaginationId: "quotesPagination", mountCountId: "quotesCount",
    filterFn: buildQuoteFilter(), renderRow: renderQuoteRow,
  });
  quotationsTable.render();

  document.getElementById("addQuoteBtn").addEventListener("click", () => openQuoteModal());
  ["quoteSearchInput", "quoteStatusFilter"].forEach(id => {
    document.getElementById(id).addEventListener(id === "quoteSearchInput" ? "input" : "change", debounce(refreshQuotes, 150));
  });

  injectQuoteModal();
  injectQuotePreviewModal();

  // Deep-link support: quotations.html?new=1&leadId=LD-xxxx
  if (qs("new") === "1") openQuoteModal(null, qs("leadId"));

  document.addEventListener("quote:saved", refreshQuotes);
}

function populateQuoteFilters() {
  document.getElementById("quoteStatusFilter").innerHTML = `<option value="">All Statuses</option>` + ["Draft", "Sent", "Accepted", "Rejected", "Expired"].map(s => `<option value="${s}">${s}</option>`).join("");
}
function buildQuoteFilter() {
  const term = document.getElementById("quoteSearchInput").value.trim().toLowerCase();
  const status = document.getElementById("quoteStatusFilter").value;
  return function (q) {
    if (term && !(q.id.toLowerCase().includes(term) || q.customer.toLowerCase().includes(term))) return false;
    if (status && q.status !== status) return false;
    return true;
  };
}
function refreshQuotes() { quotationsTable.data = DB.quotations; quotationsTable.refresh(buildQuoteFilter()); }

function renderQuoteRow(q) {
  return `
    <tr>
      <td class="cell-primary">${q.id}</td>
      <td>${q.customer}</td>
      <td class="cell-muted">${q.leadId || "—"}</td>
      <td>${formatCurrency(q.amount)}</td>
      <td class="cell-muted">${formatDate(q.date)}</td>
      <td class="cell-muted">${formatDate(q.validUntil)}</td>
      <td>${statusBadge(q.status)}</td>
      <td class="cell-muted">${userName(q.createdBy)}</td>
      <td class="cell-actions">
        <div class="dropdown" style="display:inline-block;">
          <button class="row-menu-btn">${icon("more")}</button>
          <div class="row-menu-panel">
            <div class="dropdown-item" data-q-act="preview" data-q-id="${q.id}">${icon("eye")} Preview</div>
            <div class="dropdown-item" data-q-act="edit" data-q-id="${q.id}">${icon("edit")} Edit</div>
            ${q.status === "Draft" ? `<div class="dropdown-item" data-q-act="send" data-q-id="${q.id}">${icon("send")} Send</div>` : ""}
            ${q.status === "Sent" ? `<div class="dropdown-item" data-q-act="accept" data-q-id="${q.id}">${icon("check")} Mark Accepted</div>` : ""}
            ${q.status === "Sent" ? `<div class="dropdown-item" data-q-act="reject" data-q-id="${q.id}">${icon("x")} Mark Rejected</div>` : ""}
            ${q.status === "Accepted" ? `<div class="dropdown-item" data-q-act="invoice" data-q-id="${q.id}">${icon("invoices")} Create Invoice</div>` : ""}
            <div class="dropdown-item" data-q-act="download" data-q-id="${q.id}">${icon("download")} Download</div>
            <div class="dropdown-item danger" data-q-act="delete" data-q-id="${q.id}">${icon("trash")} Delete</div>
          </div>
        </div>
      </td>
    </tr>`;
}

document.addEventListener("click", (e) => {
  const item = e.target.closest("[data-q-act]");
  if (!item) return;
  const id = item.dataset.qId;
  const q = DB.quotations.find(x => x.id === id);
  const act = item.dataset.qAct;
  if (act === "preview") openQuotePreview(id);
  if (act === "edit") openQuoteModal(id);
  if (act === "send") { q.status = "Sent"; saveDB(); showToast("Quotation sent to customer.", "success"); document.dispatchEvent(new CustomEvent("quote:saved")); }
  if (act === "accept") { q.status = "Accepted"; saveDB(); showToast("Quotation marked as accepted.", "success"); document.dispatchEvent(new CustomEvent("quote:saved")); }
  if (act === "reject") { q.status = "Rejected"; saveDB(); showToast("Quotation marked as rejected.", "warning"); document.dispatchEvent(new CustomEvent("quote:saved")); }
  if (act === "download") showToast("Quotation PDF downloaded (simulated).", "success");
  if (act === "invoice") createInvoiceFromQuote(id);
  if (act === "delete") {
    confirmAction({ title: "Delete Quotation", message: `Delete quotation ${id}? This cannot be undone.`, onConfirm: () => {
      const idx = DB.quotations.findIndex(x => x.id === id);
      if (idx > -1) DB.quotations.splice(idx, 1);
      saveDB(); showToast("Quotation deleted.", "success"); document.dispatchEvent(new CustomEvent("quote:saved"));
    }});
  }
});

function createInvoiceFromQuote(quoteId) {
  const q = DB.quotations.find(x => x.id === quoteId);
  if (!q) return;
  const invId = nextId("INV", DB.invoices);
  const invDate = "2026-09-10";
  const due = new Date(invDate); due.setDate(due.getDate() + 14);
  DB.invoices.unshift({ id: invId, quotationId: q.id, customer: q.customer, invoiceDate: invDate, dueDate: due.toISOString().slice(0, 10), amount: Math.round(q.amount * 1.0), paidAmount: 0, status: "Draft" });
  saveDB();
  showToast(`Invoice ${invId} created from ${quoteId}.`, "success");
  window.location.href = `invoices.html?id=${invId}`;
}

/* ---------------------------- QUOTE BUILDER MODAL ---------------------------- */

function injectQuoteModal() {
  if (document.getElementById("quoteModal")) return;
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.id = "quoteModal";
  backdrop.innerHTML = `
    <div class="modal modal-xl">
      <div class="modal-header"><h3 id="quoteModalTitle">Create Quotation</h3><button class="modal-close" data-close-modal>${icon("x")}</button></div>
      <div class="modal-body">
        <input type="hidden" id="quoteIdInput">
        <div class="form-grid mb-2">
          <div class="field"><label>Customer Name <span class="required">*</span></label><input class="input" id="quoteCustomer" placeholder="e.g. Agarwal Textiles Pvt Ltd"></div>
          <div class="field"><label>Related Lead <span class="optional">(optional)</span></label>
            <select class="select-field2" id="quoteLead"><option value="">None</option>${DB.leads.map(l => `<option value="${l.id}">${l.company} — ${l.id}</option>`).join("")}</select>
          </div>
          <div class="field"><label>Quotation Date</label><input class="input" type="date" id="quoteDate"></div>
          <div class="field"><label>Valid Until</label><input class="input" type="date" id="quoteValidUntil"></div>
        </div>

        <div class="section-title mb-2">Items</div>
        <div class="line-items">
          <table>
            <thead><tr><th style="width:32%;">Description</th><th>Qty</th><th>Rate (₹)</th><th>Discount %</th><th>Tax %</th><th>Total</th><th></th></tr></thead>
            <tbody id="quoteItemsBody"></tbody>
          </table>
          <div class="add-row-btn" id="addQuoteItemBtn">${icon("plus")} Add Item</div>
        </div>

        <div class="totals-box" id="quoteTotalsBox"></div>
      </div>
      <div class="modal-footer spread">
        <button class="btn btn-ghost" id="quotePreviewBtn" type="button">${icon("eye")} Preview</button>
        <div class="flex gap-2">
          <button class="btn btn-secondary" data-close-modal>Cancel</button>
          <button class="btn btn-secondary" id="quoteSaveDraftBtn"><span class="btn-label">Save Draft</span></button>
          <button class="btn btn-primary" id="quoteSendBtn"><span class="btn-label">Save &amp; Send</span></button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(backdrop);

  document.getElementById("addQuoteItemBtn").addEventListener("click", () => { quoteItems.push({ desc: "", qty: 1, rate: 0, discount: 0, tax: 18 }); renderQuoteItems(); });
  document.getElementById("quoteSaveDraftBtn").addEventListener("click", () => submitQuoteForm("Draft"));
  document.getElementById("quoteSendBtn").addEventListener("click", () => submitQuoteForm("Sent"));
  document.getElementById("quotePreviewBtn").addEventListener("click", () => {
    const draft = collectQuoteDraft();
    renderQuotePreviewContent(draft);
    openModal("quotePreviewModal");
  });
}

function renderQuoteItems() {
  const body = document.getElementById("quoteItemsBody");
  body.innerHTML = quoteItems.map((it, i) => `
    <tr data-idx="${i}">
      <td><input type="text" value="${escapeHtml(it.desc)}" data-field="desc" placeholder="Item description"></td>
      <td style="width:70px;"><input type="number" min="0" value="${it.qty}" data-field="qty"></td>
      <td style="width:110px;"><input type="number" min="0" value="${it.rate}" data-field="rate"></td>
      <td style="width:90px;"><input type="number" min="0" max="100" value="${it.discount}" data-field="discount"></td>
      <td style="width:80px;"><input type="number" min="0" max="100" value="${it.tax}" data-field="tax"></td>
      <td class="cell-muted" style="width:110px;white-space:nowrap;">${formatCurrency(lineTotal(it))}</td>
      <td><button class="remove-row-btn" data-remove="${i}">${icon("trash")}</button></td>
    </tr>`).join("");

  body.querySelectorAll("input").forEach(input => {
    input.addEventListener("input", (e) => {
      const idx = e.target.closest("tr").dataset.idx;
      const field = e.target.dataset.field;
      quoteItems[idx][field] = field === "desc" ? e.target.value : Number(e.target.value) || 0;
      renderQuoteItems();
      renderQuoteTotals();
      // preserve focus on the field being typed
      const row = body.querySelector(`tr[data-idx="${idx}"] [data-field="${field}"]`);
      if (row) {
        row.focus();
        if (row.type === "text") { const val = row.value; row.setSelectionRange(val.length, val.length); }
      }
    });
  });
  body.querySelectorAll("[data-remove]").forEach(btn => {
    btn.addEventListener("click", () => { quoteItems.splice(Number(btn.dataset.remove), 1); renderQuoteItems(); renderQuoteTotals(); });
  });
  renderQuoteTotals();
}

function lineTotal(it) {
  const base = it.qty * it.rate;
  const afterDiscount = base - base * (it.discount / 100);
  return afterDiscount + afterDiscount * (it.tax / 100);
}

function renderQuoteTotals() {
  const subtotal = quoteItems.reduce((s, it) => s + it.qty * it.rate, 0);
  const discountTotal = quoteItems.reduce((s, it) => s + (it.qty * it.rate) * (it.discount / 100), 0);
  const taxable = subtotal - discountTotal;
  const taxTotal = quoteItems.reduce((s, it) => { const base = it.qty * it.rate; const afterDisc = base - base * (it.discount / 100); return s + afterDisc * (it.tax / 100); }, 0);
  const grand = taxable + taxTotal;
  document.getElementById("quoteTotalsBox").innerHTML = `
    <div class="totals-row"><span>Subtotal</span><span>${formatCurrency(subtotal)}</span></div>
    <div class="totals-row"><span>Discount</span><span>- ${formatCurrency(discountTotal)}</span></div>
    <div class="totals-row"><span>Tax</span><span>+ ${formatCurrency(taxTotal)}</span></div>
    <div class="totals-row grand"><span>Grand Total</span><span>${formatCurrency(grand)}</span></div>`;
  return grand;
}

function openQuoteModal(quoteId, leadId) {
  injectQuoteModal();
  document.getElementById("quoteIdInput").value = quoteId || "";
  if (quoteId) {
    const q = DB.quotations.find(x => x.id === quoteId);
    document.getElementById("quoteModalTitle").textContent = `Edit Quotation — ${q.id}`;
    document.getElementById("quoteCustomer").value = q.customer;
    document.getElementById("quoteLead").value = q.leadId || "";
    document.getElementById("quoteDate").value = q.date;
    document.getElementById("quoteValidUntil").value = q.validUntil;
    quoteItems = q.items.map(i => ({ ...i }));
  } else {
    document.getElementById("quoteModalTitle").textContent = "Create Quotation";
    const lead = leadId ? getLeadById(leadId) : null;
    document.getElementById("quoteCustomer").value = lead ? lead.company : "";
    document.getElementById("quoteLead").value = leadId || "";
    document.getElementById("quoteDate").value = "2026-09-10";
    const validUntil = new Date(2026, 8, 10); validUntil.setDate(validUntil.getDate() + 15);
    document.getElementById("quoteValidUntil").value = validUntil.toISOString().slice(0, 10);
    quoteItems = [{ desc: "", qty: 1, rate: 0, discount: 0, tax: 18 }];
  }
  renderQuoteItems();
  openModal("quoteModal");
}

function collectQuoteDraft() {
  return {
    customer: document.getElementById("quoteCustomer").value.trim(),
    leadId: document.getElementById("quoteLead").value,
    date: document.getElementById("quoteDate").value,
    validUntil: document.getElementById("quoteValidUntil").value,
    items: quoteItems,
    amount: Math.round(renderQuoteTotals()),
  };
}

function submitQuoteForm(status) {
  const customer = document.getElementById("quoteCustomer").value.trim();
  if (!customer) { showToast("Please fill all required fields.", "error"); return; }
  if (!quoteItems.length || quoteItems.every(it => !it.desc)) { showToast("Please add at least one item.", "error"); return; }

  const btn = status === "Draft" ? document.getElementById("quoteSaveDraftBtn") : document.getElementById("quoteSendBtn");
  setBtnLoading(btn, true);
  setTimeout(() => {
    const id = document.getElementById("quoteIdInput").value;
    const draft = collectQuoteDraft();
    if (id) {
      const q = DB.quotations.find(x => x.id === id);
      Object.assign(q, draft, { status });
      showToast("Quotation updated successfully.", "success");
    } else {
      DB.quotations.unshift({ id: nextId("QT", DB.quotations), createdBy: CURRENT_LAYOUT_USER.id, ...draft, status });
      showToast(status === "Draft" ? "Quotation saved as draft." : "Quotation created and sent.", "success");
    }
    saveDB();
    setBtnLoading(btn, false);
    closeModal("quoteModal");
    document.dispatchEvent(new CustomEvent("quote:saved"));
  }, 600);
}

/* ---------------------------- PREVIEW MODAL ---------------------------- */
function injectQuotePreviewModal() {
  if (document.getElementById("quotePreviewModal")) return;
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.id = "quotePreviewModal";
  backdrop.innerHTML = `<div class="modal modal-lg"><div class="modal-header"><h3>Quotation Preview</h3><button class="modal-close" data-close-modal>${icon("x")}</button></div><div class="modal-body" id="quotePreviewBody"></div><div class="modal-footer"><button class="btn btn-secondary" data-close-modal>Close</button><button class="btn btn-primary" id="previewDownloadBtn">${icon("download")} Download PDF</button></div></div>`;
  document.body.appendChild(backdrop);
  document.getElementById("previewDownloadBtn").addEventListener("click", () => showToast("Quotation PDF downloaded (simulated).", "success"));
}

function openQuotePreview(quoteId) {
  const q = DB.quotations.find(x => x.id === quoteId);
  injectQuotePreviewModal();
  renderQuotePreviewContent(q);
  openModal("quotePreviewModal");
}

function renderQuotePreviewContent(q) {
  const subtotal = q.items.reduce((s, it) => s + it.qty * it.rate, 0);
  const discountTotal = q.items.reduce((s, it) => s + (it.qty * it.rate) * (it.discount / 100), 0);
  const taxTotal = q.items.reduce((s, it) => { const base = it.qty * it.rate; const afterDisc = base - base * (it.discount / 100); return s + afterDisc * (it.tax / 100); }, 0);
  const grand = subtotal - discountTotal + taxTotal;
  document.getElementById("quotePreviewBody").innerHTML = `
    <div class="flex justify-between items-center mb-5">
      <div><div style="font-weight:700;font-size:18px;">${DB.settings.general.companyName}</div><div class="text-faint fs-sm">${DB.settings.general.address}</div></div>
      <div style="text-align:right;"><div class="fw-700">Quotation ${q.id || ""}</div><div class="text-faint fs-sm">Date: ${formatDate(q.date)}</div><div class="text-faint fs-sm">Valid Until: ${formatDate(q.validUntil)}</div></div>
    </div>
    <div class="mb-4"><div class="text-faint fs-xs fw-600" style="text-transform:uppercase;">Billed To</div><div class="fw-600">${escapeHtml(q.customer)}</div></div>
    <div class="line-items mb-4"><table>
      <thead><tr><th>Description</th><th>Qty</th><th>Rate</th><th>Discount</th><th>Tax</th><th>Total</th></tr></thead>
      <tbody>${q.items.map(it => `<tr><td>${escapeHtml(it.desc)}</td><td>${it.qty}</td><td>${formatCurrency(it.rate)}</td><td>${it.discount}%</td><td>${it.tax}%</td><td>${formatCurrency(lineTotal(it))}</td></tr>`).join("")}</tbody>
    </table></div>
    <div class="totals-box">
      <div class="totals-row"><span>Subtotal</span><span>${formatCurrency(subtotal)}</span></div>
      <div class="totals-row"><span>Discount</span><span>- ${formatCurrency(discountTotal)}</span></div>
      <div class="totals-row"><span>Tax</span><span>+ ${formatCurrency(taxTotal)}</span></div>
      <div class="totals-row grand"><span>Grand Total</span><span>${formatCurrency(grand)}</span></div>
    </div>`;
}

document.addEventListener("layout:ready", renderQuotationsPage);
