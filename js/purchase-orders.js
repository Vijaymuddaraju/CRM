/* ==========================================================================
   Purchase Orders (Admin only) — live document editor
   Add/Edit Purchase Order opens the actual styled PO document (same look as
   the printed/preview version) with every field editable in place — no
   separate plain form. "Preview" shows a read-only, print-ready snapshot.
   ========================================================================== */

let poTable;
let poItems = [];
let poTerms = [];
const PO_STATUSES = ["Draft", "Pending", "Approved", "Completed", "Cancelled"];

function renderPOPage() {
  document.getElementById("poStatusFilter").innerHTML = `<option value="">All Statuses</option>` + PO_STATUSES.map(s => `<option value="${s}">${s}</option>`).join("");
  poTable = createTableController({
    data: DB.purchaseOrders, pageSize: 8,
    mountBodyId: "poTableBody", mountPaginationId: "poPagination", mountCountId: "poCount",
    filterFn: buildPOFilter(), renderRow: renderPORow,
  });
  poTable.render();
  document.getElementById("addPOBtn").addEventListener("click", () => openPODocModal());
  ["poSearchInput", "poStatusFilter"].forEach(id => document.getElementById(id).addEventListener(id === "poSearchInput" ? "input" : "change", debounce(refreshPO, 150)));
  injectPODocModal();
  injectPOPreviewModal();
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
    <td class="cell-primary">${escapeHtml(p.vendor)}</td>
    <td class="cell-muted">${formatDate(p.date)}</td>
    <td class="cell-muted">${formatDate(p.expectedDate)}</td>
    <td>${formatCurrency(p.amount)}</td>
    <td>${statusBadge(p.status)}</td>
    <td class="cell-muted" style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${p.notes || "—"}</td>
    <td class="cell-actions">
      <div class="dropdown" style="display:inline-block;">
        <button class="row-menu-btn">${icon("more")}</button>
        <div class="row-menu-panel">
          <div class="dropdown-item" data-po-act="preview" data-po-id="${p.id}">${icon("eye")} Preview</div>
          <div class="dropdown-item" data-po-act="edit" data-po-id="${p.id}">${icon("edit")} Edit</div>
          <div class="dropdown-item" data-po-act="download" data-po-id="${p.id}">${icon("download")} Download PDF</div>
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
  if (act === "edit") openPODocModal(id);
  if (act === "preview") openPOPreview(id);
  if (act === "download") { openPOPreview(id); setTimeout(() => window.print(), 300); }
  if (act === "approve") { po.status = "Approved"; saveDB(); showToast("Purchase order approved.", "success"); document.dispatchEvent(new CustomEvent("po:saved")); }
  if (act === "complete") { po.status = "Completed"; saveDB(); showToast("Purchase order marked completed.", "success"); document.dispatchEvent(new CustomEvent("po:saved")); }
  if (act === "cancel") { po.status = "Cancelled"; saveDB(); showToast("Purchase order cancelled.", "warning"); document.dispatchEvent(new CustomEvent("po:saved")); }
  if (act === "delete") confirmAction({ title: "Delete Purchase Order", message: `Delete this purchase order? This cannot be undone.`, onConfirm: () => {
    const idx = DB.purchaseOrders.findIndex(x => x.id === id);
    if (idx > -1) DB.purchaseOrders.splice(idx, 1);
    saveDB(); showToast("Purchase order deleted.", "success"); document.dispatchEvent(new CustomEvent("po:saved"));
  }});
});

/* ---------------------------- PO LIVE DOCUMENT EDITOR MODAL ----------------------------
   The editor IS the document: same .po-doc / navy+tan styling as the printable
   preview, with borderless inputs standing in for static text. Click anywhere
   to edit; nothing outside the meta bar needs a separate "form" step. */

