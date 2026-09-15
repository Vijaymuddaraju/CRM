/* ==========================================================================
   Quotations — format picker + 3 live document editors
   Clicking "Create Quotation" first asks which document format to use
   (matching the company's real Techno Commercial Offer / Quotation
   templates), then opens that format as a live, editable document — same
   approach as Purchase Orders and Invoices. Editing an existing quotation
   always reopens the format it was originally created with.
   ========================================================================== */

let quotationsTable;
let qdState = { items: [], secondGroup: { enabled: false, title: "Installation", items: [] }, terms: [], highlights: [], approvals: [], projects: [] };
let qdActiveFormat = null;
let qdEditId = null;
let qdPendingLeadId = null;

function renderQuotationsPage() {
  populateQuoteFilters();
  quotationsTable = createTableController({
    data: DB.quotations, pageSize: 8,
    mountBodyId: "quotesTableBody", mountPaginationId: "quotesPagination", mountCountId: "quotesCount",
    filterFn: buildQuoteFilter(), renderRow: renderQuoteRow,
  });
  quotationsTable.render();

  document.getElementById("addQuoteBtn").addEventListener("click", () => openFormatPickerModal());
  ["quoteSearchInput", "quoteStatusFilter"].forEach(id => {
    document.getElementById(id).addEventListener(id === "quoteSearchInput" ? "input" : "change", debounce(refreshQuotes, 150));
  });

  injectFormatPickerModal();
  injectQuoteModal();
  injectQuotePreviewModal();

  // Deep-link support: quotations.html?new=1&leadId=LD-xxxx
  if (qs("new") === "1") openFormatPickerModal(qs("leadId"));

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
  const fmt = QUOTATION_FORMATS.find(f => f.key === q.docFormat);
  return `
    <tr>
      <td class="cell-primary">${escapeHtml(q.customer)}</td>
      <td>${formatCurrency(q.amount)}</td>
      <td class="cell-muted">${formatDate(q.date)}</td>
      <td class="cell-muted">${formatDate(q.validUntil)}</td>
      <td>${statusBadge(q.status)}</td>
      <td class="cell-muted" style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHtml(q.remarks || "")}">${escapeHtml(q.remarks || "—")}</td>
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
            <div class="dropdown-item" data-q-act="download" data-q-id="${q.id}">${icon("download")} Download PDF</div>
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
  if (act === "edit") openQuoteModal(q.docFormat, id);
  if (act === "send") { q.status = "Sent"; saveDB(); showToast("Quotation sent to customer.", "success"); document.dispatchEvent(new CustomEvent("quote:saved")); }
  if (act === "accept") { q.status = "Accepted"; saveDB(); showToast("Quotation marked as accepted.", "success"); document.dispatchEvent(new CustomEvent("quote:saved")); }
  if (act === "reject") { q.status = "Rejected"; saveDB(); showToast("Quotation marked as rejected.", "warning"); document.dispatchEvent(new CustomEvent("quote:saved")); }
  if (act === "download") { openQuotePreview(id); setTimeout(() => window.print(), 300); }
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
  const g = DB.settings.general;
  const lead = q.leadId ? getLeadById(q.leadId) : null;
  const items = (q.items || []).map(it => ({ desc: it.desc, hsn: "", unit: it.uom || "Set", qty: it.qty || 1, rate: it.rate, discount: 0 }));
  const subtotal = items.reduce((s, it) => s + it.qty * it.rate, 0);
  const gstPercent = q.gstMode === "ADD" ? (q.gstPercent || 18) : 0;
  const cgstPercent = Math.round(gstPercent / 2), sgstPercent = gstPercent - cgstPercent;
  const amount = Math.round(subtotal * (1 + gstPercent / 100));
  DB.invoices.unshift({
    id: invId, quotationId: q.id, copyType: "Original for Buyer",
    invoiceDate: invDate, dueDate: due.toISOString().slice(0, 10), woRef: "", ewayBillNo: "", customerPoNo: "", customerPoDate: "", stateCode: g.stateCode || "",
    companyName: g.companyName, companyAddress: g.address, companyGST: g.gst || "", companyEmail: g.companyEmail, companyContact: g.contactPerson || "",
    customer: q.customer, billToAddress: "", billToContact: lead ? lead.phone : "", billToStateCode: "", customerGstNo: "",
    shipToSameAsBillTo: true, shipToName: "", shipToAddress: "", shipToContact: "", shipToStateCode: "",
    termsOfDelivery: "As per agreement", modeOfDespatch: "", transporterDetails: "",
    items, taxMode: gstPercent ? "CGST_SGST" : "NONE", cgstPercent, sgstPercent, igstPercent: 0,
    amount, paidAmount: 0, status: "Draft",
    termsAndConditions: DEFAULT_INVOICE_TERMS, certificationText: DEFAULT_INVOICE_CERTIFICATION, interestNote: DEFAULT_INVOICE_INTEREST_NOTE, jurisdictionText: DEFAULT_INVOICE_JURISDICTION,
    bankAccountHolder: g.bankAccountHolder || "", bankName: g.bankName || "", bankAccountType: g.bankAccountType || "", bankAccountNo: g.bankAccountNo || "", bankIFSC: g.bankIFSC || "", bankBranch: g.bankBranch || "",
    authorizedName: "", authorizedDesignation: "", notes: "",
  });
  saveDB();
  showToast(`Invoice ${invId} created from ${quoteId}.`, "success");
  window.location.href = `invoices.html?id=${invId}`;
}

/* ---------------------------- FORMAT PICKER (STEP 1) ---------------------------- */

function injectFormatPickerModal() {
  if (document.getElementById("quoteFormatModal")) return;
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.id = "quoteFormatModal";
  backdrop.innerHTML = `
    <div class="modal modal-lg">
      <div class="modal-header"><h3>Choose Quotation Format</h3><button class="modal-close" data-close-modal>${icon("x")}</button></div>
      <div class="modal-body">
        <div class="qd-format-grid" id="qdFormatGrid"></div>
      </div>
      <div class="modal-footer"><button class="btn btn-secondary" data-close-modal>Cancel</button></div>
    </div>`;
  document.body.appendChild(backdrop);
  document.getElementById("qdFormatGrid").innerHTML = QUOTATION_FORMATS.map(f => `
    <div class="qd-format-card" data-format="${f.key}">
      <div class="qd-format-card-title">${f.label}</div>
      <div class="qd-format-card-hint">${f.hint}</div>
    </div>`).join("");
  document.querySelectorAll("#qdFormatGrid .qd-format-card").forEach(card => {
    card.addEventListener("click", () => {
      closeModal("quoteFormatModal");
      openQuoteModal(card.dataset.format, null, qdPendingLeadId);
      qdPendingLeadId = null;
    });
  });
}

function openFormatPickerModal(leadId) {
  qdPendingLeadId = leadId || null;
  openModal("quoteFormatModal");
}

/* ---------------------------- SHARED DOCUMENT EDITOR MODAL ---------------------------- */

function injectQuoteModal() {
  if (document.getElementById("quoteModal")) return;
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.id = "quoteModal";
  backdrop.innerHTML = `
    <div class="modal modal-full">
      <div class="modal-header"><h3 id="quoteModalTitle">Create Quotation</h3><button class="modal-close" data-close-modal>${icon("x")}</button></div>
      <div class="modal-body" id="quoteDocBody"></div>
      <div class="modal-footer spread">
        <button class="btn btn-ghost" id="quotePreviewBtn" type="button">${icon("eye")} Preview / Print</button>
        <div class="flex gap-2">
          <button class="btn btn-secondary" data-close-modal>Cancel</button>
          <button class="btn btn-secondary" id="quoteSaveDraftBtn"><span class="btn-label">Save Draft</span></button>
          <button class="btn btn-primary" id="quoteSendBtn"><span class="btn-label">Save &amp; Send</span></button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(backdrop);
  document.getElementById("quoteSaveDraftBtn").addEventListener("click", () => submitQuoteForm("Draft"));
  document.getElementById("quoteSendBtn").addEventListener("click", () => submitQuoteForm("Sent"));
  document.getElementById("quotePreviewBtn").addEventListener("click", () => {
    renderQuotePreviewContent(collectQuoteDraft());
    openModal("quotePreviewModal");
  });
}

