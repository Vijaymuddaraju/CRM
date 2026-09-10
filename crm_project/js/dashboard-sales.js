/* ==========================================================================
   Sales Dashboard logic — scoped entirely to the logged-in salesperson.
   ========================================================================== */

function renderSalesDashboard() {
  const user = CURRENT_LAYOUT_USER;
  const myLeads = DB.leads.filter(l => l.assignedTo === user.id);
  const myFollowups = DB.followups.filter(f => f.salesperson === user.id);
  const today = "2026-09-10";

  const kpis = [
    { label: "My Total Leads", value: myLeads.length, icon: "leads", color: "primary", href: "leads.html" },
    { label: "New Leads", value: myLeads.filter(l => l.status === "New").length, icon: "plus", color: "info", href: "leads.html?status=New" },
    { label: "Leads to Contact", value: myLeads.filter(l => l.status === "New" || l.status === "Contacted").length, icon: "phone", color: "warning", href: "leads.html" },
    { label: "Follow-ups Today", value: myFollowups.filter(f => f.date === today && f.status !== "Completed").length, icon: "clock", color: "info", href: "followups.html" },
    { label: "Overdue Follow-ups", value: myFollowups.filter(f => f.status === "Overdue").length, icon: "alertCircle", color: "danger", href: "followups.html" },
    { label: "Qualified Leads", value: myLeads.filter(l => l.status === "Qualified").length, icon: "target", color: "primary", href: "leads.html?status=Qualified" },
    { label: "Converted Leads", value: myLeads.filter(l => l.status === "Converted").length, icon: "checkCircle", color: "success", href: "leads.html?status=Converted" },
    { label: "Expected Sales Value", value: formatCurrency(myLeads.reduce((s, l) => s + (l.expectedValue || 0), 0)), icon: "rupee", color: "success", href: "leads.html" },
  ];

  document.getElementById("kpiGrid").innerHTML = kpis.map(c => `
    <div class="kpi-card" data-href="${c.href}">
      <div class="kpi-card-top"><div class="kpi-icon" style="background:var(--${c.color}-soft);color:var(--${c.color});">${icon(c.icon)}</div></div>
      <div class="kpi-value">${c.value}</div>
      <div class="kpi-label">${c.label}</div>
    </div>`).join("");
  document.querySelectorAll(".kpi-card").forEach(card => card.addEventListener("click", () => window.location.href = card.dataset.href));

  // Today's follow-ups
  const todaysFollowups = myFollowups.filter(f => f.date === today && f.status !== "Completed");
  document.getElementById("todaysFollowups").innerHTML = todaysFollowups.length ? todaysFollowups.map(f => {
    const lead = getLeadById(f.leadId);
    return `<div class="timeline-item">
      <div class="timeline-dot act-followup">${icon("followups")}</div>
      <div class="timeline-content">
        <div class="timeline-title">${lead ? lead.company : f.leadId} — ${f.type}</div>
        <div class="timeline-desc">${f.notes || "No notes added."}</div>
        <div class="timeline-time">${f.time} today</div>
      </div>
    </div>`;
  }).join("") : emptyStateHtml("No follow-ups today", "You're all caught up for today.", "followups.html", "View Follow-ups");

  // My recent leads
  const recent = myLeads.slice().sort((a, b) => new Date(b.created) - new Date(a.created)).slice(0, 6);
  document.getElementById("myRecentLeadsBody").innerHTML = recent.length ? recent.map(l => `
    <tr>
      <td>
        <div class="cell-with-avatar">
          <div class="avatar avatar-sm">${initials(l.name)}</div>
          <div><div class="cwa-name">${l.company}</div><div class="cwa-sub">${l.name}</div></div>
        </div>
      </td>
      <td class="cell-muted">${l.phone}</td>
      <td>${statusBadge(l.status)}</td>
      <td>${priorityDot(l.priority)}</td>
      <td class="cell-muted">${formatDate(l.nextFollowup)}</td>
      <td class="cell-actions"><a href="lead-details.html?id=${l.id}" class="btn btn-secondary btn-sm">${icon("eye")} View</a></td>
    </tr>`).join("") : `<tr><td colspan="6"><div class="empty-state">${emptyStateHtml("No leads yet", "Leads assigned to you will show up here.", "leads.html", "Go to Leads")}</div></td></tr>`;

  // Performance
  const won = myLeads.filter(l => l.status === "Converted").length;
  const lost = myLeads.filter(l => l.status === "Lost").length;
  const totalClosed = won + lost || 1;
  const winRate = Math.round((won / totalClosed) * 100);
  const myQuotations = DB.quotations.filter(q => q.createdBy === user.id);
  const acceptedQuotes = myQuotations.filter(q => q.status === "Accepted").length;
  document.getElementById("perfList").innerHTML = `
    <div class="perf-row"><span class="perf-name">Win Rate</span><span class="perf-value text-success">${winRate}%</span></div>
    <div class="perf-row"><span class="perf-name">Leads Converted</span><span class="perf-value">${won}</span></div>
    <div class="perf-row"><span class="perf-name">Quotations Sent</span><span class="perf-value">${myQuotations.length}</span></div>
    <div class="perf-row"><span class="perf-name">Quotations Accepted</span><span class="perf-value">${acceptedQuotes}</span></div>
    <div class="perf-row"><span class="perf-name">Expected Pipeline Value</span><span class="perf-value">${formatCurrency(myLeads.reduce((s, l) => s + (l.expectedValue || 0), 0))}</span></div>
  `;

  // Upcoming activities (next 5 calendar events for this user)
  const upcoming = DB.calendarEvents.filter(e => e.assignedTo === user.id && e.date >= today).sort((a, b) => new Date(a.date + " " + a.time) - new Date(b.date + " " + b.time)).slice(0, 5);
  document.getElementById("upcomingActivities").innerHTML = upcoming.length ? upcoming.map(e => `
    <div class="timeline-item">
      <div class="timeline-dot act-lead">${icon("calendar")}</div>
      <div class="timeline-content">
        <div class="timeline-title">${e.title}</div>
        <div class="timeline-time">${formatDate(e.date)} · ${e.time}</div>
      </div>
    </div>`).join("") : emptyStateHtml("No upcoming activities", "Your schedule is clear.", "calendar.html", "Open Calendar");

  // Recent notifications
  const myNotifs = DB.notifications.slice(0, 5);
  document.getElementById("recentNotifs").innerHTML = myNotifs.map(n => `
    <div class="notif-row ${n.read ? "" : "unread"}" style="cursor:pointer;" data-link="${n.link}">
      <div class="notif-icon act-lead">${icon("bell")}</div>
      <div class="notif-body"><div class="notif-msg">${n.message}</div><div class="notif-time">${timeAgo(n.time)}</div></div>
    </div>`).join("");
  document.querySelectorAll("#recentNotifs .notif-row").forEach(r => r.addEventListener("click", () => window.location.href = r.dataset.link));
}

function emptyStateHtml(title, desc, href, cta) {
  return `<div class="empty-state">
    <div class="empty-icon">${icon("info")}</div>
    <h4>${title}</h4>
    <p>${desc}</p>
    ${href ? `<a href="${href}" class="btn btn-primary btn-sm">${cta}</a>` : ""}
  </div>`;
}

document.addEventListener("layout:ready", renderSalesDashboard);
