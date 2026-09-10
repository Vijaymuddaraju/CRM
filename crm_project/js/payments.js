/* ==========================================================================
   Payments page — records + summary
   ========================================================================== */

let paymentsTable;

function renderPaymentsPage() {
  renderPaymentSummary();
  document.getElementById("paymentMethodFilter").innerHTML = `<option value="">All Methods</option>` + PAYMENT_METHODS.map(m => `<option>${m}</option>`).join("");
  document.getElementById("paymentStatusFilter").innerHTML = `<option value="">All Statuses</option>` + ["Completed", "Pending"].map(s => `<option>${s}</option>`).join("");

  paymentsTable = createTableController({
    data: DB.payments, pageSize: 8,
    mountBodyId: "paymentsTableBody", mountPaginationId: "paymentsPagination", mountCountId: "paymentsCount",
    filterFn: buildPaymentFilter(), renderRow: renderPaymentRow,
  });
  paymentsTable.render();

  document.getElementById("recordPaymentBtn").addEventListener("click", () => openPaymentModal());
  ["paymentSearchInput", "paymentMethodFilter", "paymentStatusFilter"].forEach(id => {
    document.getElementById(id).addEventListener(id === "paymentSearchInput" ? "input" : "change", debounce(refreshPayments, 150));
  });
  injectPaymentModal();
  document.addEventListener("payment:saved", () => { renderPaymentSummary(); refreshPayments(); });
}

function renderPaymentSummary() {
  const totalReceived = DB.payments.filter(p => p.status === "Completed").reduce((s, p) => s + p.amount, 0);
  const pending = DB.payments.filter(p => p.status === "Pending").reduce((s, p) => s + (p.amount || 0), 0);
  const overdueInvoices = DB.invoices.filter(i => i.status === "Overdue").reduce((s, i) => s + (i.amount - i.paidAmount), 0);
  document.getElementById("paymentSummary").innerHTML = `
    <div class="kpi-card" style="cursor:default;">
      <div class="kpi-card-top"><div class="kpi-icon" style="background:var(--success-soft);color:var(--success);">${icon("checkCircle")}</div></div>
      <div class="kpi-value">${formatCurrency(totalReceived)}</div><div class="kpi-label">Total Received</div>
    </div>
    <div class="kpi-card" style="cursor:default;">
      <div class="kpi-card-top"><div class="kpi-icon" style="background:var(--warning-soft);color:var(--warning);">${icon("clock")}</div></div>
      <div class="kpi-value">${formatCurrency(pending)}</div><div class="kpi-label">Pending</div>
    </div>
    <div class="kpi-card" style="cursor:default;">
      <div class="kpi-card-top"><div class="kpi-icon" style="background:var(--danger-soft);color:var(--danger);">${icon("alertCircle")}</div></div>
      <div class="kpi-value">${formatCurrency(overdueInvoices)}</div><div class="kpi-label">Overdue</div>
    </div>`;
}

function buildPaymentFilter() {
  const term = document.getElementById("paymentSearchInput").value.trim().toLowerCase();
  const method = document.getElementById("paymentMethodFilter").value;
  const status = document.getElementById("paymentStatusFilter").value;
  return (p) => {
    if (term && !(p.id.toLowerCase().includes(term) || p.customer.toLowerCase().includes(term))) return false;
    if (method && p.method !== method) return false;
    if (status && p.status !== status) return false;
    return true;
  };
}
function refreshPayments() { paymentsTable.data = DB.payments; paymentsTable.refresh(buildPaymentFilter()); }

function renderPaymentRow(p) {
  return `<tr>
    <td class="cell-primary">${p.id}</td>
    <td>${p.customer}</td>
    <td class="cell-muted">${p.invoiceId || "—"}</td>
    <td>${formatCurrency(p.amount)}</td>
    <td class="cell-muted">${formatDate(p.date)}</td>
    <td>${p.method}</td>
    <td class="cell-muted">${p.reference || "—"}</td>
    <td>${statusBadge(p.status)}</td>
  </tr>`;
}

document.addEventListener("layout:ready", renderPaymentsPage);
