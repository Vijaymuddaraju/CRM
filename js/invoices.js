/* ==========================================================================
   Invoices — live Tax Invoice document editor
   Same approach as Purchase Orders: Create/Edit Invoice opens the actual
   styled GST tax-invoice document (maroon/blue, bordered grid) with every
   field editable in place. "Preview" shows a read-only, print-ready snapshot.
   ========================================================================== */

let invoicesTable;
let invItems = [];

function renderInvoicesPage() {
  populateInvoiceFilters();
  invoicesTable = createTableController({
    data: DB.invoices, pageSize: 8,
    mountBodyId: "invoicesTableBody", mountPaginationId: "invoicesPagination", mountCountId: "invoicesCount",
    filterFn: buildInvoiceFilter(), renderRow: renderInvoiceRow,
  });
  invoicesTable.render();

  document.getElementById("addInvoiceBtn").addEventListener("click", () => openInvoiceDocModal());
  ["invoiceSearchInput", "invoiceStatusFilter"].forEach(id => {
    document.getElementById(id).addEventListener(id === "invoiceSearchInput" ? "input" : "change", debounce(refreshInvoices, 150));
  });

  injectInvoiceDocModal();
  injectInvoicePreviewModal();

  if (qs("id")) openInvoicePreview(qs("id"));

  document.addEventListener("invoice:saved", refreshInvoices);
  document.addEventListener("payment:saved", refreshInvoices);
}

function populateInvoiceFilters() {
  document.getElementById("invoiceStatusFilter").innerHTML = `<option value="">All Statuses</option>` + INVOICE_STATUSES.map(s => `<option value="${s}">${s}</option>`).join("");
}
function buildInvoiceFilter() {
  const term = document.getElementById("invoiceSearchInput").value.trim().toLowerCase();
  const status = document.getElementById("invoiceStatusFilter").value;
  return (i) => {
    if (term && !(i.id.toLowerCase().includes(term) || i.customer.toLowerCase().includes(term))) return false;
    if (status && i.status !== status) return false;
    return true;
  };
}
function refreshInvoices() { invoicesTable.data = DB.invoices; invoicesTable.refresh(buildInvoiceFilter()); }

function renderInvoiceRow(i) {
  const remaining = i.amount - i.paidAmount;
  return `<tr>
    <td class="cell-primary">${i.id}</td>
    <td>${escapeHtml(i.customer)}</td>
    <td class="cell-muted">${i.quotationId || "—"}</td>
    <td class="cell-muted">${formatDate(i.invoiceDate)}</td>
    <td class="cell-muted">${formatDate(i.dueDate)}</td>
    <td>${formatCurrency(i.amount)}</td>
    <td class="cell-muted">${formatCurrency(i.paidAmount)}</td>
    <td class="cell-muted">${formatCurrency(remaining)}</td>
    <td>${statusBadge(i.status)}</td>
    <td class="cell-actions">
      <div class="dropdown" style="display:inline-block;">
        <button class="row-menu-btn">${icon("more")}</button>
        <div class="row-menu-panel">
          <div class="dropdown-item" data-i-act="preview" data-i-id="${i.id}">${icon("eye")} Preview</div>
          <div class="dropdown-item" data-i-act="edit" data-i-id="${i.id}">${icon("edit")} Edit</div>
          <div class="dropdown-item" data-i-act="download" data-i-id="${i.id}">${icon("download")} Download PDF</div>
          ${i.status !== "Paid" ? `<div class="dropdown-item" data-i-act="pay" data-i-id="${i.id}">${icon("rupee")} Record Payment</div>` : ""}
          <div class="dropdown-item danger" data-i-act="delete" data-i-id="${i.id}">${icon("trash")} Delete</div>
        </div>
      </div>
    </td>
  </tr>`;
}

document.addEventListener("click", (e) => {
  const item = e.target.closest("[data-i-act]");
  if (!item) return;
  const id = item.dataset.iId, act = item.dataset.iAct;
  if (act === "preview") openInvoicePreview(id);
  if (act === "edit") openInvoiceDocModal(id);
  if (act === "download") { openInvoicePreview(id); setTimeout(() => window.print(), 300); }
  if (act === "pay") openPaymentModal(id);
  if (act === "delete") confirmAction({ title: "Delete Invoice", message: `Delete invoice ${id}? This cannot be undone.`, onConfirm: () => {
    const idx = DB.invoices.findIndex(x => x.id === id);
    if (idx > -1) DB.invoices.splice(idx, 1);
    saveDB(); showToast("Invoice deleted.", "success"); document.dispatchEvent(new CustomEvent("invoice:saved"));
  }});
});

/* ---------------------------- LIVE TAX INVOICE EDITOR MODAL ---------------------------- */