function injectPODocModal() {
  if (document.getElementById("poDocModal")) return;
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.id = "poDocModal";
  backdrop.innerHTML = `
    <div class="modal modal-full">
      <div class="modal-header"><h3 id="poDocModalTitle">Add Purchase Order</h3><button class="modal-close" data-close-modal>${icon("x")}</button></div>
      <div class="modal-body">
        <input type="hidden" id="poDocIdInput">

        <div class="po-meta-bar">
          <div class="field"><label>Workflow Status</label><select class="select-field2" id="poStatus">${PO_STATUSES.map(s => `<option>${s}</option>`).join("")}</select></div>
          <div class="field"><label>Expected Date</label><input class="input" type="date" id="poExpectedDate"></div>
          <div class="po-tax-mode-row" id="poTaxModeRow">
            <label><input type="radio" name="poTaxMode" value="NONE"> No Tax</label>
            <label><input type="radio" name="poTaxMode" value="CGST_SGST"> CGST + SGST</label>
            <label><input type="radio" name="poTaxMode" value="IGST"> IGST</label>
          </div>
        </div>

        <div class="po-doc" id="poDocSheet">
          <input class="po-doc-company-name" id="poCompanyName" placeholder="Company Name">
          <div class="po-doc-title-row">
            <div class="po-doc-address-box"><textarea id="poCompanyAddress" rows="3" placeholder="Company Address"></textarea></div>
            <div class="po-doc-meta-box">
              <input class="po-doc-title-badge" id="poTitleInput" value="PURCHASE ORDER">
              <div class="po-doc-meta-row"><span>DATE:</span><input type="date" id="poDate"></div>
              <div class="po-doc-meta-row"><span>PO NO.:</span><input id="poNumberDisplay"></div>
            </div>
          </div>

          <table class="po-doc-info-table">
            <tr><th colspan="2">Company Information</th></tr>
            <tr><td><input id="poCompanyGST" placeholder="GST No."></td><td><input id="poCompanyContact" placeholder="Contact Person / Department"></td></tr>
            <tr><td colspan="2"><input type="email" id="poCompanyEmail" placeholder="Email Address"></td></tr>
            <tr><td><input id="poWoNumber" placeholder="W.O. No. (optional)"></td><td><input type="date" id="poWoDate"></td></tr>
            <tr><td><input id="poMiNumber" placeholder="M.I. No. (optional)"></td><td><input type="date" id="poMiDate"></td></tr>
            <tr><th colspan="2">Supplier <span class="required">*</span></th></tr>
            <tr><td colspan="2">
              <input id="poVendor" list="poVendorList" placeholder="Supplier Name *" style="font-weight:700;">
              <datalist id="poVendorList"></datalist>
            </td></tr>
            <tr><td colspan="2"><textarea id="poSupplierAddress" rows="2" placeholder="Supplier Address"></textarea></td></tr>
            <tr><td><input id="poSupplierContact" placeholder="Contact Person"></td><td><input id="poSupplierMobile" placeholder="Mobile Number"></td></tr>
            <tr><td><input id="poSupplierGST" placeholder="GST No."></td><td><input type="email" id="poSupplierEmail" placeholder="Email Address"></td></tr>
          </table>
          <div class="po-doc-error" id="poVendorError" style="display:none;">Supplier name is required.</div>

          <div class="po-doc-greeting">
            <input id="poGreeting" placeholder="Dear Sir,">
            <textarea id="poIntroMessage" rows="2" placeholder="We are placing our Order for the following materials/services as discussed and confirmed."></textarea>
          </div>

          <table class="po-doc-items-table">
            <thead><tr><th style="width:5%;">#</th><th>Details</th><th style="width:90px;">Unit</th><th class="num" style="width:80px;">Qty</th><th class="num" style="width:120px;">Unit Price</th><th class="num" style="width:120px;">Total</th><th style="width:34px;"></th></tr></thead>
            <tbody id="poItemsBody"></tbody>
          </table>
          <div class="add-row-btn" id="addPOItemBtn">${icon("plus")} Add Item</div>

          <div class="po-doc-bottom-grid" style="margin-top:14px;">
            <table class="po-doc-terms-table">
              <tr><th colspan="3">Terms &amp; Conditions</th></tr>
              <tbody id="poTermsBody"></tbody>
            </table>
            <table class="po-doc-totals-table" id="poTotalsBox"></table>
          </div>
          <div class="add-row-btn" id="addPOTermBtn">${icon("plus")} Add Term</div>

          <div class="po-doc-words" id="poWordsBox"></div>

          <div class="po-doc-auth">
            <div class="po-doc-auth-box">
              <div>Authorized By</div>
              <div class="po-doc-sig-line"></div>
              <input id="poAuthorizedName" placeholder="Name" style="text-align:center;">
              <input id="poAuthorizedDesignation" placeholder="Designation" style="text-align:center;">
            </div>
          </div>
        </div>

        <div class="po-section-title">Internal Notes <span class="optional" style="text-transform:none;font-weight:400;">(not shown on the printed document)</span></div>
        <div class="form-grid">
          <div class="field span-2"><textarea class="textarea" id="poNotes" placeholder="Internal notes..."></textarea></div>
        </div>
      </div>
      <div class="modal-footer spread">
        <button class="btn btn-ghost" id="poPreviewFromEditorBtn" type="button">${icon("eye")} Preview / Print</button>
        <div class="flex gap-2">
          <button class="btn btn-secondary" data-close-modal>Cancel</button>
          <button class="btn btn-primary" id="poDocSaveBtn"><span class="btn-label">Save Purchase Order</span></button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(backdrop);

  document.getElementById("addPOItemBtn").addEventListener("click", () => { poItems.push({ desc: "", unit: "Nos", qty: 1, rate: 0 }); renderPOItems(); updatePOTotals(); });
  document.getElementById("addPOTermBtn").addEventListener("click", () => { poTerms.push({ label: "", value: "" }); renderPOTerms(); });
  document.querySelectorAll('#poTaxModeRow input[name="poTaxMode"]').forEach(r => r.addEventListener("change", () => { renderPOTotals(); }));
  document.getElementById("poVendor").addEventListener("change", (e) => prefillKnownSupplier(e.target.value));
  document.getElementById("poDocSaveBtn").addEventListener("click", submitPODocForm);
  document.getElementById("poPreviewFromEditorBtn").addEventListener("click", () => {
    renderPOPreviewContent(collectPODraft());
    openModal("poPreviewModal");
  });
}

function prefillKnownSupplier(name) {
  const match = DB.purchaseOrders.find(p => p.vendor && p.vendor.toLowerCase() === name.trim().toLowerCase());
  if (!match) return;
  if (!document.getElementById("poSupplierAddress").value) document.getElementById("poSupplierAddress").value = match.supplierAddress || "";
  if (!document.getElementById("poSupplierGST").value) document.getElementById("poSupplierGST").value = match.supplierGST || "";
  if (!document.getElementById("poSupplierContact").value) document.getElementById("poSupplierContact").value = match.supplierContact || "";
  if (!document.getElementById("poSupplierMobile").value) document.getElementById("poSupplierMobile").value = match.supplierMobile || "";
  if (!document.getElementById("poSupplierEmail").value) document.getElementById("poSupplierEmail").value = match.supplierEmail || "";
}

/* ---------- Items (in-document editable rows, focus preserved across re-render) ---------- */
function renderPOItems() {
  const body = document.getElementById("poItemsBody");
  const active = document.activeElement;
  const activeIdx = active && active.closest && active.closest("tr") ? active.closest("tr").dataset.idx : null;
  const activeField = active && active.dataset ? active.dataset.field : null;
  const activeSelStart = active && typeof active.selectionStart === "number" ? active.selectionStart : null;

  body.innerHTML = poItems.map((it, i) => `
    <tr data-idx="${i}">
      <td style="text-align:center;">${i + 1}</td>
      <td class="desc"><input type="text" value="${escapeHtml(it.desc)}" data-field="desc" placeholder="Item description"></td>
      <td><input type="text" value="${escapeHtml(it.unit)}" data-field="unit" placeholder="Nos"></td>
      <td class="num"><input type="number" min="0" value="${it.qty}" data-field="qty"></td>
      <td class="num"><input type="number" min="0" value="${it.rate}" data-field="rate"></td>
      <td class="num">${formatCurrency(poItemLineTotal(it))}</td>
      <td><button class="remove-row-btn" data-remove="${i}">${icon("trash")}</button></td>
    </tr>`).join("");

  body.querySelectorAll("input").forEach(input => {
    input.addEventListener("input", (e) => {
      const idx = e.target.closest("tr").dataset.idx;
      const field = e.target.dataset.field;
      poItems[idx][field] = (field === "desc" || field === "unit") ? e.target.value : Number(e.target.value) || 0;
      renderPOItems();
      updatePOTotals();
    });
  });
  body.querySelectorAll("[data-remove]").forEach(btn => {
    btn.addEventListener("click", () => { poItems.splice(Number(btn.dataset.remove), 1); renderPOItems(); updatePOTotals(); });
  });

  if (activeIdx !== null && activeField) {
    const el = body.querySelector(`tr[data-idx="${activeIdx}"] [data-field="${activeField}"]`);
    if (el) {
      el.focus();
      if (activeSelStart !== null && el.setSelectionRange) { try { el.setSelectionRange(activeSelStart, activeSelStart); } catch (e) {} }
    }
  }
}

function poItemLineTotal(it) { return it.qty * it.rate; }

/* ---------- Terms (in-document editable rows) ---------- */
function renderPOTerms() {
  const body = document.getElementById("poTermsBody");
  const active = document.activeElement;
  const activeIdx = active && active.closest && active.closest("tr") ? active.closest("tr").dataset.idx : null;
  const activeField = active && active.dataset ? active.dataset.field : null;
  const activeSelStart = active && typeof active.selectionStart === "number" ? active.selectionStart : null;

  body.innerHTML = poTerms.map((t, i) => `
    <tr data-idx="${i}">
      <td style="width:40%;"><input type="text" value="${escapeHtml(t.label)}" data-field="label" placeholder="Label e.g. Warranty"></td>
      <td><input type="text" value="${escapeHtml(t.value)}" data-field="value" placeholder="e.g. 1 Year from the date of manufacturing"></td>
      <td style="width:34px;"><button class="remove-row-btn" data-remove-term="${i}">${icon("trash")}</button></td>
    </tr>`).join("") || `<tr><td colspan="3" class="text-faint fs-sm">No terms added yet.</td></tr>`;

  body.querySelectorAll("input").forEach(input => {
    input.addEventListener("input", (e) => {
      const idx = e.target.closest("tr").dataset.idx;
      poTerms[idx][e.target.dataset.field] = e.target.value;
    });
  });
  body.querySelectorAll("[data-remove-term]").forEach(btn => {
    btn.addEventListener("click", () => { poTerms.splice(Number(btn.dataset.removeTerm), 1); renderPOTerms(); });
  });

  if (activeIdx !== null && activeField) {
    const el = body.querySelector(`tr[data-idx="${activeIdx}"] [data-field="${activeField}"]`);
    if (el) {
      el.focus();
      if (activeSelStart !== null && el.setSelectionRange) { try { el.setSelectionRange(activeSelStart, activeSelStart); } catch (e) {} }
    }
  }
}

/* ---------- Totals (skeleton rebuilt on tax-mode change; amounts patched in-place
   on every keystroke so the CGST/SGST/IGST/Other/Discount inputs never lose focus) ---------- */
function currentPOTaxMode() {
  const el = document.querySelector('#poTaxModeRow input[name="poTaxMode"]:checked');
  return el ? el.value : "NONE";
}

function renderPOTotals(overrides) {
  overrides = overrides || {};
  const mode = currentPOTaxMode();
  const cgstPct = mode === "CGST_SGST" ? (overrides.cgstPercent ?? poTotalsFieldValue("poCgstPercent") ?? 9) : 0;
  const sgstPct = mode === "CGST_SGST" ? (overrides.sgstPercent ?? poTotalsFieldValue("poSgstPercent") ?? 9) : 0;
  const igstPct = mode === "IGST" ? (overrides.igstPercent ?? poTotalsFieldValue("poIgstPercent") ?? 18) : 0;
  const otherCharges = overrides.otherCharges ?? poTotalsFieldValue("poOtherCharges") ?? 0;
  const discount = overrides.discount ?? poTotalsFieldValue("poDiscount") ?? 0;

  document.getElementById("poTotalsBox").innerHTML = `
    <tr><td>Subtotal</td><td class="num" id="poSubtotalAmt"></td></tr>
    ${mode === "CGST_SGST" ? `
      <tr><td>CGST (<input type="number" id="poCgstPercent" min="0" max="100" value="${cgstPct}" style="width:50px;">%)</td><td class="num" id="poCgstAmt"></td></tr>
      <tr><td>SGST (<input type="number" id="poSgstPercent" min="0" max="100" value="${sgstPct}" style="width:50px;">%)</td><td class="num" id="poSgstAmt"></td></tr>` : ""}
    ${mode === "IGST" ? `<tr><td>IGST (<input type="number" id="poIgstPercent" min="0" max="100" value="${igstPct}" style="width:50px;">%)</td><td class="num" id="poIgstAmt"></td></tr>` : ""}
    <tr><td>Other Charges (₹)</td><td class="num"><input type="number" id="poOtherCharges" min="0" value="${otherCharges}" style="width:90px;"></td></tr>
    <tr><td>Discount (₹)</td><td class="num"><input type="number" id="poDiscount" min="0" value="${discount}" style="width:90px;"></td></tr>
    <tr class="grand"><td>Grand Total</td><td class="num" id="poGrandAmt"></td></tr>`;

  ["poCgstPercent", "poSgstPercent", "poIgstPercent", "poOtherCharges", "poDiscount"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", updatePOTotals);
  });

  return updatePOTotals();
}

function poTotalsFieldValue(id) {
  const el = document.getElementById(id);
  return el ? (Number(el.value) || 0) : null;
}

function updatePOTotals() {
  const subtotal = poItems.reduce((s, it) => s + poItemLineTotal(it), 0);
  const mode = currentPOTaxMode();
  const cgstPct = mode === "CGST_SGST" ? poTotalsFieldValue("poCgstPercent") || 0 : 0;
  const sgstPct = mode === "CGST_SGST" ? poTotalsFieldValue("poSgstPercent") || 0 : 0;
  const igstPct = mode === "IGST" ? poTotalsFieldValue("poIgstPercent") || 0 : 0;
  const cgstAmt = subtotal * (cgstPct / 100);
  const sgstAmt = subtotal * (sgstPct / 100);
  const igstAmt = subtotal * (igstPct / 100);
  const otherCharges = poTotalsFieldValue("poOtherCharges") || 0;
  const discount = poTotalsFieldValue("poDiscount") || 0;
  const grand = subtotal + cgstAmt + sgstAmt + igstAmt + otherCharges - discount;

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set("poSubtotalAmt", formatCurrency(subtotal));
  set("poCgstAmt", formatCurrency(cgstAmt));
  set("poSgstAmt", formatCurrency(sgstAmt));
  set("poIgstAmt", formatCurrency(igstAmt));
  set("poGrandAmt", formatCurrency(grand));
  const wordsBox = document.getElementById("poWordsBox");
  if (wordsBox) wordsBox.textContent = `Amount in Words: ${amountInWords(grand)}`;

  return { subtotal, cgstPct, sgstPct, igstPct, cgstAmt, sgstAmt, igstAmt, otherCharges, discount, grand, mode };
}

function openPODocModal(id) {
  injectPODocModal();
  document.getElementById("poVendorError").style.display = "none";
  document.getElementById("poVendorList").innerHTML = [...new Set(DB.purchaseOrders.map(p => p.vendor))].map(v => `<option value="${escapeHtml(v)}">`).join("");
  document.getElementById("poDocIdInput").value = id || "";
  const g = DB.settings.general;

  if (id) {
    const p = DB.purchaseOrders.find(x => x.id === id);
    document.getElementById("poDocModalTitle").textContent = `Edit Purchase Order — ${p.id}`;
    document.getElementById("poTitleInput").value = p.poTitle || "PURCHASE ORDER";
    document.getElementById("poNumberDisplay").value = p.poNumberDisplay || p.id;
    document.getElementById("poDate").value = p.date;
    document.getElementById("poExpectedDate").value = p.expectedDate;
    document.getElementById("poWoNumber").value = p.woNumber || "";
    document.getElementById("poWoDate").value = p.woDate || "";
    document.getElementById("poMiNumber").value = p.miNumber || "";
    document.getElementById("poMiDate").value = p.miDate || "";
    document.getElementById("poStatus").value = p.status;
    document.getElementById("poCompanyName").value = p.companyName || g.companyName;
    document.getElementById("poCompanyGST").value = p.companyGST || g.gst || "";
    document.getElementById("poCompanyEmail").value = p.companyEmail || g.companyEmail;
    document.getElementById("poCompanyContact").value = p.companyContact || g.contactPerson || "";
    document.getElementById("poCompanyAddress").value = p.companyAddress || g.address;
    document.getElementById("poVendor").value = p.vendor;
    document.getElementById("poSupplierGST").value = p.supplierGST || "";
    document.getElementById("poSupplierContact").value = p.supplierContact || "";
    document.getElementById("poSupplierMobile").value = p.supplierMobile || "";
    document.getElementById("poSupplierEmail").value = p.supplierEmail || "";
    document.getElementById("poSupplierAddress").value = p.supplierAddress || "";
    document.getElementById("poGreeting").value = p.greeting || "Dear Sir,";
    document.getElementById("poIntroMessage").value = p.introMessage || "We are placing our Order for the following materials/services as discussed and confirmed.";
    poItems = (p.items && p.items.length ? p.items : [{ desc: "", unit: "Nos", qty: 1, rate: 0 }]).map(i => ({ ...i }));
    poTerms = (p.terms && p.terms.length ? p.terms : DEFAULT_PO_TERMS).map(t => ({ ...t }));
    document.querySelector(`#poTaxModeRow input[value="${p.taxMode || "NONE"}"]`).checked = true;
    document.getElementById("poAuthorizedName").value = p.authorizedName || "";
    document.getElementById("poAuthorizedDesignation").value = p.authorizedDesignation || "";
    document.getElementById("poNotes").value = p.notes || "";
    renderPOTotals({ cgstPercent: p.cgstPercent || 0, sgstPercent: p.sgstPercent || 0, igstPercent: p.igstPercent || 0, otherCharges: p.otherCharges || 0, discount: p.discount || 0 });
  } else {
    document.getElementById("poDocModalTitle").textContent = "Add Purchase Order";
    document.getElementById("poTitleInput").value = "PURCHASE ORDER";
    document.getElementById("poNumberDisplay").value = nextId("PO", DB.purchaseOrders);
    document.getElementById("poDate").value = "2026-09-10";
    document.getElementById("poExpectedDate").value = "";
    document.getElementById("poWoNumber").value = "";
    document.getElementById("poWoDate").value = "";
    document.getElementById("poMiNumber").value = "";
    document.getElementById("poMiDate").value = "";
    document.getElementById("poStatus").value = "Draft";
    document.getElementById("poCompanyName").value = g.companyName;
    document.getElementById("poCompanyGST").value = g.gst || "";
    document.getElementById("poCompanyEmail").value = g.companyEmail;
    document.getElementById("poCompanyContact").value = g.contactPerson || "";
    document.getElementById("poCompanyAddress").value = g.address;
    document.getElementById("poVendor").value = "";
    document.getElementById("poSupplierGST").value = "";
    document.getElementById("poSupplierContact").value = "";
    document.getElementById("poSupplierMobile").value = "";
    document.getElementById("poSupplierEmail").value = "";
    document.getElementById("poSupplierAddress").value = "";
    document.getElementById("poGreeting").value = "Dear Sir,";
    document.getElementById("poIntroMessage").value = "We are placing our Order for the following materials/services as discussed and confirmed.";
    poItems = [{ desc: "", unit: "Nos", qty: 1, rate: 0 }];
    poTerms = DEFAULT_PO_TERMS.map(t => ({ ...t }));
    document.querySelector('#poTaxModeRow input[value="NONE"]').checked = true;
    document.getElementById("poAuthorizedName").value = "";
    document.getElementById("poAuthorizedDesignation").value = "";
    document.getElementById("poNotes").value = "";
    renderPOTotals();
  }
  renderPOItems();
  renderPOTerms();
  updatePOTotals();
  openModal("poDocModal");
}

