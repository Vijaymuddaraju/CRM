/* ==========================================================================
   LAYOUT ENGINE
   Renders the sidebar + topbar chrome for every protected page based on the
   logged-in user's role. Each page declares:
     window.PAGE = { key: "leads", title: "Leads", breadcrumb: ["Sales Documents"] }
   before this script runs. This keeps every page's HTML limited to its own
   content, which will make the eventual conversion to Laravel Blade
   layouts/components straightforward (this file ~= a Blade layout).
   ========================================================================== */

const NAV_CONFIG = {
  admin: [
    { group: "Main", items: [
      { key: "dashboard", label: "Dashboard", href: "admin-dashboard.html", icon: "dashboard" },
      { key: "leads", label: "Leads", href: "leads.html", icon: "leads" },
      { key: "meetings", label: "Meetings", href: "meetings.html", icon: "meeting" },
      { key: "followups", label: "Follow-ups", href: "followups.html", icon: "followups" },
      { key: "calendar", label: "Calendar", href: "calendar.html", icon: "calendar" },
    ]},
    { group: "Sales Documents", items: [
      { key: "estimations", label: "Estimations", href: "estimations.html", icon: "calculator" },
      { key: "quotations", label: "Quotations", href: "quotations.html", icon: "quotations" },
      { key: "invoices", label: "Invoices", href: "invoices.html", icon: "invoices" },
      { key: "purchase-orders", label: "Purchase Orders", href: "purchase-orders.html", icon: "purchase" },
      { key: "payments", label: "Payments", href: "payments.html", icon: "payments" },
    ]},
    { group: "Finance", items: [
      { key: "expenses", label: "Expenses", href: "expenses.html", icon: "expenses" },
      { key: "income", label: "Income", href: "income.html", icon: "income" },
      { key: "reports", label: "Profit & Reports", href: "reports.html", icon: "reports" },
    ]},
    { group: "Administration", items: [
      { key: "users", label: "Users", href: "users.html", icon: "users" },
      { key: "roles", label: "Roles & Permissions", href: "roles.html", icon: "roles" },
    ]},
    { group: "System", items: [
      { key: "notifications", label: "Notifications", href: "notifications.html", icon: "notifications" },
      { key: "settings", label: "Settings", href: "settings.html", icon: "settings" },
      { key: "profile", label: "Profile", href: "profile.html", icon: "profile" },
      { key: "logout", label: "Logout", href: "#", icon: "logout", action: "logout" },
    ]},
  ],
  sales: [
    { group: "Main", items: [
      { key: "dashboard", label: "Dashboard", href: "sales-dashboard.html", icon: "dashboard" },
      { key: "leads", label: "My Leads", href: "leads.html", icon: "leads" },
      { key: "meetings", label: "Meetings", href: "meetings.html", icon: "meeting" },
      { key: "followups", label: "Follow-ups", href: "followups.html", icon: "followups" },
      { key: "calendar", label: "Calendar", href: "calendar.html", icon: "calendar" },
    ]},
    { group: "Sales", items: [
      { key: "quotations", label: "Quotations", href: "quotations.html", icon: "quotations" },
      { key: "invoices", label: "Invoices", href: "invoices.html", icon: "invoices" },
      { key: "payments", label: "Payments", href: "payments.html", icon: "payments" },
    ]},
    { group: "System", items: [
      { key: "notifications", label: "Notifications", href: "notifications.html", icon: "notifications" },
      { key: "profile", label: "Profile", href: "profile.html", icon: "profile" },
      { key: "logout", label: "Logout", href: "#", icon: "logout", action: "logout" },
    ]},
  ],
};

const PAGE_TITLES = {
  dashboard: "Dashboard", leads: "Leads", "lead-details": "Lead Details", meetings: "Meetings", followups: "Follow-ups",
  calendar: "Calendar", estimations: "Estimations", quotations: "Quotations", invoices: "Invoices", "purchase-orders": "Purchase Orders",
  payments: "Payments", expenses: "Expenses", income: "Income", reports: "Profit & Reports",
  users: "Users", roles: "Roles & Permissions", notifications: "Notifications", settings: "Settings", profile: "Profile",
};

let CURRENT_LAYOUT_USER = null;

function initLayout() {
  const page = window.PAGE || {};
  CURRENT_LAYOUT_USER = requireAuth(page.key);
  if (!CURRENT_LAYOUT_USER) return;
  applyStoredTheme();
  renderSidebar(CURRENT_LAYOUT_USER, page);
  renderTopbar(CURRENT_LAYOUT_USER, page);
  wireShellBehavior();
  renderToastStackIfMissing();
  decorateIconButtons();
  document.dispatchEvent(new CustomEvent("layout:ready", { detail: { user: CURRENT_LAYOUT_USER } }));
}