function injectInvoiceDocModal() {
  if (document.getElementById("invoiceDocModal")) return;
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.id = "invoiceDocModal";
  backdrop.innerHTML = `
    <div class="modal modal-full">
      <div class="modal-header"><h3 id="invoiceDocModalTitle">Create Invoice</h3><button class="modal-close" data-close-modal>${icon("x")}</button></div>
      <div class="modal-body">
        <input type="hidden" id="invDocIdInput">

        <div class="inv-meta-bar">
          <div class="field"><label>Workflow Status</label><select class="select-field2" id="invStatus">${INVOICE_STATUSES.map(s => `<option>${s}</option>`).join("")}</select></div>
          <div class="field"><label>Related Quotation <span class="optional">(optional)</span></label>
            <select class="select-field2" id="invQuotation"><option value="">None</option>${DB.quotations.map(q => `<option value="${q.id}">${q.id} — ${q.customer}</option>`).join("")}</select>
          </div>
          <div class="field"><label>Due Date</label><input class="input" type="date" id="invDueDate"></div>
          <div class="field"><label>Paid Amount (₹)</label><input class="input" type="number" min="0" id="invPaidAmount"></div>
          <div class="inv-tax-mode-row" id="invTaxModeRow">
            <label><input type="radio" name="invTaxMode" value="NONE"> No Tax</label>
            <label><input type="radio" name="invTaxMode" value="CGST_SGST"> CGST + SGST</label>
            <label><input type="radio" name="invTaxMode" value="IGST"> IGST</label>
          </div>
        </div>

        <div class="inv-doc" id="invDocSheet">
          <div class="inv-doc-brand">
            <input class="inv-doc-company-name" id="invCompanyName" placeholder="Company Name" style="text-align:center;">
            <div class="inv-doc-iso">ISO 9001 CERTIFIED</div>
          </div>
          <div class="inv-doc-addrline"><b>Office &amp; Works:</b> <input id="invCompanyAddress" placeholder="Company address" style="width:auto;min-width:60%;"></div>
          <div class="inv-doc-addrline2"><b>E-Mail:</b> <input id="invCompanyEmailLine" type="email" placeholder="Email address" style="width:auto;min-width:40%;"></div>

          <div class="inv-doc-title-row">
            <input class="inv-doc-title" id="invTitleInput" value="Tax Invoice" style="width:220px;">
            <div class="inv-doc-copytype">
              <select id="invCopyType">${INVOICE_COPY_TYPES.map(c => `<option value="${c}">${c}</option>`).join("")}</select>
            </div>
          </div>

          <div class="inv-doc-meta-row">
            <table class="inv-doc-meta-table">
              <tr><td>Invoice No.</td><td><input id="invNumberDisplay"></td></tr>
              <tr><td>Date</td><td><input type="date" id="invDate"></td></tr>
              <tr><td>State Code</td><td><input id="invStateCode" placeholder="KA-29"></td></tr>
              <tr><td>Our GSTIN</td><td><input id="invCompanyGST" placeholder="GST Number"></td></tr>
              <tr><td>W.O. Ref <span class="optional">(optional)</span></td><td><input id="invWoRef"></td></tr>
              <tr><td>E-Way Bill No. <span class="optional">(optional)</span></td><td><input id="invEwayBillNo"></td></tr>
            </table>
            <table class="inv-doc-meta-table">
              <tr><td>Customer PO No. <span class="optional">(optional)</span></td><td><input id="invCustomerPoNo"></td></tr>
              <tr><td>Customer PO Date <span class="optional">(optional)</span></td><td><input type="date" id="invCustomerPoDate"></td></tr>
              <tr><td>Customer GST No. <span class="optional">(optional)</span></td><td><input id="invCustomerGstNo"></td></tr>
              <tr><td>Contact / Department</td><td><input id="invCompanyContact"></td></tr>
            </table>
          </div>

          <div class="inv-doc-parties">
            <div class="inv-doc-party">
              <div class="inv-doc-party-title">Invoice to</div>
              <input id="invCustomer" placeholder="Customer / Company Name *" style="font-weight:700;">
              <textarea id="invBillToAddress" rows="3" placeholder="Billing address"></textarea>
              <input id="invBillToContact" placeholder="Contact person + phone">
              <input id="invBillToStateCode" placeholder="State Code">
              <div class="inv-doc-error" id="invCustomerError" style="display:none;">Customer name is required.</div>
            </div>
            <div class="inv-doc-party">
              <div class="inv-doc-party-title">Delivery to</div>
              <label class="flex items-center gap-2 fs-sm mb-2"><input type="checkbox" id="invShipSame" style="width:auto;"> Same as billing address</label>
              <input id="invShipToName" placeholder="Recipient name">
              <textarea id="invShipToAddress" rows="3" placeholder="Delivery address"></textarea>
              <input id="invShipToContact" placeholder="Contact person + phone">
              <input id="invShipToStateCode" placeholder="State Code">
            </div>
            <div class="inv-doc-party">
              <div class="inv-doc-party-title">Terms of Delivery</div>
              <input id="invTermsOfDelivery" placeholder="e.g. Prepaid">
              <input id="invModeOfDespatch" placeholder="Mode of Despatch">
              <textarea id="invTransporterDetails" rows="2" placeholder="Transporter details (optional)"></textarea>
            </div>
          </div>

          <table class="inv-doc-items-table">
            <thead><tr><th style="width:4%;">Sl.No.</th><th>Particulars</th><th style="width:8%;">HSN</th><th style="width:8%;">Unit</th><th class="num" style="width:8%;">Qty</th><th class="num" style="width:11%;">Rate (₹)</th><th class="num" style="width:8%;">Disc %</th><th class="num" style="width:12%;">Total</th><th style="width:30px;"></th></tr></thead>
            <tbody id="invItemsBody"></tbody>
          </table>
          <div class="add-row-btn" id="addInvItemBtn">${icon("plus")} Add Item</div>

          <div class="inv-doc-bottom-grid" style="margin-top:14px;">
            <table class="inv-doc-tax-table" id="invTaxTable"></table>
            <div class="inv-doc-note">Note: Once Goods Sold cannot be taken Back or exchanged</div>
            <table class="inv-doc-summary-table" id="invSummaryTable"></table>
          </div>

          <div class="inv-doc-words" id="invWordsBox"></div>

          <div class="inv-doc-termscert">
            <div class="inv-doc-terms">
              <div class="inv-doc-terms-label">Terms and Condition:</div>
              <textarea id="invTermsAndConditions" rows="2"></textarea>
            </div>
            <div class="inv-doc-cert">
              <div class="inv-doc-cert-label">Certification</div>
              <textarea id="invCertificationText" rows="4"></textarea>
            </div>
          </div>

          <div class="inv-doc-bank-grid">
            <table class="inv-doc-bank-table">
              <tr><td colspan="2" style="text-align:center;font-weight:800;">Bank Details</td></tr>
              <tr><td>Name</td><td><input id="invBankAccountHolder"></td></tr>
              <tr><td>Bank</td><td><input id="invBankName"></td></tr>
              <tr><td>A/c Type</td><td><input id="invBankAccountType"></td></tr>
              <tr><td>A/c No.</td><td><input id="invBankAccountNo"></td></tr>
              <tr><td>IFSC</td><td><input id="invBankIFSC"></td></tr>
              <tr><td>Branch</td><td><input id="invBankBranch"></td></tr>
            </table>
            <div class="inv-doc-interest">
              <textarea id="invInterestNote" rows="3"></textarea>
              <input id="invJurisdictionText" class="inv-doc-jurisdiction">
            </div>
            <div class="inv-doc-sign">
              <div>For <span id="invSignCompanyName"></span></div>
              <div class="inv-doc-sign-line"></div>
              <input id="invAuthorizedName" placeholder="Name" style="text-align:center;font-weight:700;">
              <input id="invAuthorizedDesignation" placeholder="Designation" style="text-align:center;">
              <div class="fs-xs text-faint">Authorised by</div>
            </div>
          </div>

          <div class="inv-doc-footer">E &amp; O.E.</div>
        </div>

        <div class="section-title mt-4 mb-2">Internal Notes <span class="optional" style="text-transform:none;font-weight:400;">(not shown on the printed document)</span></div>
        <div class="form-grid">
          <div class="field span-2"><textarea class="textarea" id="invNotes" placeholder="Internal notes..."></textarea></div>
        </div>
      </div>
      <div class="modal-footer spread">
        <button class="btn btn-ghost" id="invPreviewFromEditorBtn" type="button">${icon("eye")} Preview / Print</button>
        <div class="flex gap-2">
          <button class="btn btn-secondary" data-close-modal>Cancel</button>
          <button class="btn btn-primary" id="invDocSaveBtn"><span class="btn-label">Save Invoice</span></button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(backdrop);

  document.getElementById("addInvItemBtn").addEventListener("click", () => { invItems.push({ desc: "", hsn: "", unit: "Set", qty: 1, rate: 0, discount: 0 }); renderInvoiceItems(); updateInvoiceTotals(); });
  document.querySelectorAll('#invTaxModeRow input[name="invTaxMode"]').forEach(r => r.addEventListener("change", () => renderInvoiceTotals()));
  document.getElementById("invQuotation").addEventListener("change", (e) => prefillFromQuotation(e.target.value));
  document.getElementById("invShipSame").addEventListener("change", toggleInvShipToFields);
  document.getElementById("invCompanyName").addEventListener("input", (e) => { document.getElementById("invSignCompanyName").textContent = e.target.value; });
  document.getElementById("invDocSaveBtn").addEventListener("click", submitInvoiceDocForm);
  document.getElementById("invPreviewFromEditorBtn").addEventListener("click", () => {
    renderInvoicePreviewContent(collectInvoiceDraft());
    openModal("invoicePreviewModal");
  });
}

function toggleInvShipToFields() {
  const same = document.getElementById("invShipSame").checked;
  ["invShipToName", "invShipToAddress", "invShipToContact", "invShipToStateCode"].forEach(id => {
    document.getElementById(id).disabled = same;
  });
}

function prefillFromQuotation(quoteId) {
  const q = DB.quotations.find(x => x.id === quoteId);
  if (!q) return;
  if (!document.getElementById("invCustomer").value) document.getElementById("invCustomer").value = q.customer;
  if (!invItems.length || invItems.every(it => !it.desc)) {
    invItems = q.items.map(it => ({ desc: it.desc, hsn: "", unit: "Set", qty: it.qty, rate: it.rate, discount: it.discount || 0 }));
    renderInvoiceItems();
    updateInvoiceTotals();
  }
}

/* ---------- Items (focus preserved across re-render, same pattern as PO) ---------- */
function renderInvoiceItems() {
  const body = document.getElementById("invItemsBody");
  const active = document.activeElement;
  const activeIdx = active && active.closest && active.closest("tr") ? active.closest("tr").dataset.idx : null;
  const activeField = active && active.dataset ? active.dataset.field : null;
  const activeSelStart = active && typeof active.selectionStart === "number" ? active.selectionStart : null;

  body.innerHTML = invItems.map((it, i) => `
    <tr data-idx="${i}">
      <td style="text-align:center;">${i + 1}</td>
      <td class="desc"><input type="text" value="${escapeHtml(it.desc)}" data-field="desc" placeholder="Item / service description"></td>
      <td><input type="text" value="${escapeHtml(it.hsn)}" data-field="hsn" placeholder="HSN/SAC"></td>
      <td><input type="text" value="${escapeHtml(it.unit)}" data-field="unit" placeholder="Set"></td>
      <td class="num"><input type="number" min="0" value="${it.qty}" data-field="qty"></td>
      <td class="num"><input type="number" min="0" value="${it.rate}" data-field="rate"></td>
      <td class="num"><input type="number" min="0" max="100" value="${it.discount}" data-field="discount"></td>
      <td class="num">${formatCurrency(invItemLineTotal(it))}</td>
      <td><button class="remove-row-btn" data-remove="${i}">${icon("trash")}</button></td>
    </tr>`).join("");

  body.querySelectorAll("input").forEach(input => {
    input.addEventListener("input", (e) => {
      const idx = e.target.closest("tr").dataset.idx;
      const field = e.target.dataset.field;
      invItems[idx][field] = (field === "desc" || field === "hsn" || field === "unit") ? e.target.value : Number(e.target.value) || 0;
      renderInvoiceItems();
      updateInvoiceTotals();
    });
  });
  body.querySelectorAll("[data-remove]").forEach(btn => {
    btn.addEventListener("click", () => { invItems.splice(Number(btn.dataset.remove), 1); renderInvoiceItems(); updateInvoiceTotals(); });
  });

  if (activeIdx !== null && activeField) {
    const el = body.querySelector(`tr[data-idx="${activeIdx}"] [data-field="${activeField}"]`);
    if (el) {
      el.focus();
      if (activeSelStart !== null && el.setSelectionRange) { try { el.setSelectionRange(activeSelStart, activeSelStart); } catch (e) {} }
    }
  }
}

function invItemLineTotal(it) { return it.qty * it.rate * (1 - (it.discount || 0) / 100); }

/* ---------- Totals: skeleton rebuilt on tax-mode change, amounts patched in place ---------- */
function currentInvoiceTaxMode() {
  const el = document.querySelector('#invTaxModeRow input[name="invTaxMode"]:checked');
  return el ? el.value : "NONE";
}

function renderInvoiceTotals(overrides) {
  overrides = overrides || {};
  const mode = currentInvoiceTaxMode();
  const cgstPct = mode === "CGST_SGST" ? (overrides.cgstPercent ?? 9) : 0;
  const sgstPct = mode === "CGST_SGST" ? (overrides.sgstPercent ?? 9) : 0;
  const igstPct = mode === "IGST" ? (overrides.igstPercent ?? 18) : 0;

  document.getElementById("invTaxTable").innerHTML = `
    <tr><th>Tax Head</th>${mode === "CGST_SGST" ? "<th>CGST</th><th>SGST</th>" : ""}${mode === "IGST" ? "<th>IGST</th>" : ""}${mode === "NONE" ? "<th>—</th>" : ""}</tr>
    <tr><td>%</td>${mode === "CGST_SGST" ? `<td><input type="number" id="invCgstPercent" min="0" max="100" value="${cgstPct}"></td><td><input type="number" id="invSgstPercent" min="0" max="100" value="${sgstPct}"></td>` : ""}${mode === "IGST" ? `<td><input type="number" id="invIgstPercent" min="0" max="100" value="${igstPct}"></td>` : ""}${mode === "NONE" ? "<td>0%</td>" : ""}</tr>
    <tr><td>Value</td>${mode === "CGST_SGST" ? `<td id="invCgstAmt"></td><td id="invSgstAmt"></td>` : ""}${mode === "IGST" ? `<td id="invIgstAmt"></td>` : ""}${mode === "NONE" ? "<td>—</td>" : ""}</tr>`;

  document.getElementById("invSummaryTable").innerHTML = `
    <tr><td>Taxable Amount</td><td id="invSubtotalAmt"></td></tr>
    <tr><td>Total GST</td><td id="invTotalGstAmt"></td></tr>
    <tr class="grand"><td>Net Amount</td><td id="invNetAmt"></td></tr>
    <tr><td>Rounded To</td><td id="invRoundedAmt"></td></tr>`;

  ["invCgstPercent", "invSgstPercent", "invIgstPercent"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", updateInvoiceTotals);
  });

  return updateInvoiceTotals();
}

function invTotalsFieldValue(id) {
  const el = document.getElementById(id);
  return el ? (Number(el.value) || 0) : 0;
}

function updateInvoiceTotals() {
  const subtotal = invItems.reduce((s, it) => s + invItemLineTotal(it), 0);
  const mode = currentInvoiceTaxMode();
  const cgstPct = mode === "CGST_SGST" ? invTotalsFieldValue("invCgstPercent") : 0;
  const sgstPct = mode === "CGST_SGST" ? invTotalsFieldValue("invSgstPercent") : 0;
  const igstPct = mode === "IGST" ? invTotalsFieldValue("invIgstPercent") : 0;
  const cgstAmt = subtotal * (cgstPct / 100);
  const sgstAmt = subtotal * (sgstPct / 100);
  const igstAmt = subtotal * (igstPct / 100);
  const totalGst = cgstAmt + sgstAmt + igstAmt;
  const net = subtotal + totalGst;
  const rounded = Math.round(net);

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set("invSubtotalAmt", formatCurrency(subtotal));
  set("invCgstAmt", formatCurrency(cgstAmt));
  set("invSgstAmt", formatCurrency(sgstAmt));
  set("invIgstAmt", formatCurrency(igstAmt));
  set("invTotalGstAmt", formatCurrency(totalGst));
  set("invNetAmt", formatCurrency(net));
  set("invRoundedAmt", formatCurrency(rounded));
  const wordsBox = document.getElementById("invWordsBox");
  if (wordsBox) wordsBox.textContent = `Amount In Words: ${amountInWords(rounded)}`;

  return { subtotal, cgstPct, sgstPct, igstPct, cgstAmt, sgstAmt, igstAmt, totalGst, net, rounded, mode };
}

function openInvoiceDocModal(id) {
  injectInvoiceDocModal();
  document.getElementById("invCustomerError").style.display = "none";
  document.getElementById("invDocIdInput").value = id || "";
  const g = DB.settings.general;

  if (id) {
    const inv = DB.invoices.find(x => x.id === id);
    document.getElementById("invoiceDocModalTitle").textContent = `Edit Invoice — ${inv.id}`;
    document.getElementById("invStatus").value = inv.status;
    document.getElementById("invQuotation").value = inv.quotationId || "";
    document.getElementById("invDueDate").value = inv.dueDate;
    document.getElementById("invPaidAmount").value = inv.paidAmount || 0;
    document.getElementById("invCompanyName").value = inv.companyName || g.companyName;
    document.getElementById("invSignCompanyName").textContent = inv.companyName || g.companyName;
    document.getElementById("invCompanyAddress").value = inv.companyAddress || g.address;
    document.getElementById("invCompanyEmailLine").value = inv.companyEmail || g.companyEmail;
    document.getElementById("invTitleInput").value = "Tax Invoice";
    document.getElementById("invCopyType").value = inv.copyType || "Original for Buyer";
    document.getElementById("invNumberDisplay").value = inv.id;
    document.getElementById("invDate").value = inv.invoiceDate;
    document.getElementById("invStateCode").value = inv.stateCode || g.stateCode || "";
    document.getElementById("invCompanyGST").value = inv.companyGST || g.gst || "";
    document.getElementById("invWoRef").value = inv.woRef || "";
    document.getElementById("invEwayBillNo").value = inv.ewayBillNo || "";
    document.getElementById("invCustomerPoNo").value = inv.customerPoNo || "";
    document.getElementById("invCustomerPoDate").value = inv.customerPoDate || "";
    document.getElementById("invCustomerGstNo").value = inv.customerGstNo || "";
    document.getElementById("invCompanyContact").value = inv.companyContact || g.contactPerson || "";
    document.getElementById("invCustomer").value = inv.customer;
    document.getElementById("invBillToAddress").value = inv.billToAddress || "";
    document.getElementById("invBillToContact").value = inv.billToContact || "";
    document.getElementById("invBillToStateCode").value = inv.billToStateCode || "";
    document.getElementById("invShipSame").checked = inv.shipToSameAsBillTo !== false;
    document.getElementById("invShipToName").value = inv.shipToName || "";
    document.getElementById("invShipToAddress").value = inv.shipToAddress || "";
    document.getElementById("invShipToContact").value = inv.shipToContact || "";
    document.getElementById("invShipToStateCode").value = inv.shipToStateCode || "";
    document.getElementById("invTermsOfDelivery").value = inv.termsOfDelivery || "";
    document.getElementById("invModeOfDespatch").value = inv.modeOfDespatch || "";
    document.getElementById("invTransporterDetails").value = inv.transporterDetails || "";
    invItems = (inv.items && inv.items.length ? inv.items : [{ desc: "", hsn: "", unit: "Set", qty: 1, rate: 0, discount: 0 }]).map(i => ({ ...i }));
    document.querySelector(`#invTaxModeRow input[value="${inv.taxMode || "NONE"}"]`).checked = true;
    document.getElementById("invTermsAndConditions").value = inv.termsAndConditions || DEFAULT_INVOICE_TERMS;
    document.getElementById("invCertificationText").value = inv.certificationText || DEFAULT_INVOICE_CERTIFICATION;
    document.getElementById("invBankAccountHolder").value = inv.bankAccountHolder || g.bankAccountHolder || "";
    document.getElementById("invBankName").value = inv.bankName || g.bankName || "";
    document.getElementById("invBankAccountType").value = inv.bankAccountType || g.bankAccountType || "";
    document.getElementById("invBankAccountNo").value = inv.bankAccountNo || g.bankAccountNo || "";
    document.getElementById("invBankIFSC").value = inv.bankIFSC || g.bankIFSC || "";
    document.getElementById("invBankBranch").value = inv.bankBranch || g.bankBranch || "";
    document.getElementById("invInterestNote").value = inv.interestNote || DEFAULT_INVOICE_INTEREST_NOTE;
    document.getElementById("invJurisdictionText").value = inv.jurisdictionText || DEFAULT_INVOICE_JURISDICTION;
    document.getElementById("invAuthorizedName").value = inv.authorizedName || "";
    document.getElementById("invAuthorizedDesignation").value = inv.authorizedDesignation || "";
    document.getElementById("invNotes").value = inv.notes || "";
    renderInvoiceTotals({ cgstPercent: inv.cgstPercent || 0, sgstPercent: inv.sgstPercent || 0, igstPercent: inv.igstPercent || 0 });
  } else {
    document.getElementById("invoiceDocModalTitle").textContent = "Create Invoice";
    document.getElementById("invStatus").value = "Draft";
    document.getElementById("invQuotation").value = "";
    document.getElementById("invDueDate").value = "";
    document.getElementById("invPaidAmount").value = 0;
    document.getElementById("invCompanyName").value = g.companyName;
    document.getElementById("invSignCompanyName").textContent = g.companyName;
    document.getElementById("invCompanyAddress").value = g.address;
    document.getElementById("invCompanyEmailLine").value = g.companyEmail;
    document.getElementById("invTitleInput").value = "Tax Invoice";
    document.getElementById("invCopyType").value = "Original for Buyer";
    document.getElementById("invNumberDisplay").value = nextId("INV", DB.invoices);
    document.getElementById("invDate").value = "2026-09-10";
    document.getElementById("invStateCode").value = g.stateCode || "";
    document.getElementById("invCompanyGST").value = g.gst || "";
    document.getElementById("invWoRef").value = "";
    document.getElementById("invEwayBillNo").value = "";
    document.getElementById("invCustomerPoNo").value = "";
    document.getElementById("invCustomerPoDate").value = "";
    document.getElementById("invCustomerGstNo").value = "";
    document.getElementById("invCompanyContact").value = g.contactPerson || "";
    document.getElementById("invCustomer").value = "";
    document.getElementById("invBillToAddress").value = "";
    document.getElementById("invBillToContact").value = "";
    document.getElementById("invBillToStateCode").value = "";
    document.getElementById("invShipSame").checked = true;
    document.getElementById("invShipToName").value = "";
    document.getElementById("invShipToAddress").value = "";
    document.getElementById("invShipToContact").value = "";
    document.getElementById("invShipToStateCode").value = "";
    document.getElementById("invTermsOfDelivery").value = "As per agreement";
    document.getElementById("invModeOfDespatch").value = "";
    document.getElementById("invTransporterDetails").value = "";
    invItems = [{ desc: "", hsn: "", unit: "Set", qty: 1, rate: 0, discount: 0 }];
    document.querySelector('#invTaxModeRow input[value="CGST_SGST"]').checked = true;
    document.getElementById("invTermsAndConditions").value = DEFAULT_INVOICE_TERMS;
    document.getElementById("invCertificationText").value = DEFAULT_INVOICE_CERTIFICATION;
    document.getElementById("invBankAccountHolder").value = g.bankAccountHolder || "";
    document.getElementById("invBankName").value = g.bankName || "";
    document.getElementById("invBankAccountType").value = g.bankAccountType || "";
    document.getElementById("invBankAccountNo").value = g.bankAccountNo || "";
    document.getElementById("invBankIFSC").value = g.bankIFSC || "";
    document.getElementById("invBankBranch").value = g.bankBranch || "";
    document.getElementById("invInterestNote").value = DEFAULT_INVOICE_INTEREST_NOTE;
    document.getElementById("invJurisdictionText").value = DEFAULT_INVOICE_JURISDICTION;
    document.getElementById("invAuthorizedName").value = "";
    document.getElementById("invAuthorizedDesignation").value = "";
    document.getElementById("invNotes").value = "";
    renderInvoiceTotals({ cgstPercent: 9, sgstPercent: 9, igstPercent: 18 });
  }
  toggleInvShipToFields();
  renderInvoiceItems();
  updateInvoiceTotals();
  openModal("invoiceDocModal");
}