function collectPODraft() {
  const totals = updatePOTotals();
  return {
    poTitle: document.getElementById("poTitleInput").value.trim() || "PURCHASE ORDER",
    poNumberDisplay: document.getElementById("poNumberDisplay").value.trim(),
    date: document.getElementById("poDate").value,
    expectedDate: document.getElementById("poExpectedDate").value,
    woNumber: document.getElementById("poWoNumber").value.trim(),
    woDate: document.getElementById("poWoDate").value,
    miNumber: document.getElementById("poMiNumber").value.trim(),
    miDate: document.getElementById("poMiDate").value,
    status: document.getElementById("poStatus").value,
    companyName: document.getElementById("poCompanyName").value.trim(),
    companyGST: document.getElementById("poCompanyGST").value.trim(),
    companyEmail: document.getElementById("poCompanyEmail").value.trim(),
    companyContact: document.getElementById("poCompanyContact").value.trim(),
    companyAddress: document.getElementById("poCompanyAddress").value.trim(),
    vendor: document.getElementById("poVendor").value.trim(),
    supplierGST: document.getElementById("poSupplierGST").value.trim(),
    supplierContact: document.getElementById("poSupplierContact").value.trim(),
    supplierMobile: document.getElementById("poSupplierMobile").value.trim(),
    supplierEmail: document.getElementById("poSupplierEmail").value.trim(),
    supplierAddress: document.getElementById("poSupplierAddress").value.trim(),
    greeting: document.getElementById("poGreeting").value.trim(),
    introMessage: document.getElementById("poIntroMessage").value.trim(),
    items: poItems.map(i => ({ ...i })),
    taxMode: totals.mode,
    cgstPercent: totals.cgstPct,
    sgstPercent: totals.sgstPct,
    igstPercent: totals.igstPct,
    otherCharges: totals.otherCharges,
    discount: totals.discount,
    amount: Math.round(totals.grand),
    terms: poTerms.map(t => ({ ...t })),
    authorizedName: document.getElementById("poAuthorizedName").value.trim(),
    authorizedDesignation: document.getElementById("poAuthorizedDesignation").value.trim(),
    notes: document.getElementById("poNotes").value.trim(),
  };
}