function renderSidebar(user, page) {
  const mount = document.getElementById("sidebar");
  if (!mount) return;
  const groups = NAV_CONFIG[user.role] || [];
  const activeKey = page.key;
  let html = `
    <div class="sidebar-brand">
      <div class="logo-mark">CR</div>
      <div class="logo-text">CRM<small>${user.role === "admin" ? "Admin Panel" : "Sales Panel"}</small></div>
    </div>
    <nav class="sidebar-nav">`;
  groups.forEach(g => {
    html += `<div class="nav-group"><div class="nav-group-title">${g.group}</div><ul>`;
    g.items.forEach(item => {
      const isActive = item.key === activeKey;
      const badge = item.key === "notifications" ? unreadNotifCount() : 0;
      html += `<li class="nav-item ${isActive ? "active" : ""}">
        <a class="nav-link" href="${item.href}" ${item.action ? `data-action="${item.action}"` : ""} title="${item.label}">
          <span class="nav-icon">${icon(item.icon)}</span>
          <span class="nav-label">${item.label}</span>
          ${badge ? `<span class="nav-badge">${badge}</span>` : ""}
        </a>
      </li>`;
    });
    html += `</ul></div>`;
  });
  html += `</nav>
    <div class="sidebar-footer">
      <button class="sidebar-collapse-btn" id="sidebarCollapseBtn">${icon("sidebarCollapse")}<span class="nav-label">Collapse</span></button>
    </div>`;
  mount.innerHTML = html;

  mount.querySelectorAll('[data-action="logout"]').forEach(el => {
    el.addEventListener("click", (e) => { e.preventDefault(); logout(); });
  });
}

function renderTopbar(user, page) {
  const mount = document.getElementById("topbar");
  if (!mount) return;
  const title = page.title || PAGE_TITLES[page.key] || "Dashboard";
  const crumbs = page.breadcrumb || [];
  const unread = unreadNotifCount();

  mount.innerHTML = `
    <div class="topbar-left">
      <button class="icon-btn mobile-menu-btn" id="mobileMenuBtn">${icon("menu")}</button>
      <button class="icon-btn" id="sidebarToggleBtn" title="Toggle sidebar">${icon("menu")}</button>
      <div class="topbar-title-block">
        <div class="topbar-breadcrumb">
          <span>${user.role === "admin" ? "Admin Panel" : "Sales Panel"}</span>
          ${crumbs.map(c => `<span>/</span><span>${c}</span>`).join("")}
        </div>
        <div class="topbar-page-title">${title}</div>
      </div>
    </div>
    <div class="topbar-right">
      <div class="topbar-search" id="globalSearchTrigger">
        ${icon("search")}
        <span>Search leads, quotations, invoices…</span>
        <kbd>Ctrl K</kbd>
      </div>
      <button class="icon-btn theme-toggle" id="themeToggleBtn" title="Toggle theme">
        ${icon("moon", "icon-moon")}${icon("sun", "icon-sun")}
      </button>
      <div class="dropdown">
        <button class="icon-btn" id="notifBellBtn" title="Notifications">
          ${icon("bell")}
          ${unread ? `<span class="notif-dot">${unread}</span>` : ""}
        </button>
        <div class="dropdown-panel notif-panel" id="notifPanel"></div>
      </div>
      <div class="dropdown">
        <div class="user-menu-trigger" id="userMenuBtn">
          <div class="avatar avatar-md" style="background:${user.avatarColor}22;color:${user.avatarColor}">${initials(user.name)}</div>
          <div>
            <div class="user-menu-name">${user.name}</div>
            <div class="user-menu-role">${user.role === "admin" ? "Administrator" : "Sales Executive"}</div>
          </div>
          ${icon("chevronDown", "chevron")}
        </div>
        <div class="dropdown-panel dropdown-menu" id="userMenuPanel">
          <div class="dropdown-menu-header">
            <div style="font-weight:600;font-size:13px;">${user.name}</div>
            <div class="text-faint" style="font-size:12px;">${user.email}</div>
          </div>
          <a class="dropdown-item" href="profile.html">${icon("profile")} My Profile</a>
          ${user.role === "admin" ? `<a class="dropdown-item" href="settings.html">${icon("settings")} Settings</a>` : ""}
          <a class="dropdown-item danger" href="#" id="logoutMenuItem">${icon("logout")} Logout</a>
        </div>
      </div>
    </div>
  `;

  renderNotifPanel();

  document.getElementById("notifBellBtn").addEventListener("click", (e) => {
    e.stopPropagation();
    toggleDropdown("notifPanel");
  });
  document.getElementById("userMenuBtn").addEventListener("click", (e) => {
    e.stopPropagation();
    toggleDropdown("userMenuPanel");
  });
  document.getElementById("logoutMenuItem").addEventListener("click", (e) => { e.preventDefault(); logout(); });
  document.getElementById("themeToggleBtn").addEventListener("click", toggleTheme);
  document.getElementById("globalSearchTrigger").addEventListener("click", openGlobalSearch);

  document.addEventListener("click", () => {
    document.querySelectorAll(".dropdown-panel.open").forEach(p => p.classList.remove("open"));
  });
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); openGlobalSearch(); }
  });
}