function collectInvoiceDraft() {
  const totals = updateInvoiceTotals();
  return {
    quotationId: document.getElementById("invQuotation").value,
    copyType: document.getElementById("invCopyType").value,
    invoiceDate: document.getElementById("invDate").value,
    dueDate: document.getElementById("invDueDate").value,
    woRef: document.getElementById("invWoRef").value.trim(),
    ewayBillNo: document.getElementById("invEwayBillNo").value.trim(),
    customerPoNo: document.getElementById("invCustomerPoNo").value.trim(),
    customerPoDate: document.getElementById("invCustomerPoDate").value,
    stateCode: document.getElementById("invStateCode").value.trim(),
    companyName: document.getElementById("invCompanyName").value.trim(),
    companyAddress: document.getElementById("invCompanyAddress").value.trim(),
    companyGST: document.getElementById("invCompanyGST").value.trim(),
    companyEmail: document.getElementById("invCompanyEmailLine").value.trim(),
    companyContact: document.getElementById("invCompanyContact").value.trim(),
    customer: document.getElementById("invCustomer").value.trim(),
    billToAddress: document.getElementById("invBillToAddress").value.trim(),
    billToContact: document.getElementById("invBillToContact").value.trim(),
    billToStateCode: document.getElementById("invBillToStateCode").value.trim(),
    customerGstNo: document.getElementById("invCustomerGstNo").value.trim(),
    shipToSameAsBillTo: document.getElementById("invShipSame").checked,
    shipToName: document.getElementById("invShipToName").value.trim(),
    shipToAddress: document.getElementById("invShipToAddress").value.trim(),
    shipToContact: document.getElementById("invShipToContact").value.trim(),
    shipToStateCode: document.getElementById("invShipToStateCode").value.trim(),
    termsOfDelivery: document.getElementById("invTermsOfDelivery").value.trim(),
    modeOfDespatch: document.getElementById("invModeOfDespatch").value.trim(),
    transporterDetails: document.getElementById("invTransporterDetails").value.trim(),
    items: invItems.map(i => ({ ...i })),
    taxMode: totals.mode,
    cgstPercent: totals.cgstPct,
    sgstPercent: totals.sgstPct,
    igstPercent: totals.igstPct,
    amount: totals.rounded,
    paidAmount: Number(document.getElementById("invPaidAmount").value) || 0,
    status: document.getElementById("invStatus").value,
    termsAndConditions: document.getElementById("invTermsAndConditions").value.trim(),
    certificationText: document.getElementById("invCertificationText").value.trim(),
    bankAccountHolder: document.getElementById("invBankAccountHolder").value.trim(),
    bankName: document.getElementById("invBankName").value.trim(),
    bankAccountType: document.getElementById("invBankAccountType").value.trim(),
    bankAccountNo: document.getElementById("invBankAccountNo").value.trim(),
    bankIFSC: document.getElementById("invBankIFSC").value.trim(),
    bankBranch: document.getElementById("invBankBranch").value.trim(),
    interestNote: document.getElementById("invInterestNote").value.trim(),
    jurisdictionText: document.getElementById("invJurisdictionText").value.trim(),
    authorizedName: document.getElementById("invAuthorizedName").value.trim(),
    authorizedDesignation: document.getElementById("invAuthorizedDesignation").value.trim(),
    notes: document.getElementById("invNotes").value.trim(),
  };
}