function qdVal(id) { const el = document.getElementById(id); return el ? el.value.trim() : ""; }
function qdRawVal(id) { const el = document.getElementById(id); return el ? el.value : ""; }
function qdChecked(id) { const el = document.getElementById(id); return el ? el.checked : false; }
function qdSet(id, val) { const el = document.getElementById(id); if (el) el.value = val; }
function qdSetChecked(id, val) { const el = document.getElementById(id); if (el) el.checked = val; }

/* ---------- Shared item table renderer (used by all 3 formats + the optional 2nd group) ---------- */
function qdItemLineTotal(it) { return (it.qty || 1) * (it.rate || 0); }

function renderQdItems(items, bodyId, showUomQty, afterChange) {
  const body = document.getElementById(bodyId);
  if (!body) return;
  const active = document.activeElement;
  const activeIdx = active && active.closest && active.closest("tr") ? active.closest("tr").dataset.idx : null;
  const activeField = active && active.dataset ? active.dataset.field : null;
  const activeSelStart = active && typeof active.selectionStart === "number" ? active.selectionStart : null;

  body.innerHTML = items.map((it, i) => `
    <tr data-idx="${i}">
      <td style="text-align:center;">${i + 1}</td>
      <td class="desc"><input type="text" value="${escapeHtml(it.desc)}" data-field="desc" placeholder="Description"></td>
      ${showUomQty ? `
        <td><input type="text" value="${escapeHtml(it.uom || "")}" data-field="uom" placeholder="Nos"></td>
        <td class="num"><input type="number" min="0" value="${it.qty}" data-field="qty"></td>
        <td class="num"><input type="number" min="0" value="${it.rate}" data-field="rate"></td>` : `
        <td class="num"><input type="number" min="0" value="${it.rate}" data-field="rate"></td>`}
      <td class="num">${formatCurrency(qdItemLineTotal(it))}</td>
      <td><button class="remove-row-btn" data-remove="${i}">${icon("trash")}</button></td>
    </tr>`).join("");

  body.querySelectorAll("input").forEach(input => {
    input.addEventListener("input", (e) => {
      const idx = e.target.closest("tr").dataset.idx;
      const field = e.target.dataset.field;
      items[idx][field] = (field === "desc" || field === "uom") ? e.target.value : Number(e.target.value) || 0;
      if (!showUomQty) items[idx].qty = 1;
      renderQdItems(items, bodyId, showUomQty, afterChange);
      if (afterChange) afterChange();
    });
  });
  body.querySelectorAll("[data-remove]").forEach(btn => {
    btn.addEventListener("click", () => { items.splice(Number(btn.dataset.remove), 1); renderQdItems(items, bodyId, showUomQty, afterChange); if (afterChange) afterChange(); });
  });

  if (activeIdx !== null && activeField) {
    const el = body.querySelector(`tr[data-idx="${activeIdx}"] [data-field="${activeField}"]`);
    if (el) {
      el.focus();
      if (activeSelStart !== null && el.setSelectionRange) { try { el.setSelectionRange(activeSelStart, activeSelStart); } catch (e) {} }
    }
  }
}

/* ---------- Shared bullet-list editor (terms / highlights / approvals / projects) ---------- */
function renderQdBulletEditor(arr, bodyId, placeholder, numbered) {
  const body = document.getElementById(bodyId);
  if (!body) return;
  body.innerHTML = arr.map((t, i) => `
    <div class="qd-bullet-row" data-idx="${i}">
      ${numbered ? `<span class="fw-700" style="padding-top:8px;">${i + 1}.</span>` : ""}
      <textarea rows="1" data-field="text" placeholder="${escapeHtml(placeholder)}">${escapeHtml(t)}</textarea>
      <button class="remove-row-btn" data-remove="${i}">${icon("trash")}</button>
    </div>`).join("") || `<div class="text-faint fs-sm mb-2">None added yet.</div>`;
  body.querySelectorAll("textarea").forEach(ta => {
    ta.addEventListener("input", (e) => {
      const idx = e.target.closest(".qd-bullet-row").dataset.idx;
      arr[idx] = e.target.value;
    });
  });
  body.querySelectorAll("[data-remove]").forEach(btn => {
    btn.addEventListener("click", () => { arr.splice(Number(btn.dataset.remove), 1); renderQdBulletEditor(arr, bodyId, placeholder, numbered); });
  });
}

/* ---------- Major Projects table editor (Detailed format) ---------- */
function renderQdProjectsTable(arr, bodyId) {
  const body = document.getElementById(bodyId);
  if (!body) return;
  body.innerHTML = arr.map((t, i) => `
    <tr data-idx="${i}">
      <td style="text-align:center;">${i + 1}</td>
      <td><input type="text" value="${escapeHtml(t)}" data-field="text" placeholder="e.g. Infosys Limited (all over India)"></td>
      <td><button class="remove-row-btn" data-remove="${i}">${icon("trash")}</button></td>
    </tr>`).join("") || `<tr><td colspan="3" class="text-faint fs-sm">None added yet.</td></tr>`;
  body.querySelectorAll("input").forEach(inp => {
    inp.addEventListener("input", (e) => {
      const idx = e.target.closest("tr").dataset.idx;
      arr[idx] = e.target.value;
    });
  });
  body.querySelectorAll("[data-remove]").forEach(btn => {
    btn.addEventListener("click", () => { arr.splice(Number(btn.dataset.remove), 1); renderQdProjectsTable(arr, bodyId); });
  });
}

/* ---------- Totals ---------- */
function currentQdGstMode() {
  const el = document.querySelector('#qdGstModeRow input[name="qdGstMode"]:checked');
  return el ? el.value : "ADD";
}

