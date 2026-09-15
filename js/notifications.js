/* ==========================================================================
   Notification Center
   ========================================================================== */

let activeNotifCategory = "All";
const NOTIF_CATEGORIES = ["All", "Leads", "Follow-ups", "Payments", "Invoices", "Quotations", "System"];

function renderNotificationsPage() {
  if (!window.__notifPageWired) {
    window.__notifPageWired = true;
    document.getElementById("markAllReadPageBtn").addEventListener("click", () => {
      DB.notifications.forEach(n => n.read = true);
      saveDB();
      showToast("All notifications marked as read.", "success");
      renderNotificationsPage();
    });
  }

  document.getElementById("notifCategoryTabs").innerHTML = NOTIF_CATEGORIES.map(c => `<div class="pill-tab notif-cat-tab ${c === activeNotifCategory ? "active" : ""}" data-cat="${c}">${c}</div>`).join("");
  document.querySelectorAll(".notif-cat-tab").forEach(tab => {
    tab.addEventListener("click", () => { activeNotifCategory = tab.dataset.cat; renderNotificationsPage(); });
  });

  const list = activeNotifCategory === "All" ? DB.notifications : DB.notifications.filter(n => n.category === activeNotifCategory);
  const sorted = list.slice().sort((a, b) => new Date(b.time) - new Date(a.time));

  document.getElementById("notifListBody").innerHTML = sorted.length ? sorted.map(n => {
    const [ic, cls] = NOTIF_ICON_MAP[n.type] || ["info", "act-lead"];
    return `<div class="notif-row ${n.read ? "" : "unread"}" style="cursor:default;">
      <div class="notif-icon ${cls}">${icon(ic)}</div>
      <div class="notif-body">
        <div class="flex items-center gap-2"><span class="badge badge-neutral">${n.category}</span>${!n.read ? `<span class="badge badge-primary">New</span>` : ""}</div>
        <div class="notif-msg mt-1">${n.message}</div>
        <div class="notif-time">${formatDateTime(n.time)}</div>
      </div>
      <div class="flex gap-1" style="flex-shrink:0;">
        ${!n.read ? `<button class="btn btn-ghost btn-sm" data-nact="read" data-nid="${n.id}" title="Mark as read">${icon("check")}</button>` : ""}
        <a href="${n.link}" class="btn btn-ghost btn-sm" title="Open">${icon("eye")}</a>
        <button class="btn btn-ghost btn-sm" data-nact="delete" data-nid="${n.id}" title="Delete">${icon("trash")}</button>
      </div>
    </div>`;
  }).join("") : `<div class="empty-state"><div class="empty-icon">${icon("bell")}</div><h4>No notifications</h4><p>You're all caught up in this category.</p></div>`;

  document.querySelectorAll("[data-nact]").forEach(btn => {
    btn.addEventListener("click", () => {
      const n = DB.notifications.find(x => x.id === btn.dataset.nid);
      if (btn.dataset.nact === "read") { n.read = true; saveDB(); renderNotificationsPage(); }
      if (btn.dataset.nact === "delete") {
        const idx = DB.notifications.findIndex(x => x.id === btn.dataset.nid);
        if (idx > -1) DB.notifications.splice(idx, 1);
        saveDB();
        showToast("Notification deleted.", "success");
        renderNotificationsPage();
      }
    });
  });
}

document.addEventListener("layout:ready", renderNotificationsPage);