function submitInvoiceDocForm() {
  const customer = document.getElementById("invCustomer").value.trim();
  document.getElementById("invCustomerError").style.display = customer ? "none" : "block";
  if (!customer) { showToast("Please fill all required fields.", "error"); return; }
  if (!invItems.length || invItems.every(it => !it.desc)) { showToast("Please add at least one item.", "error"); return; }

  const btn = document.getElementById("invDocSaveBtn");
  setBtnLoading(btn, true);
  setTimeout(() => {
    const id = document.getElementById("invDocIdInput").value;
    const draft = collectInvoiceDraft();
    if (id) {
      Object.assign(DB.invoices.find(x => x.id === id), draft);
      showToast("Invoice updated successfully.", "success");
    } else {
      DB.invoices.unshift({ id: nextId("INV", DB.invoices), ...draft });
      showToast("Invoice created successfully.", "success");
    }
    saveDB();
    setBtnLoading(btn, false);
    closeModal("invoiceDocModal");
    document.dispatchEvent(new CustomEvent("invoice:saved"));
  }, 600);
}

/* ---------------------------- PREVIEW / PRINT MODAL (read-only snapshot) ---------------------------- */

function injectInvoicePreviewModal() {
  if (document.getElementById("invoicePreviewModal")) return;
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.id = "invoicePreviewModal";
  backdrop.innerHTML = `<div class="modal modal-full">
    <div class="modal-header"><h3>Invoice Preview</h3><button class="modal-close" data-close-modal>${icon("x")}</button></div>
    <div class="modal-body" id="invPreviewBody"></div>
    <div class="modal-footer"><button class="btn btn-secondary" data-close-modal>Close</button><button class="btn btn-primary" id="invPrintBtn">${icon("download")} Print / Download PDF</button></div>
  </div>`;
  document.body.appendChild(backdrop);
  document.getElementById("invPrintBtn").addEventListener("click", () => window.print());
}