function qdComputeTotals() {
  const subtotal = qdState.items.reduce((s, it) => s + qdItemLineTotal(it), 0);
  const secondSubtotal = qdState.secondGroup.enabled ? qdState.secondGroup.items.reduce((s, it) => s + qdItemLineTotal(it), 0) : 0;
  const combinedSubtotal = subtotal + secondSubtotal;
  const gstPercent = Number(qdRawVal("qdGstPercent")) || 0;
  const gstMode = currentQdGstMode();
  const gstAmt = gstMode === "ADD" ? combinedSubtotal * (gstPercent / 100) : 0;
  const grand = combinedSubtotal + gstAmt;
  return { subtotal, secondSubtotal, combinedSubtotal, gstPercent, gstMode, gstAmt, grand };
}

function qdUpdateWordsBox() {
  const totals = qdComputeTotals();
  const box = document.getElementById("qdWordsBox");
  if (box) box.textContent = `In Words: ${amountInWords(totals.grand)}`;
  return totals;
}

/* ---------------------------- FORMAT TEMPLATES ---------------------------- */

function qdHeaderBlock(format) {
  return `
    <div class="qd-doc-header">
      <input class="qd-doc-company-name" id="qdCompanyName" placeholder="Company Name">
      ${format === "techno_detailed" ? `<div class="qd-doc-tagline">Energy Conservation Company</div>` : ""}
      <div class="qd-doc-header-line">Office &amp; Works: <input id="qdCompanyAddress" placeholder="Address" style="display:inline;width:70%;"></div>
      <div class="qd-doc-header-line">Email: <input id="qdCompanyEmail" type="email" placeholder="Email" style="display:inline;width:30%;"> | Website: <input id="qdCompanyWebsite" placeholder="Website" style="display:inline;width:22%;"></div>
      <div class="qd-doc-header-line">GST No: <input id="qdCompanyGST" placeholder="GST Number" style="display:inline;width:30%;"></div>
    </div>`;
}

function qdSignBlock(format) {
  return `
    <div class="qd-doc-sign">
      <div>${format === "standard" ? "for <span id=\"qdSignCompanyName\"></span>," : "Regards"}</div>
      <input id="qdAuthorizedName" placeholder="Name" class="fw-700" style="width:260px;">
      <input id="qdAuthorizedDesignation" placeholder="Designation" style="width:260px;">
      <input id="qdAuthorizedMobile" placeholder="Mobile" style="width:260px;">
    </div>`;
}

function qdErrorLine() {
  return `<div class="qd-doc-error" id="qdCustomerError" style="display:none;">Recipient / Company name is required.</div>`;
}

function buildSimpleTemplate() {
  return `
    <div class="qd-meta-bar">
      <div class="field"><label>Workflow Status</label><select class="select-field2" id="qdStatus">${["Draft", "Sent", "Accepted", "Rejected", "Expired"].map(s => `<option>${s}</option>`).join("")}</select></div>
      <div class="field"><label>Related Lead <span class="optional">(optional)</span></label><select class="select-field2" id="qdLead"><option value="">None</option>${DB.leads.map(l => `<option value="${l.id}">${l.company} — ${l.id}</option>`).join("")}</select></div>
      <div class="field"><label>Valid Until</label><input class="input" type="date" id="qdValidUntil"></div>
      <div class="qd-tax-mode-row" id="qdGstModeRow" style="display:flex;gap:16px;">
        <label class="flex items-center gap-2 fs-sm"><input type="radio" name="qdGstMode" value="ADD" style="width:auto;"> Add GST to Total</label>
        <label class="flex items-center gap-2 fs-sm"><input type="radio" name="qdGstMode" value="EXCLUDE" style="width:auto;"> Exclude GST</label>
      </div>
    </div>
    <div class="qd-doc fmt-simple" id="qdDocSheet">
      ${qdHeaderBlock("techno_simple")}
      <div class="qd-doc-title-bar">TECHNO COMMERCIAL OFFER</div>
      <div class="qd-doc-refdate">
        <div>Lr.Ref.No: <input id="qdRefNo" style="display:inline;width:180px;"></div>
        <div>Date: <input type="date" id="qdDate" style="display:inline;width:150px;"></div>
      </div>
      <div class="qd-doc-recipient">
        <div>Kind attn.,</div>
        <input id="qdRecipientName" class="fw-700" placeholder="Recipient Name" style="width:320px;">
        <input id="qdRecipientDesignation" placeholder="Designation (optional)" style="width:320px;">
        <input id="qdRecipientCompany" placeholder="Company Name *" style="width:320px;">
        <input id="qdRecipientEmail" placeholder="Email (optional)" style="width:320px;">
        <input id="qdRecipientMobile" placeholder="Mobile (optional)" style="width:320px;">
        ${qdErrorLine()}
      </div>
      <div class="qd-doc-subject"><span class="qd-label">Sub:</span> <input id="qdSubject" placeholder="Offer for ..." style="display:inline;width:75%;"></div>

      <table class="qd-doc-items-table">
        <thead><tr><th style="width:6%;">SL. NO</th><th>Work Particulars</th><th class="num" style="width:16%;">Amount</th><th style="width:30px;"></th></tr></thead>
        <tbody id="qdItemsBody"></tbody>
      </table>
      <div class="add-row-btn" id="addQdItemBtn">${icon("plus")} Add Item</div>

      <div class="qd-doc-words" id="qdWordsBox"></div>

      <div class="qd-doc-section-title">Terms and Conditions:</div>
      <div id="qdTermsBody"></div>
      <div class="add-row-btn" id="addQdTermBtn">${icon("plus")} Add Term</div>

      <div class="qd-doc-section-title">Scope of Work</div>
      <textarea id="qdScopeOfWork" rows="8" placeholder="Describe the scope of work..."></textarea>

      ${qdSignBlock("techno_simple")}
    </div>
    <div class="section-title mt-4 mb-2">Remarks <span class="optional" style="text-transform:none;font-weight:400;">(internal only, not shown on the printed document)</span></div>
    <div class="form-grid"><div class="field span-2"><textarea class="textarea" id="qdRemarks" placeholder="Internal remarks..."></textarea></div></div>`;
}

