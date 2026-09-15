/* ==========================================================================
   Admin Dashboard logic
   ========================================================================== */

function renderAdminDashboard() {
  renderAdminKpis();
  renderRecentLeadsTable();
}

function renderAdminKpis() {
  const leads = DB.leads;
  const totalLeads = leads.length;

  const today = new Date("2026-09-10");
  const oldLeads = leads.filter(l => l.status !== "Converted" && (today - new Date(l.created)) / 86400000 > 30).length;
  const reorderLeads = leads.filter(l => l.leadType === "Old Customer Reorder").length;
  const referralLeads = leads.filter(l => l.leadType === "Referral Lead").length;
  const oldClients = leads.filter(l => l.status === "Converted").length;

  const totalIncome = DB.income.reduce((s, i) => s + i.amount, 0);
  const totalExpenses = DB.expenses.reduce((s, e) => s + e.amount, 0);
  const netProfit = totalIncome - totalExpenses;

  const cards = [
    { label: "Total Leads", value: totalLeads, icon: "leads", color: "primary", trend: "+12% this month", up: true, href: "leads.html" },
    { label: "Old Leads", value: oldLeads, icon: "clock", color: "warning", trend: "older than 30 days", href: "leads.html" },
    { label: "Old Customer Reorders", value: reorderLeads, icon: "refresh", color: "info", trend: "repeat business", href: `leads.html?leadType=${encodeURIComponent("Old Customer Reorder")}` },
    { label: "Referral Leads", value: referralLeads, icon: "target", color: "info", trend: "from referrals", href: `leads.html?leadType=${encodeURIComponent("Referral Lead")}` },
    { label: "Old Clients", value: oldClients, icon: "checkCircle", color: "success", trend: "converted leads", href: "leads.html?status=Converted" },
    { label: "Income", value: formatCurrency(totalIncome), icon: "trendUp", color: "success", trend: "+8.2% vs last month", up: true, href: "income.html" },
    { label: "Expenses", value: formatCurrency(totalExpenses), icon: "trendDown", color: "danger", trend: "+4.1% vs last month", href: "expenses.html" },
    { label: "Profit", value: formatCurrency(netProfit), icon: "reports", color: "success", trend: "healthy margin", up: true, href: "reports.html" },
  ];

  document.getElementById("kpiGrid").innerHTML = cards.map(c => `
    <div class="kpi-card kpi-card-${c.color}" data-href="${c.href}">
      <div class="kpi-card-top">
        <div class="kpi-icon" style="background:var(--${c.color}-soft);color:var(--${c.color});">${icon(c.icon)}</div>
      </div>
      <div class="kpi-value">${c.value}</div>
      <div class="kpi-label">${c.label}</div>
      ${c.trend ? `<div class="kpi-trend ${c.up ? "up" : ""}">${c.up ? icon("trendUp") : ""}${c.trend}</div>` : ""}
    </div>`).join("");
  document.querySelectorAll(".kpi-card").forEach(card => card.addEventListener("click", () => window.location.href = card.dataset.href));
}

function renderRecentLeadsTable() {
  const rows = DB.leads.slice().sort((a, b) => new Date(b.created) - new Date(a.created)).slice(0, 6);
  document.getElementById("recentLeadsBody").innerHTML = rows.map(l => {
    const chance = CONVERSION_CHANCES.find(c => c.value === l.conversionChance);
    return `
    <tr>
      <td>
        <div class="cell-with-avatar" title="${chance ? chance.label : "Conversion chance not set"}">
          <span class="conversion-dot" style="background:${conversionChanceColor(l.conversionChance)};"></span>
          <div class="avatar avatar-sm">${initials(l.name)}</div>
          <div><div class="cwa-name">${l.company}</div><div class="cwa-sub">${l.name}</div></div>
        </div>
      </td>
      <td class="cell-muted" style="white-space:nowrap;">${l.phone}</td>
      <td>${userName(l.assignedTo)}</td>
      <td>${statusBadge(l.status)}</td>
      <td class="cell-muted">${formatDate(l.nextFollowup)}</td>
      <td class="cell-actions">
        <a href="lead-details.html?id=${l.id}" class="btn btn-secondary btn-sm">${icon("eye")} View</a>
      </td>
    </tr>`;
  }).join("");
}

document.addEventListener("layout:ready", renderAdminDashboard);