function submitPODocForm() {
  const vendor = document.getElementById("poVendor").value.trim();
  document.getElementById("poVendorError").style.display = vendor ? "none" : "block";
  if (!vendor) { showToast("Please fill all required fields.", "error"); return; }
  if (!poItems.length || poItems.every(it => !it.desc)) { showToast("Please add at least one item.", "error"); return; }

  const btn = document.getElementById("poDocSaveBtn");
  setBtnLoading(btn, true);
  setTimeout(() => {
    const id = document.getElementById("poDocIdInput").value;
    const draft = collectPODraft();
    if (id) {
      Object.assign(DB.purchaseOrders.find(x => x.id === id), draft);
      showToast("Purchase order updated successfully.", "success");
    } else {
      DB.purchaseOrders.unshift({ id: nextId("PO", DB.purchaseOrders), ...draft });
      showToast("Purchase order created successfully.", "success");
    }
    saveDB();
    setBtnLoading(btn, false);
    closeModal("poDocModal");
    document.dispatchEvent(new CustomEvent("po:saved"));
  }, 600);
}

/* ---------------------------- PREVIEW / PRINT MODAL (read-only snapshot) ---------------------------- */

function injectPOPreviewModal() {
  if (document.getElementById("poPreviewModal")) return;
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.id = "poPreviewModal";
  backdrop.innerHTML = `<div class="modal modal-full">
    <div class="modal-header"><h3>Purchase Order Preview</h3><button class="modal-close" data-close-modal>${icon("x")}</button></div>
    <div class="modal-body" id="poPreviewBody"></div>
    <div class="modal-footer"><button class="btn btn-secondary" data-close-modal>Close</button><button class="btn btn-primary" id="poPrintBtn">${icon("download")} Print / Download PDF</button></div>
  </div>`;
  document.body.appendChild(backdrop);
  document.getElementById("poPrintBtn").addEventListener("click", () => window.print());
}