function buildDetailedTemplate() {
  return `
    <div class="qd-meta-bar">
      <div class="field"><label>Workflow Status</label><select class="select-field2" id="qdStatus">${["Draft", "Sent", "Accepted", "Rejected", "Expired"].map(s => `<option>${s}</option>`).join("")}</select></div>
      <div class="field"><label>Related Lead <span class="optional">(optional)</span></label><select class="select-field2" id="qdLead"><option value="">None</option>${DB.leads.map(l => `<option value="${l.id}">${l.company} — ${l.id}</option>`).join("")}</select></div>
      <div class="field"><label>Valid Until</label><input class="input" type="date" id="qdValidUntil"></div>
      <div class="qd-tax-mode-row" id="qdGstModeRow" style="display:flex;gap:16px;">
        <label class="flex items-center gap-2 fs-sm"><input type="radio" name="qdGstMode" value="ADD" style="width:auto;"> Add GST to Total</label>
        <label class="flex items-center gap-2 fs-sm"><input type="radio" name="qdGstMode" value="EXCLUDE" style="width:auto;"> Exclude GST</label>
      </div>
      <label class="flex items-center gap-2 fs-sm"><input type="checkbox" id="qdShowBank" style="width:auto;"> Show Bank Details</label>
    </div>
    <div class="qd-doc fmt-detailed" id="qdDocSheet">
      ${qdHeaderBlock("techno_detailed")}
      <div class="qd-doc-title-bar">TECHNO COMMERCIAL OFFER</div>
      <div class="qd-doc-refdate">
        <div>Ref: <input id="qdRefNo" style="display:inline;width:220px;"></div>
        <div>Date: <input type="date" id="qdDate" style="display:inline;width:150px;"></div>
      </div>
      <div class="qd-doc-recipient">
        <input id="qdRecipientName" class="fw-700" placeholder="Recipient Name" style="width:320px;">
        <input id="qdRecipientCompany" placeholder="Company Name *" style="width:320px;">
        <input id="qdRecipientEmail" placeholder="Email (optional)" style="width:320px;">
        <input id="qdRecipientMobile" placeholder="Contact No. (optional)" style="width:320px;">
        ${qdErrorLine()}
      </div>
      <div class="qd-doc-subject"><span class="qd-label">Sub:</span> <input id="qdSubject" placeholder="Supply of ..." style="display:inline;width:75%;"></div>

      <textarea id="qdIntroText" rows="2" placeholder="This has reference to discussion had regarding the subject..."></textarea>

      <div class="qd-doc-section-title">Why Choose Us</div>
      <div id="qdHighlightsBody"></div>
      <div class="add-row-btn" id="addQdHighlightBtn">${icon("plus")} Add Point</div>

      <div class="qd-doc-section-title">Approvals &amp; Recommendations</div>
      <div id="qdApprovalsBody"></div>
      <div class="add-row-btn" id="addQdApprovalBtn">${icon("plus")} Add Approval</div>

      <div class="qd-doc-section-title">Major Projects</div>
      <table class="qd-doc-items-table" style="margin-bottom:6px;">
        <thead><tr><th style="width:10%;">No.</th><th>Project Name</th><th style="width:30px;"></th></tr></thead>
        <tbody id="qdProjectsBody"></tbody>
      </table>
      <div class="add-row-btn" id="addQdProjectBtn">${icon("plus")} Add Project</div>

      <div class="qd-doc-section-title">Item Details</div>
      <input id="qdItemsNote" placeholder="Item table caption (optional) e.g. Supply of Energy Saver ... - HSN Code 85371000" class="fw-700" style="margin-bottom:4px;">
      <table class="qd-doc-items-table">
        <thead><tr><th style="width:5%;">SL.NO</th><th>Description</th><th style="width:8%;">UOM</th><th class="num" style="width:8%;">Qty</th><th class="num" style="width:14%;">Rate (₹)</th><th class="num" style="width:14%;">Total</th><th style="width:30px;"></th></tr></thead>
        <tbody id="qdItemsBody"></tbody>
      </table>
      <div class="add-row-btn" id="addQdItemBtn">${icon("plus")} Add Item</div>

      <div class="qd-doc-words" id="qdWordsBox"></div>

      <div class="qd-doc-section-title">Terms and Conditions</div>
      <div id="qdTermsBody"></div>
      <div class="add-row-btn" id="addQdTermBtn">${icon("plus")} Add Term</div>

      <table class="qd-doc-bank-table" id="qdBankTableWrap">
        <tr><td colspan="2" style="text-align:center;font-weight:800;">Bank Details</td></tr>
        <tr><td>Name of the Beneficiary</td><td><input id="qdBankAccountHolder"></td></tr>
        <tr><td>Bank</td><td><input id="qdBankName"></td></tr>
        <tr><td>Branch</td><td><input id="qdBankBranch"></td></tr>
        <tr><td>Account Type</td><td><input id="qdBankAccountType"></td></tr>
        <tr><td>Account No</td><td><input id="qdBankAccountNo"></td></tr>
        <tr><td>IFSC Code</td><td><input id="qdBankIFSC"></td></tr>
      </table>

      ${qdSignBlock("techno_detailed")}
    </div>
    <div class="section-title mt-4 mb-2">Remarks <span class="optional" style="text-transform:none;font-weight:400;">(internal only, not shown on the printed document)</span></div>
    <div class="form-grid"><div class="field span-2"><textarea class="textarea" id="qdRemarks" placeholder="Internal remarks..."></textarea></div></div>`;
}

