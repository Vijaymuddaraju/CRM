/* ==========================================================================
   Admin Dashboard logic
   ========================================================================== */

const STATUS_COLORS = {
  New: "#0891b2", Contacted: "#4f46e5", "Follow-up": "#d97706",
  Qualified: "#7c3aed", Converted: "#16a34a", Lost: "#dc2626",
};

function renderAdminDashboard() {
  renderAdminKpis();
  renderLeadOverviewDonut();
  renderSalesOverviewChart();
  renderFollowupOverview();
  renderRecentLeadsTable();
  renderRecentActivities();
}

function renderAdminKpis() {
  const leads = DB.leads;
  const totalLeads = leads.length;
  const newLeads = leads.filter(l => l.status === "New").length;
  const activeLeads = leads.filter(l => !["Converted", "Lost"].includes(l.status)).length;
  const convertedLeads = leads.filter(l => l.status === "Converted").length;

  const today = "2026-09-10";
  const followupsToday = DB.followups.filter(f => f.date === today && f.status !== "Completed").length;
  const pendingFollowups = DB.followups.filter(f => f.status === "Pending" || f.status === "Overdue").length;

  const totalQuotations = DB.quotations.length;
  const pendingQuotations = DB.quotations.filter(q => q.status === "Sent" || q.status === "Draft").length;

  const totalInvoices = DB.invoices.length;
  const pendingPayments = DB.invoices.filter(i => i.status !== "Paid").reduce((s, i) => s + (i.amount - i.paidAmount), 0);

  const totalIncome = DB.income.reduce((s, i) => s + i.amount, 0);
  const totalExpenses = DB.expenses.reduce((s, e) => s + e.amount, 0);
  const netProfit = totalIncome - totalExpenses;

  const cards = [
    { label: "Total Leads", value: totalLeads, icon: "leads", color: "primary", trend: "+12% this month", up: true, href: "leads.html" },
    { label: "New Leads", value: newLeads, icon: "plus", color: "info", trend: "since last week", href: "leads.html?status=New" },
    { label: "Active Leads", value: activeLeads, icon: "target", color: "warning", trend: "in pipeline", href: "leads.html" },
    { label: "Converted Leads", value: convertedLeads, icon: "checkCircle", color: "success", trend: "+2 this month", up: true, href: "leads.html?status=Converted" },
    { label: "Follow-ups Today", value: followupsToday, icon: "clock", color: "info", trend: "due today", href: "followups.html" },
    { label: "Pending Follow-ups", value: pendingFollowups, icon: "alertCircle", color: "warning", trend: "needs action", href: "followups.html" },
    { label: "Total Quotations", value: totalQuotations, icon: "quotations", color: "primary", trend: "all time", href: "quotations.html" },
    { label: "Pending Quotations", value: pendingQuotations, icon: "fileText", color: "warning", trend: "awaiting response", href: "quotations.html" },
    { label: "Total Invoices", value: totalInvoices, icon: "invoices", color: "primary", trend: "all time", href: "invoices.html" },
    { label: "Pending Payments", value: formatCurrency(pendingPayments), icon: "rupee", color: "danger", trend: "outstanding", href: "payments.html" },
    { label: "Total Income", value: formatCurrency(totalIncome), icon: "trendUp", color: "success", trend: "+8.2% vs last month", up: true, href: "income.html" },
    { label: "Total Expenses", value: formatCurrency(totalExpenses), icon: "trendDown", color: "danger", trend: "+4.1% vs last month", href: "expenses.html" },
    { label: "Net Profit", value: formatCurrency(netProfit), icon: "reports", color: "success", trend: "healthy margin", up: true, href: "reports.html" },
  ];

  document.getElementById("kpiGrid").innerHTML = cards.map(c => `
    <div class="kpi-card" data-href="${c.href}">
      <div class="kpi-card-top">
        <div class="kpi-icon" style="background:var(--${c.color}-soft);color:var(--${c.color});">${icon(c.icon)}</div>
      </div>
      <div class="kpi-value">${c.value}</div>
      <div class="kpi-label">${c.label}</div>
      ${c.trend ? `<div class="kpi-trend ${c.up ? "up" : ""}">${c.up ? icon("trendUp") : ""}${c.trend}</div>` : ""}
    </div>`).join("");
  document.querySelectorAll(".kpi-card").forEach(card => card.addEventListener("click", () => window.location.href = card.dataset.href));
}