function openPOPreview(id) {
  const p = DB.purchaseOrders.find(x => x.id === id);
  injectPOPreviewModal();
  renderPOPreviewContent(p);
  openModal("poPreviewModal");
}

function renderPOPreviewContent(p) {
  const subtotal = p.items.reduce((s, it) => s + poItemLineTotal(it), 0);
  const cgstAmt = p.taxMode === "CGST_SGST" ? subtotal * (p.cgstPercent / 100) : 0;
  const sgstAmt = p.taxMode === "CGST_SGST" ? subtotal * (p.sgstPercent / 100) : 0;
  const igstAmt = p.taxMode === "IGST" ? subtotal * (p.igstPercent / 100) : 0;
  const grand = subtotal + cgstAmt + sgstAmt + igstAmt + (p.otherCharges || 0) - (p.discount || 0);

  document.getElementById("poPreviewBody").innerHTML = `
    <div class="po-doc">
      <div class="po-doc-company-name">${escapeHtml(p.companyName || "")}</div>
      <div class="po-doc-title-row">
        <div class="po-doc-address-box">${escapeHtml(p.companyAddress || "")}</div>
        <div class="po-doc-meta-box">
          <div class="po-doc-title-badge">${escapeHtml(p.poTitle || "PURCHASE ORDER")}</div>
          <div class="po-doc-meta-row"><span>DATE:</span><span>${formatDate(p.date)}</span></div>
          <div class="po-doc-meta-row"><span>PO NO.:</span><span>${escapeHtml(p.poNumberDisplay || p.id)}</span></div>
        </div>
      </div>

      <table class="po-doc-info-table">
        <tr><th colspan="2">Company Information</th></tr>
        <tr><td>GST No: ${escapeHtml(p.companyGST || "—")}</td><td>Contact: ${escapeHtml(p.companyContact || "—")}</td></tr>
        <tr><td colspan="2">Email: ${escapeHtml(p.companyEmail || "—")}</td></tr>
        ${p.woNumber ? `<tr><td>W.O. No: ${escapeHtml(p.woNumber)}</td><td>${p.woDate ? formatDate(p.woDate) : ""}</td></tr>` : ""}
        ${p.miNumber ? `<tr><td>M.I. No: ${escapeHtml(p.miNumber)}</td><td>${p.miDate ? formatDate(p.miDate) : ""}</td></tr>` : ""}
        <tr><th colspan="2">Supplier</th></tr>
        <tr><td colspan="2"><b>${escapeHtml(p.vendor)}</b></td></tr>
        <tr><td colspan="2">${escapeHtml(p.supplierAddress || "—")}</td></tr>
        <tr><td>Contact: ${escapeHtml(p.supplierContact || "—")}${p.supplierMobile ? " / " + escapeHtml(p.supplierMobile) : ""}</td><td>Email: ${escapeHtml(p.supplierEmail || "—")}</td></tr>
        <tr><td colspan="2">GST: ${escapeHtml(p.supplierGST || "—")}</td></tr>
      </table>

      <div class="po-doc-greeting">
        <p>${escapeHtml(p.greeting || "Dear Sir,")}</p>
        <p>${escapeHtml(p.introMessage || "")}</p>
      </div>

      <table class="po-doc-items-table">
        <thead><tr><th>Item No.</th><th>Details</th><th>Unit</th><th class="num">Quantity</th><th class="num">Unit Price</th><th class="num">Total</th></tr></thead>
        <tbody>
          ${p.items.map((it, i) => `<tr><td>${i + 1}</td><td class="desc">${escapeHtml(it.desc)}</td><td>${escapeHtml(it.unit || "")}</td><td class="num">${it.qty}</td><td class="num">${formatCurrency(it.rate)}</td><td class="num">${formatCurrency(poItemLineTotal(it))}</td></tr>`).join("")}
        </tbody>
      </table>

      <div class="po-doc-bottom-grid">
        <table class="po-doc-terms-table">
          <tr><th colspan="2">Terms &amp; Conditions</th></tr>
          ${(p.terms || []).map(t => `<tr><td>${escapeHtml(t.label)}</td><td>${escapeHtml(t.value)}</td></tr>`).join("") || `<tr><td colspan="2">—</td></tr>`}
        </table>
        <table class="po-doc-totals-table">
          <tr><td>Subtotal</td><td>${formatCurrency(subtotal)}</td></tr>
          ${p.taxMode === "CGST_SGST" ? `<tr><td>CGST (${p.cgstPercent}%)</td><td>${formatCurrency(cgstAmt)}</td></tr><tr><td>SGST (${p.sgstPercent}%)</td><td>${formatCurrency(sgstAmt)}</td></tr>` : ""}
          ${p.taxMode === "IGST" ? `<tr><td>IGST (${p.igstPercent}%)</td><td>${formatCurrency(igstAmt)}</td></tr>` : ""}
          ${p.otherCharges ? `<tr><td>Other Charges</td><td>${formatCurrency(p.otherCharges)}</td></tr>` : ""}
          ${p.discount ? `<tr><td>Discount</td><td>- ${formatCurrency(p.discount)}</td></tr>` : ""}
          <tr class="grand"><td>Total</td><td>${formatCurrency(grand)}</td></tr>
        </table>
      </div>

      <div class="po-doc-words">Amount in Words: ${amountInWords(grand)}</div>

      <div class="po-doc-auth">
        <div class="po-doc-auth-box">
          <div>Authorized By</div>
          <div class="po-doc-sig-line"></div>
          <div>${escapeHtml(p.authorizedName || "")}${p.authorizedDesignation ? ", " + escapeHtml(p.authorizedDesignation) : ""}</div>
        </div>
      </div>
    </div>`;
}

document.addEventListener("layout:ready", renderPOPage);
