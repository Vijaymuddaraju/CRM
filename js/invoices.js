/* ==========================================================================
   Invoices page
   ========================================================================== */

let invoicesTable;

function renderInvoicesPage() {
  populateInvoiceFilters();
  invoicesTable = createTableController({
    data: DB.invoices, pageSize: 8,
    mountBodyId: "invoicesTableBody", mountPaginationId: "invoicesPagination", mountCountId: "invoicesCount",
    filterFn: buildInvoiceFilter(), renderRow: renderInvoiceRow,
  });
  invoicesTable.render();

  document.getElementById("addInvoiceBtn").addEventListener("click", () => openInvoiceModal());
  ["invoiceSearchInput", "invoiceStatusFilter"].forEach(id => {
    document.getElementById(id).addEventListener(id === "invoiceSearchInput" ? "input" : "change", debounce(refreshInvoices, 150));
  });

  injectInvoiceModal();
  injectPaymentModal();
  injectInvoicePreviewModal();

  if (qs("id")) openInvoicePreview(qs("id"));

  document.addEventListener("invoice:saved", refreshInvoices);
  document.addEventListener("payment:saved", refreshInvoices);
}

function populateInvoiceFilters() {
  document.getElementById("invoiceStatusFilter").innerHTML = `<option value="">All Statuses</option>` + ["Draft", "Sent", "Partially Paid", "Paid", "Overdue"].map(s => `<option value="${s}">${s}</option>`).join("");
}
function buildInvoiceFilter() {
  const term = document.getElementById("invoiceSearchInput").value.trim().toLowerCase();
  const status = document.getElementById("invoiceStatusFilter").value;
  return function (i) {
    if (term && !(i.id.toLowerCase().includes(term) || i.customer.toLowerCase().includes(term))) return false;
    if (status && i.status !== status) return false;
    return true;
  };
}
function refreshInvoices() { invoicesTable.data = DB.invoices; invoicesTable.refresh(buildInvoiceFilter()); }

function renderInvoiceRow(inv) {
  const remaining = inv.amount - inv.paidAmount;
  return `
    <tr>
      <td class="cell-primary">${inv.id}</td>
      <td>${inv.customer}</td>
      <td class="cell-muted">${inv.quotationId || "—"}</td>
      <td class="cell-muted">${formatDate(inv.invoiceDate)}</td>
      <td class="cell-muted">${formatDate(inv.dueDate)}</td>
      <td>${formatCurrency(inv.amount)}</td>
      <td class="text-success">${formatCurrency(inv.paidAmount)}</td>
      <td class="${remaining > 0 ? "text-danger" : "text-muted"}">${formatCurrency(remaining)}</td>
      <td>${statusBadge(inv.status)}</td>
      <td class="cell-actions">
        <div class="dropdown" style="display:inline-block;">
          <button class="row-menu-btn">${icon("more")}</button>
          <div class="row-menu-panel">
            <div class="dropdown-item" data-i-act="preview" data-i-id="${inv.id}">${icon("eye")} View / Preview</div>
            <div class="dropdown-item" data-i-act="edit" data-i-id="${inv.id}">${icon("edit")} Edit</div>
            ${inv.status !== "Paid" ? `<div class="dropdown-item" data-i-act="pay" data-i-id="${inv.id}">${icon("payments")} Record Payment</div>` : ""}
            <div class="dropdown-item" data-i-act="download" data-i-id="${inv.id}">${icon("download")} Download</div>
            <div class="dropdown-item danger" data-i-act="delete" data-i-id="${inv.id}">${icon("trash")} Delete</div>
          </div>
        </div>
      </td>
    </tr>`;
}

document.addEventListener("click", (e) => {
  const item = e.target.closest("[data-i-act]");
  if (!item) return;
  const id = item.dataset.iId;
  const act = item.dataset.iAct;
  if (act === "preview") openInvoicePreview(id);
  if (act === "edit") openInvoiceModal(id);
  if (act === "pay") openPaymentModal(id);
  if (act === "download") showToast("Invoice PDF downloaded (simulated).", "success");
  if (act === "delete") {
    confirmAction({ title: "Delete Invoice", message: `Delete invoice ${id}? This cannot be undone.`, onConfirm: () => {
      const idx = DB.invoices.findIndex(x => x.id === id);
      if (idx > -1) DB.invoices.splice(idx, 1);
      saveDB(); showToast("Invoice deleted.", "success"); document.dispatchEvent(new CustomEvent("invoice:saved"));
    }});
  }
});