function renderLeadOverviewDonut() {
  const counts = LEAD_STATUSES.map(s => ({ status: s, count: DB.leads.filter(l => l.status === s).length }));
  const total = counts.reduce((s, c) => s + c.count, 0) || 1;
  let acc = 0;
  const stops = counts.map(c => {
    const start = (acc / total) * 100;
    acc += c.count;
    const end = (acc / total) * 100;
    return `${STATUS_COLORS[c.status]} ${start}% ${end}%`;
  }).join(", ");

  document.getElementById("leadDonutChart").innerHTML = `
    <div class="donut-wrap">
      <div class="donut-chart">
        <div style="width:150px;height:150px;border-radius:50%;background:conic-gradient(${stops});display:flex;align-items:center;justify-content:center;">
          <div style="width:96px;height:96px;border-radius:50%;background:var(--surface);display:flex;flex-direction:column;align-items:center;justify-content:center;">
            <div class="donut-center-value">${total}</div>
            <div class="donut-center-label">Total Leads</div>
          </div>
        </div>
      </div>
      <div class="legend" style="flex-direction:column;align-items:flex-start;margin-top:0;">
        ${counts.map(c => `<div class="legend-item"><span class="legend-dot" style="background:${STATUS_COLORS[c.status]}"></span>${c.status} <b style="margin-left:auto;color:var(--text);">${c.count}</b></div>`).join("")}
      </div>
    </div>`;
}

function renderSalesOverviewChart() {
  const max = Math.max(...MONTHLY_FINANCE.map(m => m.income));
  document.getElementById("salesBarChart").innerHTML = `
    <div class="bar-chart">
      ${MONTHLY_FINANCE.map(m => `
        <div class="bar-chart-col">
          <div class="bar-chart-bars">
            <div class="bar-chart-bar" data-value="${formatCurrency(m.income)}" style="height:${(m.income / max) * 100}%;background:var(--primary);"></div>
          </div>
          <div class="bar-chart-label">${m.month}</div>
        </div>`).join("")}
    </div>
    <div class="legend">
      <div class="legend-item"><span class="legend-dot" style="background:var(--primary)"></span>Monthly Income</div>
    </div>`;
}

function renderFollowupOverview() {
  const today = "2026-09-10";
  const todays = DB.followups.filter(f => f.date === today && f.status !== "Completed").length;
  const overdue = DB.followups.filter(f => f.status === "Overdue" || (f.date < today && f.status === "Pending")).length;
  const upcoming = DB.followups.filter(f => f.date > today && f.status === "Pending").length;
  document.getElementById("followupOverview").innerHTML = `
    <div class="mini-stat-row">
      <div class="mini-stat"><b class="text-primary">${todays}</b><span>Today</span></div>
      <div class="mini-stat"><b class="text-danger">${overdue}</b><span>Overdue</span></div>
      <div class="mini-stat"><b class="text-success">${upcoming}</b><span>Upcoming</span></div>
    </div>`;
}

function renderRecentLeadsTable() {
  const rows = DB.leads.slice().sort((a, b) => new Date(b.created) - new Date(a.created)).slice(0, 6);
  document.getElementById("recentLeadsBody").innerHTML = rows.map(l => `
    <tr>
      <td>
        <div class="cell-with-avatar">
          <div class="avatar avatar-sm">${initials(l.name)}</div>
          <div><div class="cwa-name">${l.company}</div><div class="cwa-sub">${l.name}</div></div>
        </div>
      </td>
      <td class="cell-muted">${l.phone}</td>
      <td>${l.source}</td>
      <td>${userName(l.assignedTo)}</td>
      <td>${statusBadge(l.status)}</td>
      <td>${priorityDot(l.priority)}</td>
      <td class="cell-muted">${formatDate(l.nextFollowup)}</td>
      <td class="cell-actions">
        <a href="lead-details.html?id=${l.id}" class="btn btn-secondary btn-sm">${icon("eye")} View</a>
      </td>
    </tr>`).join("");
}

const ACTIVITY_ICON_MAP = { lead: "leads", followup: "followups", quote: "quotations", invoice: "invoices", payment: "payments", expense: "expenses" };
function renderRecentActivities() {
  document.getElementById("recentActivities").innerHTML = `
    <div class="timeline">
      ${DB.activities.slice(0, 6).map(a => `
        <div class="timeline-item">
          <div class="timeline-dot act-${a.type}">${icon(ACTIVITY_ICON_MAP[a.type] || "info")}</div>
          <div class="timeline-content">
            <div class="timeline-title">${a.message}</div>
            <div class="timeline-time">${timeAgo(a.time)}</div>
          </div>
        </div>`).join("")}
    </div>`;
}

document.addEventListener("layout:ready", renderAdminDashboard);