function buildStandardTemplate() {
  return `
    <div class="qd-meta-bar">
      <div class="field"><label>Workflow Status</label><select class="select-field2" id="qdStatus">${["Draft", "Sent", "Accepted", "Rejected", "Expired"].map(s => `<option>${s}</option>`).join("")}</select></div>
      <div class="field"><label>Related Lead <span class="optional">(optional)</span></label><select class="select-field2" id="qdLead"><option value="">None</option>${DB.leads.map(l => `<option value="${l.id}">${l.company} — ${l.id}</option>`).join("")}</select></div>
      <div class="field"><label>Valid Until</label><input class="input" type="date" id="qdValidUntil"></div>
      <div class="qd-tax-mode-row" id="qdGstModeRow" style="display:flex;gap:16px;">
        <label class="flex items-center gap-2 fs-sm"><input type="radio" name="qdGstMode" value="ADD" style="width:auto;"> Add GST to Total</label>
        <label class="flex items-center gap-2 fs-sm"><input type="radio" name="qdGstMode" value="EXCLUDE" style="width:auto;"> Exclude GST</label>
      </div>
      <label class="flex items-center gap-2 fs-sm"><input type="checkbox" id="qdSecondEnabled" style="width:auto;"> Add a second item group (e.g. Installation)</label>
    </div>
    <div class="qd-doc fmt-standard" id="qdDocSheet">
      ${qdHeaderBlock("standard")}
      <div class="qd-doc-title-bar">QUOTATION</div>
      <div class="qd-doc-refdate">
        <div>Ref: <input id="qdRefNo" style="display:inline;width:220px;"></div>
        <div>Date: <input type="date" id="qdDate" style="display:inline;width:150px;"></div>
      </div>
      <div class="qd-doc-recipient">
        <input id="qdRecipientName" class="fw-700" placeholder="Recipient Name" style="width:320px;">
        <input id="qdRecipientCompany" placeholder="For Company Name *" style="width:320px;">
        <input id="qdRecipientEmail" placeholder="Email (optional)" style="width:320px;">
        <input id="qdRecipientMobile" placeholder="Contact No. (optional)" style="width:320px;">
        ${qdErrorLine()}
      </div>
      <input id="qdGreeting" placeholder="Dear Sir / Madam." style="font-weight:700;margin-bottom:6px;">
      <div class="qd-doc-subject"><span class="qd-label">Sub:</span> <input id="qdSubject" placeholder="Supply and Installation of ..." style="display:inline;width:75%;"></div>
      <textarea id="qdIntroText" rows="2" placeholder="This has reference to discussion had regarding the subject..."></textarea>

      <table class="qd-doc-items-table">
        <thead><tr><th style="width:5%;">SL.NO</th><th>Description</th><th style="width:8%;">UOM</th><th class="num" style="width:8%;">Qty</th><th class="num" style="width:14%;">Unit Price</th><th class="num" style="width:14%;">Amount</th><th style="width:30px;"></th></tr></thead>
        <tbody id="qdItemsBody"></tbody>
      </table>
      <div class="add-row-btn" id="addQdItemBtn">${icon("plus")} Add Item</div>

      <div id="qdSecondGroupWrap"></div>

      <div class="qd-doc-words" id="qdWordsBox"></div>

      <div class="qd-doc-section-title">Terms and Conditions</div>
      <div id="qdTermsBody"></div>
      <div class="add-row-btn" id="addQdTermBtn">${icon("plus")} Add Term</div>

      <input id="qdHighlightNote" placeholder="Highlighted note (optional) e.g. Goods once sold shall not be taken back." class="qd-doc-terms-value" style="text-align:center;font-weight:700;border:1px solid var(--qd-line);padding:6px;margin-bottom:10px;">

      <textarea id="qdClosingText" rows="4" placeholder="We look forward to receive your valued Purchase Order at the earliest.&#10;&#10;Thanking You,&#10;&#10;Yours faithfully,"></textarea>

      ${qdSignBlock("standard")}
    </div>
    <div class="section-title mt-4 mb-2">Remarks <span class="optional" style="text-transform:none;font-weight:400;">(internal only, not shown on the printed document)</span></div>
    <div class="form-grid"><div class="field span-2"><textarea class="textarea" id="qdRemarks" placeholder="Internal remarks..."></textarea></div></div>`;
}

function renderQdSecondGroupBlock() {
  const wrap = document.getElementById("qdSecondGroupWrap");
  if (!wrap) return;
  if (!qdState.secondGroup.enabled) { wrap.innerHTML = ""; return; }
  wrap.innerHTML = `
    <input id="qdSecondTitle" placeholder="Group title e.g. Installation" class="qd-doc-group-title" value="${escapeHtml(qdState.secondGroup.title || "Installation")}">
    <table class="qd-doc-items-table">
      <thead><tr><th style="width:5%;">SL.NO</th><th>Description</th><th style="width:8%;">UOM</th><th class="num" style="width:8%;">Qty</th><th class="num" style="width:14%;">Unit Price</th><th class="num" style="width:14%;">Amount</th><th style="width:30px;"></th></tr></thead>
      <tbody id="qdSecondItemsBody"></tbody>
    </table>
    <div class="add-row-btn" id="addQdSecondItemBtn">${icon("plus")} Add Item</div>`;
  document.getElementById("qdSecondTitle").addEventListener("input", (e) => { qdState.secondGroup.title = e.target.value; });
  document.getElementById("addQdSecondItemBtn").addEventListener("click", () => {
    qdState.secondGroup.items.push({ desc: "", uom: "Nos", qty: 1, rate: 0 });
    renderQdItems(qdState.secondGroup.items, "qdSecondItemsBody", true, qdUpdateWordsBox);
    qdUpdateWordsBox();
  });
  renderQdItems(qdState.secondGroup.items, "qdSecondItemsBody", true, qdUpdateWordsBox);
}

/* ---------------------------- OPEN / WIRE / POPULATE ---------------------------- */

function renderQuoteDocBody(format) {
  const body = document.getElementById("quoteDocBody");
  if (format === "techno_simple") body.innerHTML = buildSimpleTemplate();
  else if (format === "techno_detailed") body.innerHTML = buildDetailedTemplate();
  else body.innerHTML = buildStandardTemplate();

  document.querySelectorAll('#qdGstModeRow input[name="qdGstMode"]').forEach(r => r.addEventListener("change", qdUpdateWordsBox));
  document.getElementById("addQdItemBtn").addEventListener("click", () => {
    qdState.items.push({ desc: "", uom: "Nos", qty: 1, rate: 0 });
    renderQdItems(qdState.items, "qdItemsBody", format !== "techno_simple", qdUpdateWordsBox);
    qdUpdateWordsBox();
  });
  document.getElementById("addQdTermBtn").addEventListener("click", () => {
    qdState.terms.push("");
    renderQdBulletEditor(qdState.terms, "qdTermsBody", "Term / condition...", format !== "techno_simple");
  });

  if (format === "techno_detailed") {
    document.getElementById("addQdHighlightBtn").addEventListener("click", () => { qdState.highlights.push(""); renderQdBulletEditor(qdState.highlights, "qdHighlightsBody", "e.g. ISO 9001:2015 certified Company", false); });
    document.getElementById("addQdApprovalBtn").addEventListener("click", () => { qdState.approvals.push(""); renderQdBulletEditor(qdState.approvals, "qdApprovalsBody", "e.g. The Energy Research Institute (TERI)", false); });
    document.getElementById("addQdProjectBtn").addEventListener("click", () => { qdState.projects.push(""); renderQdProjectsTable(qdState.projects, "qdProjectsBody"); });
    document.getElementById("qdShowBank").addEventListener("change", (e) => { document.getElementById("qdBankTableWrap").style.display = e.target.checked ? "" : "none"; });
  }
  if (format === "standard") {
    document.getElementById("qdCompanyName").addEventListener("input", (e) => { const el = document.getElementById("qdSignCompanyName"); if (el) el.textContent = e.target.value; });
    document.getElementById("qdSecondEnabled").addEventListener("change", (e) => { qdState.secondGroup.enabled = e.target.checked; renderQdSecondGroupBlock(); qdUpdateWordsBox(); });
  }
}

function qdDefaultsFor(format) {
  return format === "techno_simple" ? DEFAULT_QUOTE_SIMPLE : format === "techno_detailed" ? DEFAULT_QUOTE_DETAILED : DEFAULT_QUOTE_STANDARD;
}