function openInvoicePreview(id) {
  const inv = DB.invoices.find(x => x.id === id);
  if (!inv) return;
  injectInvoicePreviewModal();
  renderInvoicePreviewContent(inv);
  openModal("invoicePreviewModal");
}

function renderInvoicePreviewContent(inv) {
  const subtotal = inv.items.reduce((s, it) => s + invItemLineTotal(it), 0);
  const cgstAmt = inv.taxMode === "CGST_SGST" ? subtotal * (inv.cgstPercent / 100) : 0;
  const sgstAmt = inv.taxMode === "CGST_SGST" ? subtotal * (inv.sgstPercent / 100) : 0;
  const igstAmt = inv.taxMode === "IGST" ? subtotal * (inv.igstPercent / 100) : 0;
  const totalGst = cgstAmt + sgstAmt + igstAmt;
  const net = subtotal + totalGst;
  const rounded = Math.round(net);
  const shipName = inv.shipToSameAsBillTo === false ? inv.shipToName : inv.customer;
  const shipAddress = inv.shipToSameAsBillTo === false ? inv.shipToAddress : inv.billToAddress;
  const shipContact = inv.shipToSameAsBillTo === false ? inv.shipToContact : inv.billToContact;
  const shipState = inv.shipToSameAsBillTo === false ? inv.shipToStateCode : inv.billToStateCode;

  document.getElementById("invPreviewBody").innerHTML = `
    <div class="inv-doc">
      <div class="inv-doc-brand">
        <div class="inv-doc-company-name">${escapeHtml(inv.companyName || "")}</div>
        <div class="inv-doc-iso">ISO 9001 CERTIFIED</div>
      </div>
      <div class="inv-doc-addrline">Office &amp; Works: ${escapeHtml(inv.companyAddress || "")}</div>
      <div class="inv-doc-addrline2">E-Mail: ${escapeHtml(inv.companyEmail || "")}</div>

      <div class="inv-doc-title-row">
        <div class="inv-doc-title">${escapeHtml(inv.invoiceTitle || "Tax Invoice")}</div>
        <div class="fs-sm fw-700">${escapeHtml(inv.copyType || "Original for Buyer")}</div>
      </div>

      <div class="inv-doc-meta-row">
        <table class="inv-doc-meta-table">
          <tr><td>Invoice No.</td><td>${escapeHtml(inv.id)}</td></tr>
          <tr><td>Date</td><td>${formatDate(inv.invoiceDate)}</td></tr>
          <tr><td>State Code</td><td>${escapeHtml(inv.stateCode || "—")}</td></tr>
          <tr><td>Our GSTIN</td><td>${escapeHtml(inv.companyGST || "—")}</td></tr>
          ${inv.woRef ? `<tr><td>W.O. Ref</td><td>${escapeHtml(inv.woRef)}</td></tr>` : ""}
          ${inv.ewayBillNo ? `<tr><td>E-Way Bill No.</td><td>${escapeHtml(inv.ewayBillNo)}</td></tr>` : ""}
        </table>
        <table class="inv-doc-meta-table">
          ${inv.customerPoNo ? `<tr><td>Customer PO No.</td><td>${escapeHtml(inv.customerPoNo)}</td></tr>` : ""}
          ${inv.customerPoDate ? `<tr><td>Customer PO Date</td><td>${formatDate(inv.customerPoDate)}</td></tr>` : ""}
          <tr><td>Customer GST No.</td><td>${escapeHtml(inv.customerGstNo || "—")}</td></tr>
          <tr><td>Contact / Dept</td><td>${escapeHtml(inv.companyContact || "—")}</td></tr>
        </table>
      </div>

      <div class="inv-doc-parties">
        <div class="inv-doc-party">
          <div class="inv-doc-party-title">Invoice to</div>
          <div class="fw-700">${escapeHtml(inv.customer)}</div>
          <div>${escapeHtml(inv.billToAddress || "—")}</div>
          <div>${escapeHtml(inv.billToContact || "")}</div>
          ${inv.billToStateCode ? `<div>State Code: ${escapeHtml(inv.billToStateCode)}</div>` : ""}
        </div>
        <div class="inv-doc-party">
          <div class="inv-doc-party-title">Delivery to</div>
          <div class="fw-700">${escapeHtml(shipName || "—")}</div>
          <div>${escapeHtml(shipAddress || "—")}</div>
          <div>${escapeHtml(shipContact || "")}</div>
          ${shipState ? `<div>State Code: ${escapeHtml(shipState)}</div>` : ""}
        </div>
        <div class="inv-doc-party">
          <div class="inv-doc-party-title">Terms of Delivery</div>
          <div>${escapeHtml(inv.termsOfDelivery || "—")}</div>
          <div class="inv-doc-party-accent">Mode of Despatch</div>
          <div>${escapeHtml(inv.modeOfDespatch || "—")}</div>
          ${inv.transporterDetails ? `<div class="inv-doc-party-accent">Transporter Details</div><div>${escapeHtml(inv.transporterDetails)}</div>` : ""}
        </div>
      </div>

      <table class="inv-doc-items-table">
        <thead><tr><th>Sl.No.</th><th>Particulars</th><th>HSN</th><th>Unit</th><th class="num">Qty</th><th class="num">Rate</th><th class="num">Disc %</th><th class="num">Total</th></tr></thead>
        <tbody>
          ${inv.items.map((it, i) => `<tr><td>${i + 1}</td><td class="desc">${escapeHtml(it.desc)}</td><td>${escapeHtml(it.hsn || "")}</td><td>${escapeHtml(it.unit || "")}</td><td class="num">${it.qty}</td><td class="num">${formatCurrency(it.rate)}</td><td class="num">${it.discount || 0}%</td><td class="num">${formatCurrency(invItemLineTotal(it))}</td></tr>`).join("")}
        </tbody>
      </table>

      <div class="inv-doc-bottom-grid">
        <table class="inv-doc-tax-table">
          <tr><th>Tax Head</th>${inv.taxMode === "CGST_SGST" ? "<th>CGST</th><th>SGST</th>" : ""}${inv.taxMode === "IGST" ? "<th>IGST</th>" : ""}${inv.taxMode === "NONE" ? "<th>—</th>" : ""}</tr>
          <tr><td>%</td>${inv.taxMode === "CGST_SGST" ? `<td>${inv.cgstPercent}%</td><td>${inv.sgstPercent}%</td>` : ""}${inv.taxMode === "IGST" ? `<td>${inv.igstPercent}%</td>` : ""}${inv.taxMode === "NONE" ? "<td>0%</td>" : ""}</tr>
          <tr><td>Value</td>${inv.taxMode === "CGST_SGST" ? `<td>${formatCurrency(cgstAmt)}</td><td>${formatCurrency(sgstAmt)}</td>` : ""}${inv.taxMode === "IGST" ? `<td>${formatCurrency(igstAmt)}</td>` : ""}${inv.taxMode === "NONE" ? "<td>—</td>" : ""}</tr>
        </table>
        <div class="inv-doc-note">Note: Once Goods Sold cannot be taken Back or exchanged</div>
        <table class="inv-doc-summary-table">
          <tr><td>Taxable Amount</td><td>${formatCurrency(subtotal)}</td></tr>
          <tr><td>Total GST</td><td>${formatCurrency(totalGst)}</td></tr>
          <tr class="grand"><td>Net Amount</td><td>${formatCurrency(net)}</td></tr>
          <tr><td>Rounded To</td><td>${formatCurrency(rounded)}</td></tr>
        </table>
      </div>

      <div class="inv-doc-words">Amount In Words: ${amountInWords(rounded)}</div>

      <div class="inv-doc-termscert">
        <div class="inv-doc-terms"><div class="inv-doc-terms-label">Terms and Condition:</div>${escapeHtml(inv.termsAndConditions || "")}</div>
        <div class="inv-doc-cert">${escapeHtml(inv.certificationText || "")}</div>
      </div>

      <div class="inv-doc-bank-grid">
        <table class="inv-doc-bank-table">
          <tr><td colspan="2" style="text-align:center;font-weight:800;">Bank Details</td></tr>
          <tr><td>Name</td><td>${escapeHtml(inv.bankAccountHolder || "—")}</td></tr>
          <tr><td>Bank</td><td>${escapeHtml(inv.bankName || "—")}</td></tr>
          <tr><td>A/c Type</td><td>${escapeHtml(inv.bankAccountType || "—")}</td></tr>
          <tr><td>A/c No.</td><td>${escapeHtml(inv.bankAccountNo || "—")}</td></tr>
          <tr><td>IFSC</td><td>${escapeHtml(inv.bankIFSC || "—")}</td></tr>
          <tr><td>Branch</td><td>${escapeHtml(inv.bankBranch || "—")}</td></tr>
        </table>
        <div class="inv-doc-interest">
          <div>${escapeHtml(inv.interestNote || "")}</div>
          <div class="inv-doc-jurisdiction">${escapeHtml(inv.jurisdictionText || "")}</div>
        </div>
        <div class="inv-doc-sign">
          <div>For ${escapeHtml(inv.companyName || "")}</div>
          <div class="inv-doc-sign-line"></div>
          <div class="fw-700">${escapeHtml(inv.authorizedName || "")}</div>
          <div class="fs-sm">${escapeHtml(inv.authorizedDesignation || "")}</div>
          <div class="fs-xs text-faint">Authorised by</div>
        </div>
      </div>

      <div class="inv-doc-footer">E &amp; O.E.</div>
    </div>`;
}

document.addEventListener("layout:ready", renderInvoicesPage);
