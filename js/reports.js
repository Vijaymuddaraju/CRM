/* ==========================================================================
   Profit & Reports — financial overview
   ========================================================================== */

function renderReportsPage() {
  populateReportFilters();
  computeAndRenderReports();
  document.getElementById("reportMonthFrom").addEventListener("change", computeAndRenderReports);
  document.getElementById("reportMonthTo").addEventListener("change", computeAndRenderReports);
  document.getElementById("resetReportFilterBtn").addEventListener("click", () => {
    document.getElementById("reportMonthFrom").value = "Apr";
    document.getElementById("reportMonthTo").value = "Sep";
    computeAndRenderReports();
  });
}

function populateReportFilters() {
  const months = MONTHLY_FINANCE.map(m => m.month);
  ["reportMonthFrom", "reportMonthTo"].forEach(id => {
    document.getElementById(id).innerHTML = months.map(m => `<option value="${m}">${m} 2026</option>`).join("");
  });
  document.getElementById("reportMonthFrom").value = months[0];
  document.getElementById("reportMonthTo").value = months[months.length - 1];
}

function computeAndRenderReports() {
  const months = MONTHLY_FINANCE.map(m => m.month);
  const fromIdx = months.indexOf(document.getElementById("reportMonthFrom").value);
  const toIdx = months.indexOf(document.getElementById("reportMonthTo").value);
  const lo = Math.min(fromIdx, toIdx), hi = Math.max(fromIdx, toIdx);
  const range = MONTHLY_FINANCE.slice(lo, hi + 1);

  const totalIncome = range.reduce((s, m) => s + m.income, 0);
  const totalExpense = range.reduce((s, m) => s + m.expense, 0);
  const netProfit = totalIncome - totalExpense;
  const pendingPayments = DB.invoices.filter(i => i.status !== "Paid").reduce((s, i) => s + (i.amount - i.paidAmount), 0);

  document.getElementById("reportKpis").innerHTML = [
    { label: "Total Income", value: formatCurrency(totalIncome), icon: "trendUp", color: "success" },
    { label: "Total Expenses", value: formatCurrency(totalExpense), icon: "trendDown", color: "danger" },
    { label: "Net Profit", value: formatCurrency(netProfit), icon: "rupee", color: netProfit >= 0 ? "success" : "danger" },
    { label: "Pending Payments", value: formatCurrency(pendingPayments), icon: "alertCircle", color: "warning" },
  ].map(c => `<div class="kpi-card" style="cursor:default;"><div class="kpi-card-top"><div class="kpi-icon" style="background:var(--${c.color}-soft);color:var(--${c.color});">${icon(c.icon)}</div></div><div class="kpi-value">${c.value}</div><div class="kpi-label">${c.label}</div></div>`).join("");

  renderIncomeExpenseChart(range);
  renderMonthlyProfitChart(range);
  renderReportBreakdownTable(range);
}

function renderIncomeExpenseChart(range) {
  const max = Math.max(...range.map(m => Math.max(m.income, m.expense)));
  document.getElementById("incomeExpenseChart").innerHTML = `
    <div class="bar-chart">
      ${range.map(m => `
        <div class="bar-chart-col">
          <div class="bar-chart-bars">
            <div class="bar-chart-bar" data-value="Income: ${formatCurrency(m.income)}" style="height:${(m.income / max) * 100}%;background:var(--success);"></div>
            <div class="bar-chart-bar" data-value="Expense: ${formatCurrency(m.expense)}" style="height:${(m.expense / max) * 100}%;background:var(--danger);"></div>
          </div>
          <div class="bar-chart-label">${m.month}</div>
        </div>`).join("")}
    </div>
    <div class="legend">
      <div class="legend-item"><span class="legend-dot" style="background:var(--success)"></span>Income</div>
      <div class="legend-item"><span class="legend-dot" style="background:var(--danger)"></span>Expenses</div>
    </div>`;
}

function renderMonthlyProfitChart(range) {
  const profits = range.map(m => ({ month: m.month, profit: m.income - m.expense }));
  const max = Math.max(...profits.map(p => Math.abs(p.profit)), 1);
  document.getElementById("monthlyProfitChart").innerHTML = `
    <div class="bar-chart">
      ${profits.map(p => `
        <div class="bar-chart-col">
          <div class="bar-chart-bars">
            <div class="bar-chart-bar" data-value="${formatCurrency(p.profit)}" style="height:${(Math.abs(p.profit) / max) * 100}%;background:${p.profit >= 0 ? "var(--primary)" : "var(--danger)"};width:20px;"></div>
          </div>
          <div class="bar-chart-label">${p.month}</div>
        </div>`).join("")}
    </div>
    <div class="legend"><div class="legend-item"><span class="legend-dot" style="background:var(--primary)"></span>Net Profit</div></div>`;
}

function renderReportBreakdownTable(range) {
  document.getElementById("reportBreakdownBody").innerHTML = range.map(m => {
    const profit = m.income - m.expense;
    const margin = m.income ? Math.round((profit / m.income) * 100) : 0;
    return `<tr>
      <td class="cell-primary">${m.month} 2026</td>
      <td class="text-success">${formatCurrency(m.income)}</td>
      <td class="text-danger">${formatCurrency(m.expense)}</td>
      <td class="${profit >= 0 ? "text-success" : "text-danger"} fw-600">${formatCurrency(profit)}</td>
      <td>${margin}%</td>
    </tr>`;
  }).join("");
}

document.addEventListener("layout:ready", renderReportsPage);