/* ---------------------------- INVOICE MODAL ---------------------------- */

function injectInvoiceModal() {
  if (document.getElementById("invoiceModal")) return;
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.id = "invoiceModal";
  backdrop.innerHTML = `
    <div class="modal modal-lg">
      <div class="modal-header"><h3 id="invoiceModalTitle">Create Invoice</h3><button class="modal-close" data-close-modal>${icon("x")}</button></div>
      <div class="modal-body">
        <input type="hidden" id="invoiceIdInput">
        <div class="form-grid">
          <div class="field" id="if_customer"><label>Customer <span class="required">*</span></label><input class="input" id="invoiceCustomer"><div class="error-msg">Customer is required.</div></div>
          <div class="field"><label>Related Quotation <span class="optional">(optional)</span></label>
            <select class="select-field2" id="invoiceQuotation"><option value="">None</option>${DB.quotations.map(q => `<option value="${q.id}">${q.id} — ${q.customer}</option>`).join("")}</select>
          </div>
          <div class="field"><label>Invoice Date</label><input class="input" type="date" id="invoiceDate"></div>
          <div class="field"><label>Due Date</label><input class="input" type="date" id="invoiceDueDate"></div>
          <div class="field" id="if_amount"><label>Amount (₹) <span class="required">*</span></label><input class="input" type="number" min="0" id="invoiceAmount"><div class="error-msg">Please enter a valid amount.</div></div>
          <div class="field"><label>Paid Amount (₹)</label><input class="input" type="number" min="0" id="invoicePaidAmount"></div>
          <div class="field"><label>Status</label>
            <select class="select-field2" id="invoiceStatus"><option>Draft</option><option>Sent</option><option>Partially Paid</option><option>Paid</option><option>Overdue</option></select>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" data-close-modal>Cancel</button>
        <button class="btn btn-primary" id="invoiceSaveBtn"><span class="btn-label">Save Invoice</span></button>
      </div>
    </div>`;
  document.body.appendChild(backdrop);

  document.getElementById("invoiceQuotation").addEventListener("change", (e) => {
    const q = DB.quotations.find(x => x.id === e.target.value);
    if (q) { document.getElementById("invoiceCustomer").value = q.customer; document.getElementById("invoiceAmount").value = q.amount; }
  });

  document.getElementById("invoiceSaveBtn").addEventListener("click", () => {
    let valid = true;
    const custOk = !!document.getElementById("invoiceCustomer").value.trim();
    document.getElementById("if_customer").classList.toggle("has-error", !custOk);
    if (!custOk) valid = false;
    const amt = Number(document.getElementById("invoiceAmount").value);
    document.getElementById("if_amount").classList.toggle("has-error", !(amt > 0));
    if (!(amt > 0)) valid = false;
    if (!valid) return;

    const btn = document.getElementById("invoiceSaveBtn");
    setBtnLoading(btn, true);
    setTimeout(() => {
      const id = document.getElementById("invoiceIdInput").value;
      const payload = {
        customer: document.getElementById("invoiceCustomer").value.trim(),
        quotationId: document.getElementById("invoiceQuotation").value,
        invoiceDate: document.getElementById("invoiceDate").value,
        dueDate: document.getElementById("invoiceDueDate").value,
        amount: amt,
        paidAmount: Number(document.getElementById("invoicePaidAmount").value) || 0,
        status: document.getElementById("invoiceStatus").value,
      };
      if (id) {
        Object.assign(DB.invoices.find(x => x.id === id), payload);
        showToast("Invoice updated successfully.", "success");
      } else {
        DB.invoices.unshift({ id: nextId("INV", DB.invoices), ...payload });
        showToast("Invoice created successfully.", "success");
      }
      saveDB();
      setBtnLoading(btn, false);
      closeModal("invoiceModal");
      document.dispatchEvent(new CustomEvent("invoice:saved"));
    }, 600);
  });
}