function qdApplyRecord(format, q) {
  const g = DB.settings.general;
  const D = qdDefaultsFor(format);
  qdSet("qdStatus", q ? q.status : "Draft");
  qdSet("qdLead", q ? (q.leadId || "") : (qdPendingLeadIdForFill || ""));
  qdSet("qdValidUntil", q ? q.validUntil : "");
  // Reset all format-specific state up front so switching formats within the
  // same page session never leaks a previous format's items/terms/second
  // group into the new one's totals or fields.
  qdState = { items: [], secondGroup: { enabled: false, title: "Installation", items: [] }, terms: [], highlights: [], approvals: [], projects: [] };
  document.querySelector(`#qdGstModeRow input[value="${q ? (q.gstMode || "ADD") : D.gstMode}"]`).checked = true;
  qdSet("qdCompanyName", q ? (q.companyName || g.companyName) : g.companyName);
  qdSet("qdCompanyAddress", q ? (q.companyAddress || g.address) : g.address);
  qdSet("qdCompanyEmail", q ? (q.companyEmail || g.companyEmail) : g.companyEmail);
  qdSet("qdCompanyWebsite", q ? (q.companyWebsite || g.website || "") : (g.website || ""));
  qdSet("qdCompanyGST", q ? (q.companyGST || g.gst || "") : (g.gst || ""));
  qdSet("qdRefNo", q ? (q.refNo || "") : D.refNo);
  qdSet("qdDate", q ? q.date : D.date);
  qdSet("qdRecipientName", q ? (q.recipientName || "") : D.recipientName);
  qdSet("qdRecipientCompany", q ? (q.customer || "") : D.recipientCompany);
  qdSet("qdRecipientEmail", q ? (q.recipientEmail || "") : D.recipientEmail);
  qdSet("qdRecipientMobile", q ? (q.recipientMobile || "") : D.recipientMobile);
  qdSet("qdSubject", q ? (q.subject || "") : D.subject);
  document.getElementById("qdCustomerError").style.display = "none";

  const gstPercent = q ? (q.gstPercent || 18) : D.gstPercent;

  if (format === "techno_simple") {
    qdSet("qdRecipientDesignation", q ? (q.recipientDesignation || "") : D.recipientDesignation);
    qdState.terms = (q && q.termsAndConditions && q.termsAndConditions.length ? q.termsAndConditions : DEFAULT_QUOTE_TERMS_SIMPLE).slice();
    qdSet("qdScopeOfWork", q ? (q.scopeOfWork || "") : D.scopeOfWork);
    renderQdBulletEditor(qdState.terms, "qdTermsBody", "Term / condition...", false);
  } else if (format === "techno_detailed") {
    qdSet("qdIntroText", q ? (q.introText || "") : D.introText);
    qdSet("qdItemsNote", q ? (q.itemsNote || "") : D.itemsNote);
    qdState.highlights = (q && q.companyHighlights ? q.companyHighlights : D.highlights).slice();
    qdState.approvals = (q && q.approvals ? q.approvals : D.approvals).slice();
    qdState.projects = (q && q.majorProjects ? q.majorProjects : D.projects).slice();
    qdState.terms = (q && q.termsAndConditions && q.termsAndConditions.length ? q.termsAndConditions : DEFAULT_QUOTE_TERMS_DETAILED).slice();
    renderQdBulletEditor(qdState.highlights, "qdHighlightsBody", "e.g. ISO 9001:2015 certified Company", false);
    renderQdBulletEditor(qdState.approvals, "qdApprovalsBody", "e.g. The Energy Research Institute (TERI)", false);
    renderQdProjectsTable(qdState.projects, "qdProjectsBody");
    renderQdBulletEditor(qdState.terms, "qdTermsBody", "Term / condition...", true);
    const showBank = q ? q.showBankDetails !== false : D.showBankDetails;
    qdSetChecked("qdShowBank", showBank);
    document.getElementById("qdBankTableWrap").style.display = showBank ? "" : "none";
    qdSet("qdBankAccountHolder", q ? (q.bankAccountHolder || "") : D.bankAccountHolder);
    qdSet("qdBankName", q ? (q.bankName || "") : D.bankName);
    qdSet("qdBankBranch", q ? (q.bankBranch || "") : D.bankBranch);
    qdSet("qdBankAccountType", q ? (q.bankAccountType || "") : D.bankAccountType);
    qdSet("qdBankAccountNo", q ? (q.bankAccountNo || "") : D.bankAccountNo);
    qdSet("qdBankIFSC", q ? (q.bankIFSC || "") : D.bankIFSC);
  } else {
    qdSet("qdGreeting", q ? (q.greeting || "Dear Sir / Madam.") : D.greeting);
    qdSet("qdIntroText", q ? (q.introText || "") : D.introText);
    qdState.terms = (q && q.termsAndConditions && q.termsAndConditions.length ? q.termsAndConditions : DEFAULT_QUOTE_TERMS_STANDARD).slice();
    renderQdBulletEditor(qdState.terms, "qdTermsBody", "Term / condition...", true);
    qdSet("qdHighlightNote", q ? (q.highlightNote || "") : D.highlightNote);
    qdSet("qdClosingText", q ? (q.closingText || "") : D.closingText);
    qdState.secondGroup = q && q.secondGroup ? { enabled: !!q.secondGroup.enabled, title: q.secondGroup.title || "Installation", items: (q.secondGroup.items || []).map(i => ({ ...i })) } : { enabled: true, title: "Installation", items: D.secondGroupItems.map(i => ({ ...i })) };
    qdSetChecked("qdSecondEnabled", qdState.secondGroup.enabled);
    renderQdSecondGroupBlock();
    const signNameEl = document.getElementById("qdSignCompanyName");
    if (signNameEl) signNameEl.textContent = qdRawVal("qdCompanyName");
  }

  qdSet("qdAuthorizedName", q ? (q.authorizedName || "") : D.authorizedName);
  qdSet("qdAuthorizedDesignation", q ? (q.authorizedDesignation || "") : D.authorizedDesignation);
  qdSet("qdAuthorizedMobile", q ? (q.authorizedMobile || "") : D.authorizedMobile);
  qdSet("qdRemarks", q ? (q.remarks || "") : "");

  qdState.items = (q && q.items && q.items.length ? q.items : D.items).map(i => ({ ...i }));
  renderQdItems(qdState.items, "qdItemsBody", format !== "techno_simple", qdUpdateWordsBox);
  qdSet("qdGstPercent", String(gstPercent));
  qdUpdateWordsBox();
}

let qdPendingLeadIdForFill = null;

function openQuoteModal(format, quoteId, leadId) {
  injectQuoteModal();
  qdActiveFormat = format;
  qdEditId = quoteId || null;
  qdPendingLeadIdForFill = leadId || null;
  document.getElementById("quoteModalTitle").textContent = quoteId ? `Edit Quotation — ${quoteId}` : `Create Quotation — ${QUOTATION_FORMATS.find(f => f.key === format)?.label || ""}`;

  renderQuoteDocBody(format);

  const q = quoteId ? DB.quotations.find(x => x.id === quoteId) : null;
  if (!q && leadId) {
    const lead = getLeadById(leadId);
    if (lead) {
      qdApplyRecord(format, null);
      qdSet("qdRecipientCompany", lead.company);
      qdSet("qdRecipientName", lead.name);
      qdSet("qdRecipientEmail", lead.email || "");
      qdSet("qdRecipientMobile", lead.phone || "");
      qdSet("qdSubject", lead.requirement || "");
      qdSet("qdLead", leadId);
    } else {
      qdApplyRecord(format, null);
    }
  } else {
    qdApplyRecord(format, q);
  }

  openModal("quoteModal");
}