function toggleDropdown(id) {
  const panel = document.getElementById(id);
  const wasOpen = panel.classList.contains("open");
  document.querySelectorAll(".dropdown-panel.open").forEach(p => p.classList.remove("open"));
  if (!wasOpen) panel.classList.add("open");
}

function unreadNotifCount() {
  return DB.notifications.filter(n => !n.read).length;
}

const NOTIF_ICON_MAP = { warning: ["clock", "act-followup"], danger: ["alertCircle", "act-expense"], info: ["info", "act-lead"], success: ["checkCircle", "act-invoice"] };

function renderNotifPanel() {
  const panel = document.getElementById("notifPanel");
  if (!panel) return;
  const list = DB.notifications.slice().sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 8);
  panel.innerHTML = `
    <div class="notif-panel-header">
      <h4>Notifications</h4>
      <button id="markAllReadBtn">Mark all as read</button>
    </div>
    <div class="notif-list">
      ${list.length ? list.map(n => {
        const [iconName, cls] = NOTIF_ICON_MAP[n.type] || ["info", "act-lead"];
        return `<div class="notif-row ${n.read ? "" : "unread"}" data-id="${n.id}" data-link="${n.link}">
          <div class="notif-icon ${cls}">${icon(iconName)}</div>
          <div class="notif-body">
            <div class="notif-msg">${n.message}</div>
            <div class="notif-time">${timeAgo(n.time)}</div>
          </div>
        </div>`;
      }).join("") : `<div class="search-empty">You're all caught up.</div>`}
    </div>
    <div class="notif-panel-footer"><a href="notifications.html">View all notifications</a></div>
  `;
  panel.querySelectorAll(".notif-row").forEach(row => {
    row.addEventListener("click", () => {
      const n = DB.notifications.find(x => x.id === row.dataset.id);
      if (n) { n.read = true; saveDB(); }
      window.location.href = row.dataset.link || "notifications.html";
    });
  });
  const markAllBtn = document.getElementById("markAllReadBtn");
  if (markAllBtn) markAllBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    DB.notifications.forEach(n => n.read = true);
    saveDB();
    renderTopbar(CURRENT_LAYOUT_USER, window.PAGE || {});
    if (typeof renderNotificationsPage === "function") renderNotificationsPage();
  });
}

/* ---------- Theme ---------- */
function applyStoredTheme() {
  const theme = localStorage.getItem("crm_theme") || "light";
  document.documentElement.setAttribute("data-theme", theme);
}
function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("crm_theme", next);
}

/* ---------- Sidebar collapse / mobile ---------- */
function wireShellBehavior() {
  const shell = document.getElementById("appShell");
  if (!shell) return;
  if (localStorage.getItem("crm_sidebar_collapsed") === "1") shell.classList.add("collapsed");

  const collapseBtn = document.getElementById("sidebarCollapseBtn");
  const toggleBtn = document.getElementById("sidebarToggleBtn");
  const mobileBtn = document.getElementById("mobileMenuBtn");
  const overlay = document.getElementById("sidebarOverlay");

  const doCollapseToggle = () => {
    shell.classList.toggle("collapsed");
    localStorage.setItem("crm_sidebar_collapsed", shell.classList.contains("collapsed") ? "1" : "0");
  };
  if (collapseBtn) collapseBtn.addEventListener("click", doCollapseToggle);
  if (toggleBtn) toggleBtn.addEventListener("click", () => {
    if (window.innerWidth <= 992) {
      shell.classList.toggle("mobile-open");
      if (overlay) overlay.classList.toggle("open", shell.classList.contains("mobile-open"));
    } else {
      doCollapseToggle();
    }
  });
  if (mobileBtn) mobileBtn.addEventListener("click", () => {
    shell.classList.toggle("mobile-open");
    if (overlay) overlay.classList.toggle("open", shell.classList.contains("mobile-open"));
  });
  if (overlay) overlay.addEventListener("click", () => {
    shell.classList.remove("mobile-open");
    overlay.classList.remove("open");
  });

  // Nested submenu toggles (for future nested nav items)
  document.querySelectorAll(".nav-item.has-submenu > .nav-link").forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      link.closest(".nav-item").classList.toggle("expanded");
    });
  });
}

function renderToastStackIfMissing() {
  if (!document.getElementById("toastStack")) {
    const stack = document.createElement("div");
    stack.className = "toast-stack";
    stack.id = "toastStack";
    document.body.appendChild(stack);
  }
}

/* ---------- Global search ---------- */
function openGlobalSearch() {
  let backdrop = document.getElementById("globalSearchModal");
  if (!backdrop) {
    backdrop = document.createElement("div");
    backdrop.id = "globalSearchModal";
    backdrop.className = "search-modal-backdrop";
    backdrop.innerHTML = `
      <div class="search-modal">
        <div class="search-input-row">
          ${icon("search")}
          <input type="text" id="globalSearchInput" placeholder="Search leads, quotations, invoices, payments…" autocomplete="off">
          <kbd>Esc</kbd>
        </div>
        <div class="search-results" id="globalSearchResults"></div>
      </div>`;
    document.body.appendChild(backdrop);
    backdrop.addEventListener("click", (e) => { if (e.target === backdrop) closeGlobalSearch(); });
    document.getElementById("globalSearchInput").addEventListener("input", debounce((e) => runGlobalSearch(e.target.value), 150));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeGlobalSearch(); });
  }
  backdrop.classList.add("open");
  document.body.style.overflow = "hidden";
  setTimeout(() => document.getElementById("globalSearchInput").focus(), 50);
  runGlobalSearch("");
}
function closeGlobalSearch() {
  const backdrop = document.getElementById("globalSearchModal");
  if (backdrop) backdrop.classList.remove("open");
  document.body.style.overflow = "";
}
function runGlobalSearch(term) {
  const resultsEl = document.getElementById("globalSearchResults");
  const q = term.trim().toLowerCase();
  const groups = [];

  const leadMatches = DB.leads.filter(l => !q || l.name.toLowerCase().includes(q) || l.company.toLowerCase().includes(q) || l.id.toLowerCase().includes(q)).slice(0, 5);
  if (leadMatches.length) groups.push({ title: "Leads", icon: "leads", items: leadMatches.map(l => ({ title: l.company, sub: `${l.name} · ${l.id}`, href: `lead-details.html?id=${l.id}` })) });

  const quoteMatches = DB.quotations.filter(q2 => !q || q2.id.toLowerCase().includes(q) || q2.customer.toLowerCase().includes(q)).slice(0, 5);
  if (quoteMatches.length) groups.push({ title: "Quotations", icon: "quotations", items: quoteMatches.map(q2 => ({ title: q2.id, sub: q2.customer, href: `quotations.html?id=${q2.id}` })) });

  const invMatches = DB.invoices.filter(i => !q || i.id.toLowerCase().includes(q) || i.customer.toLowerCase().includes(q)).slice(0, 5);
  if (invMatches.length) groups.push({ title: "Invoices", icon: "invoices", items: invMatches.map(i => ({ title: i.id, sub: i.customer, href: `invoices.html?id=${i.id}` })) });

  const payMatches = DB.payments.filter(p => !q || p.id.toLowerCase().includes(q) || p.customer.toLowerCase().includes(q)).slice(0, 5);
  if (payMatches.length) groups.push({ title: "Payments", icon: "payments", items: payMatches.map(p => ({ title: p.id, sub: p.customer, href: `payments.html?id=${p.id}` })) });

  if (!groups.length) {
    resultsEl.innerHTML = `<div class="search-empty">No results found${q ? ` for "${escapeHtml(term)}"` : ""}.</div>`;
    return;
  }
  resultsEl.innerHTML = groups.map(g => `
    <div class="search-group-title">${g.title}</div>
    ${g.items.map(item => `
      <div class="search-result-item" data-href="${item.href}">
        ${icon(g.icon)}
        <div>
          <div class="srt">${escapeHtml(item.title)}</div>
          <div class="srs">${escapeHtml(item.sub)}</div>
        </div>
      </div>`).join("")}
  `).join("");
  resultsEl.querySelectorAll(".search-result-item").forEach(row => {
    row.addEventListener("click", () => { window.location.href = row.dataset.href; });
  });
}

document.addEventListener("DOMContentLoaded", initLayout);