function openInvoiceModal(invoiceId) {
  injectInvoiceModal();
  document.querySelectorAll("#invoiceModal .field").forEach(f => f.classList.remove("has-error"));
  document.getElementById("invoiceIdInput").value = invoiceId || "";
  if (invoiceId) {
    const inv = DB.invoices.find(x => x.id === invoiceId);
    document.getElementById("invoiceModalTitle").textContent = `Edit Invoice — ${inv.id}`;
    document.getElementById("invoiceCustomer").value = inv.customer;
    document.getElementById("invoiceQuotation").value = inv.quotationId || "";
    document.getElementById("invoiceDate").value = inv.invoiceDate;
    document.getElementById("invoiceDueDate").value = inv.dueDate;
    document.getElementById("invoiceAmount").value = inv.amount;
    document.getElementById("invoicePaidAmount").value = inv.paidAmount;
    document.getElementById("invoiceStatus").value = inv.status;
  } else {
    document.getElementById("invoiceModalTitle").textContent = "Create Invoice";
    document.getElementById("invoiceCustomer").value = "";
    document.getElementById("invoiceQuotation").value = "";
    document.getElementById("invoiceDate").value = "2026-09-10";
    const due = new Date(2026, 8, 24);
    document.getElementById("invoiceDueDate").value = due.toISOString().slice(0, 10);
    document.getElementById("invoiceAmount").value = "";
    document.getElementById("invoicePaidAmount").value = 0;
    document.getElementById("invoiceStatus").value = "Draft";
  }
  openModal("invoiceModal");
}

/* ---------------------------- PREVIEW MODAL ---------------------------- */
function injectInvoicePreviewModal() {
  if (document.getElementById("invoicePreviewModal")) return;
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.id = "invoicePreviewModal";
  backdrop.innerHTML = `<div class="modal modal-lg"><div class="modal-header"><h3>Invoice Preview</h3><button class="modal-close" data-close-modal>${icon("x")}</button></div><div class="modal-body" id="invoicePreviewBody"></div><div class="modal-footer"><button class="btn btn-secondary" data-close-modal>Close</button><button class="btn btn-primary" id="invPreviewDownloadBtn">${icon("download")} Download PDF</button></div></div>`;
  document.body.appendChild(backdrop);
  document.getElementById("invPreviewDownloadBtn").addEventListener("click", () => showToast("Invoice PDF downloaded (simulated).", "success"));
}
function openInvoicePreview(invoiceId) {
  const inv = DB.invoices.find(x => x.id === invoiceId);
  if (!inv) return;
  injectInvoicePreviewModal();
  const remaining = inv.amount - inv.paidAmount;
  document.getElementById("invoicePreviewBody").innerHTML = `
    <div class="flex justify-between items-center mb-5">
      <div><div style="font-weight:700;font-size:18px;">${DB.settings.general.companyName}</div><div class="text-faint fs-sm">${DB.settings.general.address}</div></div>
      <div style="text-align:right;"><div class="fw-700">Invoice ${inv.id}</div><div class="text-faint fs-sm">Date: ${formatDate(inv.invoiceDate)}</div><div class="text-faint fs-sm">Due: ${formatDate(inv.dueDate)}</div></div>
    </div>
    <div class="mb-4"><div class="text-faint fs-xs fw-600" style="text-transform:uppercase;">Billed To</div><div class="fw-600">${escapeHtml(inv.customer)}</div></div>
    <div class="totals-box" style="width:100%;">
      <div class="totals-row"><span>Invoice Amount</span><span>${formatCurrency(inv.amount)}</span></div>
      <div class="totals-row"><span>Paid Amount</span><span class="text-success">${formatCurrency(inv.paidAmount)}</span></div>
      <div class="totals-row grand"><span>Balance Due</span><span>${formatCurrency(remaining)}</span></div>
    </div>
    <div class="mt-4">${statusBadge(inv.status)}</div>`;
  openModal("invoicePreviewModal");
}

document.addEventListener("layout:ready", renderInvoicesPage);