/* ---------------------------- COLLECT / SAVE ---------------------------- */

function collectQuoteDraft() {
  const totals = qdUpdateWordsBox();
  const draft = {
    docFormat: qdActiveFormat,
    customer: qdVal("qdRecipientCompany"),
    leadId: qdRawVal("qdLead"),
    date: qdRawVal("qdDate"),
    validUntil: qdRawVal("qdValidUntil"),
    refNo: qdVal("qdRefNo"),
    companyName: qdVal("qdCompanyName"),
    companyAddress: qdVal("qdCompanyAddress"),
    companyEmail: qdVal("qdCompanyEmail"),
    companyWebsite: qdVal("qdCompanyWebsite"),
    companyGST: qdVal("qdCompanyGST"),
    recipientName: qdVal("qdRecipientName"),
    recipientEmail: qdVal("qdRecipientEmail"),
    recipientMobile: qdVal("qdRecipientMobile"),
    subject: qdVal("qdSubject"),
    items: qdState.items.map(i => ({ ...i })),
    gstPercent: totals.gstPercent,
    gstMode: totals.gstMode,
    amount: Math.round(totals.grand),
    termsAndConditions: qdState.terms.filter(t => t.trim()),
    authorizedName: qdVal("qdAuthorizedName"),
    authorizedDesignation: qdVal("qdAuthorizedDesignation"),
    authorizedMobile: qdVal("qdAuthorizedMobile"),
    remarks: qdVal("qdRemarks"),
  };
  if (qdActiveFormat === "techno_simple") {
    draft.recipientDesignation = qdVal("qdRecipientDesignation");
    draft.scopeOfWork = qdVal("qdScopeOfWork");
  } else if (qdActiveFormat === "techno_detailed") {
    draft.introText = qdVal("qdIntroText");
    draft.itemsNote = qdVal("qdItemsNote");
    draft.companyHighlights = qdState.highlights.filter(t => t.trim());
    draft.approvals = qdState.approvals.filter(t => t.trim());
    draft.majorProjects = qdState.projects.filter(t => t.trim());
    draft.showBankDetails = qdChecked("qdShowBank");
    draft.bankAccountHolder = qdVal("qdBankAccountHolder");
    draft.bankName = qdVal("qdBankName");
    draft.bankBranch = qdVal("qdBankBranch");
    draft.bankAccountType = qdVal("qdBankAccountType");
    draft.bankAccountNo = qdVal("qdBankAccountNo");
    draft.bankIFSC = qdVal("qdBankIFSC");
  } else {
    draft.greeting = qdVal("qdGreeting");
    draft.introText = qdVal("qdIntroText");
    draft.highlightNote = qdVal("qdHighlightNote");
    draft.closingText = qdVal("qdClosingText");
    draft.secondGroup = { enabled: qdState.secondGroup.enabled, title: qdState.secondGroup.title || "Installation", items: qdState.secondGroup.items.map(i => ({ ...i })) };
  }
  return draft;
}

function submitQuoteForm(status) {
  const customer = qdVal("qdRecipientCompany");
  document.getElementById("qdCustomerError").style.display = customer ? "none" : "block";
  if (!customer) { showToast("Please fill all required fields.", "error"); return; }
  if (!qdState.items.length || qdState.items.every(it => !it.desc)) { showToast("Please add at least one item.", "error"); return; }

  const btn = status === "Draft" ? document.getElementById("quoteSaveDraftBtn") : document.getElementById("quoteSendBtn");
  setBtnLoading(btn, true);
  setTimeout(() => {
    const draft = collectQuoteDraft();
    if (qdEditId) {
      const q = DB.quotations.find(x => x.id === qdEditId);
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

/* ---------------------------- PREVIEW / PRINT MODAL ---------------------------- */

function injectQuotePreviewModal() {
  if (document.getElementById("quotePreviewModal")) return;
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.id = "quotePreviewModal";
  backdrop.innerHTML = `<div class="modal modal-full"><div class="modal-header"><h3>Quotation Preview</h3><button class="modal-close" data-close-modal>${icon("x")}</button></div><div class="modal-body" id="quotePreviewBody"></div><div class="modal-footer"><button class="btn btn-secondary" data-close-modal>Close</button><button class="btn btn-primary" id="previewDownloadBtn">${icon("download")} Print / Download PDF</button></div></div>`;
  document.body.appendChild(backdrop);
  document.getElementById("previewDownloadBtn").addEventListener("click", () => window.print());
}

function openQuotePreview(quoteId) {
  const q = DB.quotations.find(x => x.id === quoteId);
  injectQuotePreviewModal();
  renderQuotePreviewContent(q);
  openModal("quotePreviewModal");
}

function qdComputeTotalsFromRecord(q) {
  const subtotal = (q.items || []).reduce((s, it) => s + qdItemLineTotal(it), 0);
  const secondSubtotal = q.secondGroup && q.secondGroup.enabled ? (q.secondGroup.items || []).reduce((s, it) => s + qdItemLineTotal(it), 0) : 0;
  const combined = subtotal + secondSubtotal;
  const gstAmt = q.gstMode === "ADD" ? combined * ((q.gstPercent || 0) / 100) : 0;
  return { subtotal, secondSubtotal, combined, gstAmt, grand: combined + gstAmt };
}

function qdItemsTableHtml(items, showUomQty, title) {
  return `
    ${title ? `<div class="qd-doc-group-title">${escapeHtml(title)}</div>` : ""}
    <table class="qd-doc-items-table">
      <thead><tr><th style="width:5%;">SL.NO</th><th>${showUomQty ? "Description" : "Work Particulars"}</th>${showUomQty ? `<th style="width:8%;">UOM</th><th class="num" style="width:8%;">Qty</th><th class="num" style="width:14%;">Rate</th>` : ""}<th class="num" style="width:14%;">${showUomQty ? "Amount" : "Amount"}</th></tr></thead>
      <tbody>
        ${items.map((it, i) => `<tr><td>${i + 1}</td><td class="desc">${escapeHtml(it.desc)}</td>${showUomQty ? `<td>${escapeHtml(it.uom || "")}</td><td class="num">${it.qty}</td><td class="num">${formatCurrency(it.rate)}</td>` : ""}<td class="num">${formatCurrency(qdItemLineTotal(it))}</td></tr>`).join("")}
      </tbody>
    </table>`;
}

function renderQuotePreviewContent(q) {
  const totals = qdComputeTotalsFromRecord(q);
  const showUomQty = q.docFormat !== "techno_simple";
  const fmtClass = q.docFormat === "techno_simple" ? "fmt-simple" : q.docFormat === "techno_detailed" ? "fmt-detailed" : "fmt-standard";
  let html = `<div class="qd-doc ${fmtClass}">
    <div class="qd-doc-header">
      <div class="qd-doc-company-name">${escapeHtml(q.companyName || "")}</div>
      ${q.docFormat === "techno_detailed" ? `<div class="qd-doc-tagline">Energy Conservation Company</div>` : ""}
      <div class="qd-doc-header-line">Office &amp; Works: ${escapeHtml(q.companyAddress || "")}</div>
      <div class="qd-doc-header-line">Email: ${escapeHtml(q.companyEmail || "")}${q.companyWebsite ? " | Website: " + escapeHtml(q.companyWebsite) : ""}</div>
      <div class="qd-doc-header-line">GST No: ${escapeHtml(q.companyGST || "")}</div>
    </div>
    <div class="qd-doc-title-bar">${q.docFormat === "standard" ? "QUOTATION" : "TECHNO COMMERCIAL OFFER"}</div>
    <div class="qd-doc-refdate"><div>${q.docFormat === "techno_simple" ? "Lr.Ref.No" : "Ref"}: ${escapeHtml(q.refNo || "")}</div><div>Date: ${formatDate(q.date)}</div></div>
    <div class="qd-doc-recipient">
      ${q.docFormat === "techno_simple" ? "<div>Kind attn.,</div>" : ""}
      <div class="fw-700">${escapeHtml(q.recipientName || "")}</div>
      ${q.recipientDesignation ? `<div>${escapeHtml(q.recipientDesignation)}</div>` : ""}
      <div>${escapeHtml(q.customer || "")}</div>
      ${q.recipientEmail ? `<div>Email: ${escapeHtml(q.recipientEmail)}</div>` : ""}
      ${q.recipientMobile ? `<div>Mob: ${escapeHtml(q.recipientMobile)}</div>` : ""}
    </div>
    ${q.docFormat === "standard" && q.greeting ? `<div class="fw-700 mb-2">${escapeHtml(q.greeting)}</div>` : ""}
    <div class="qd-doc-subject">Sub: ${escapeHtml(q.subject || "")}</div>
    ${q.introText ? `<div class="qd-doc-intro">${escapeHtml(q.introText)}</div>` : ""}`;

  if (q.docFormat === "techno_detailed") {
    if (q.companyHighlights && q.companyHighlights.length) html += `<div class="qd-doc-section-title">Why Choose Us</div><ul class="qd-bullet-list">${q.companyHighlights.map(t => `<li>${escapeHtml(t)}</li>`).join("")}</ul>`;
    if (q.approvals && q.approvals.length) html += `<div class="qd-doc-section-title">Approvals &amp; Recommendations</div><ul class="qd-bullet-list">${q.approvals.map(t => `<li>${escapeHtml(t)}</li>`).join("")}</ul>`;
    if (q.majorProjects && q.majorProjects.length) html += `<div class="qd-doc-section-title">Major Projects</div><table class="qd-doc-items-table" style="margin-bottom:6px;"><tbody>${q.majorProjects.map((t, i) => `<tr><td style="width:10%;text-align:center;">${i + 1}</td><td>${escapeHtml(t)}</td></tr>`).join("")}</tbody></table>`;
    if (q.itemsNote) html += `<div class="fw-700 mb-2">${escapeHtml(q.itemsNote)}</div>`;
  }

  html += qdItemsTableHtml(q.items || [], showUomQty, null);
  if (q.secondGroup && q.secondGroup.enabled) html += qdItemsTableHtml(q.secondGroup.items || [], true, q.secondGroup.title);

  html += `<table class="qd-doc-items-table">
    ${q.gstMode === "ADD" ? `<tr class="total-row"><td colspan="${showUomQty ? 4 : 1}">GST ${q.gstPercent}%</td><td class="num">${formatCurrency(totals.gstAmt)}</td></tr>` : q.gstMode === "EXCLUDE" ? `<tr class="total-row"><td colspan="${showUomQty ? 4 : 1}">GST ${q.gstPercent}% (Excluded)</td><td class="num">—</td></tr>` : ""}
    <tr class="total-row"><td colspan="${showUomQty ? 4 : 1}">TOTAL</td><td class="num">${formatCurrency(totals.grand)}</td></tr>
  </table>`;

  html += `<div class="qd-doc-words">In Words: ${amountInWords(totals.grand)}</div>`;

  const termsClass = q.docFormat === "techno_simple" ? "qd-bullet-list" : "qd-bullet-list numbered";
  html += `<div class="qd-doc-section-title">Terms and Conditions${q.docFormat === "techno_simple" ? ":" : ""}</div><ul class="${termsClass}">${(q.termsAndConditions || []).map(t => `<li>${escapeHtml(t)}</li>`).join("")}</ul>`;

  if (q.docFormat === "techno_simple" && q.scopeOfWork) {
    html += `<div class="qd-doc-section-title">Scope of Work</div><div style="white-space:pre-wrap;">${escapeHtml(q.scopeOfWork)}</div>`;
  }
  if (q.docFormat === "techno_detailed" && q.showBankDetails !== false) {
    html += `<table class="qd-doc-bank-table">
      <tr><td colspan="2" style="text-align:center;font-weight:800;">Bank Details</td></tr>
      <tr><td>Name of the Beneficiary</td><td>${escapeHtml(q.bankAccountHolder || "—")}</td></tr>
      <tr><td>Bank</td><td>${escapeHtml(q.bankName || "—")}</td></tr>
      <tr><td>Branch</td><td>${escapeHtml(q.bankBranch || "—")}</td></tr>
      <tr><td>Account Type</td><td>${escapeHtml(q.bankAccountType || "—")}</td></tr>
      <tr><td>Account No</td><td>${escapeHtml(q.bankAccountNo || "—")}</td></tr>
      <tr><td>IFSC Code</td><td>${escapeHtml(q.bankIFSC || "—")}</td></tr>
    </table>`;
  }
  if (q.docFormat === "standard" && q.highlightNote) html += `<div class="qd-doc-terms-value" style="text-align:center;font-weight:700;border:1px solid var(--qd-line);padding:6px;margin-bottom:10px;">${escapeHtml(q.highlightNote)}</div>`;
  if (q.docFormat === "standard" && q.closingText) html += `<div class="mb-2" style="white-space:pre-wrap;">${escapeHtml(q.closingText)}</div>`;

  html += `<div class="qd-doc-sign">
    <div>${q.docFormat === "standard" ? "for " + escapeHtml(q.companyName || "") + "," : "Regards"}</div>
    <div class="fw-700">${escapeHtml(q.authorizedName || "")}</div>
    <div>${escapeHtml(q.authorizedDesignation || "")}</div>
    ${q.authorizedMobile ? `<div>Mob: ${escapeHtml(q.authorizedMobile)}</div>` : ""}
  </div></div>`;

  document.getElementById("quotePreviewBody").innerHTML = html;
}

document.addEventListener("layout:ready", renderQuotationsPage);
