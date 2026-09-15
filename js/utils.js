/* ==========================================================================
   Shared utilities: toasts, modals, formatting, table helpers
   ========================================================================== */

/* ---------- Formatting ---------- */
function formatCurrency(n) {
  if (n === null || n === undefined || n === "") return "₹0";
  return "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 });
}
function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

/* ---------- Number to words (Indian numbering system) ---------- */
const NUM_WORDS_ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const NUM_WORDS_TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
function numTwoDigitWords(n) {
  if (n < 20) return NUM_WORDS_ONES[n];
  return NUM_WORDS_TENS[Math.floor(n / 10)] + (n % 10 ? " " + NUM_WORDS_ONES[n % 10] : "");
}
function numThreeDigitWords(n) {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  let s = "";
  if (h) s += NUM_WORDS_ONES[h] + " Hundred" + (rest ? " " : "");
  if (rest) s += numTwoDigitWords(rest);
  return s;
}
function numberToWordsIndian(num) {
  num = Math.round(Math.abs(Number(num) || 0));
  if (num === 0) return "Zero";
  const crore = Math.floor(num / 10000000); num %= 10000000;
  const lakh = Math.floor(num / 100000); num %= 100000;
  const thousand = Math.floor(num / 1000); num %= 1000;
  const hundred = num;
  const parts = [];
  if (crore) parts.push(numThreeDigitWords(crore) + " Crore");
  if (lakh) parts.push(numThreeDigitWords(lakh) + " Lakh");
  if (thousand) parts.push(numThreeDigitWords(thousand) + " Thousand");
  if (hundred) parts.push(numThreeDigitWords(hundred));
  return parts.join(" ");
}
function amountInWords(num) {
  return `Rupees ${numberToWordsIndian(num)} Only`;
}
function formatDateTime(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr.replace(" ", "T"));
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) + ", " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}
function timeAgo(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr.replace(" ", "T"));
  if (isNaN(d)) return dateStr;
  const diffMs = Date.now() - d.getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(dateStr);
}
function initials(name) {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase();
}
function debounce(fn, wait = 250) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
}
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str).replace(/[&<>"']/g, s => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[s]));
}

/* ---------- Status badge mapping ---------- */
const STATUS_BADGE_MAP = {
  // Leads
  New: "badge-info", Contacted: "badge-primary", "Follow-up": "badge-warning", Qualified: "badge-primary", Converted: "badge-success", Lost: "badge-danger",
  // Followups
  Pending: "badge-warning", Completed: "badge-success", Overdue: "badge-danger", Rescheduled: "badge-info", Failed: "badge-danger", Scheduled: "badge-info",
  // Quotations / Invoices / PO
  Draft: "badge-neutral", Sent: "badge-info", Accepted: "badge-success", Rejected: "badge-danger", Expired: "badge-neutral", Final: "badge-success",
  "Partially Paid": "badge-warning", Paid: "badge-success",
  Approved: "badge-success", Cancelled: "badge-danger",
  // Payments
  active: "badge-success", inactive: "badge-neutral",
  // Priority
  High: "badge-danger", Medium: "badge-warning", Low: "badge-neutral",
};
function statusBadge(status) {
  const cls = STATUS_BADGE_MAP[status] || "badge-neutral";
  return `<span class="badge ${cls}">${escapeHtml(status)}</span>`;
}
function priorityDot(priority) {
  const cls = { High: "priority-high", Medium: "priority-medium", Low: "priority-low" }[priority] || "priority-low";
  return `<span class="${cls}" style="font-weight:600;font-size:12px;">● ${escapeHtml(priority)}</span>`;
}

/* ---------- Toasts ---------- */
function ensureToastStack() {
  let stack = document.getElementById("toastStack");
  if (!stack) {
    stack = document.createElement("div");
    stack.className = "toast-stack";
    stack.id = "toastStack";
    document.body.appendChild(stack);
  }
  return stack;
}
const TOAST_ICONS = { success: "checkCircle", error: "x", warning: "alertCircle", info: "info" };
function showToast(message, type = "success", duration = 4000) {
  const stack = ensureToastStack();
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.innerHTML = `${icon(TOAST_ICONS[type] || "info", "toast-icon")}<div class="toast-msg">${escapeHtml(message)}</div><button class="toast-close">${icon("x")}</button>`;
  stack.appendChild(el);
  const remove = () => {
    el.classList.add("leaving");
    setTimeout(() => el.remove(), 180);
  };
  el.querySelector(".toast-close").addEventListener("click", remove);
  if (duration) setTimeout(remove, duration);
}

/* ---------- Modals ---------- */
function openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add("open");
  document.body.style.overflow = "hidden";
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove("open");
  document.body.style.overflow = "";
}
function closeAllModals() {
  document.querySelectorAll(".modal-backdrop.open").forEach(el => el.classList.remove("open"));
  document.body.style.overflow = "";
}
// Global: click on backdrop closes modal, [data-close-modal] closes, Esc closes
document.addEventListener("click", (e) => {
  if (e.target.classList && e.target.classList.contains("modal-backdrop")) {
    e.target.classList.remove("open");
    document.body.style.overflow = "";
  }
  const closer = e.target.closest("[data-close-modal]");
  if (closer) {
    const backdrop = closer.closest(".modal-backdrop");
    if (backdrop) { backdrop.classList.remove("open"); document.body.style.overflow = ""; }
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeAllModals();
});

/* ---------- Confirm delete (reusable) ---------- */
function confirmAction({ title = "Are you sure?", message = "This action cannot be undone.", confirmLabel = "Delete", danger = true, onConfirm }) {
  let backdrop = document.getElementById("globalConfirmModal");
  if (!backdrop) {
    backdrop = document.createElement("div");
    backdrop.id = "globalConfirmModal";
    backdrop.className = "modal-backdrop";
    document.body.appendChild(backdrop);
  }
  backdrop.innerHTML = `
    <div class="modal modal-sm">
      <div class="modal-header">
        <h3>${escapeHtml(title)}</h3>
        <button class="modal-close" data-close-modal>${icon("x")}</button>
      </div>
      <div class="modal-body">
        <p class="text-muted fs-sm">${escapeHtml(message)}</p>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" data-close-modal>Cancel</button>
        <button class="btn ${danger ? "btn-danger" : "btn-primary"}" id="globalConfirmBtn">${escapeHtml(confirmLabel)}</button>
      </div>
    </div>`;
  backdrop.classList.add("open");
  document.body.style.overflow = "hidden";
  document.getElementById("globalConfirmBtn").onclick = () => {
    backdrop.classList.remove("open");
    document.body.style.overflow = "";
    if (onConfirm) onConfirm();
  };
}

/* ---------- Button loading state helper ---------- */
function setBtnLoading(btn, loading) {
  if (!btn) return;
  if (loading) {
    btn.classList.add("is-loading");
    btn.disabled = true;
    if (!btn.querySelector(".spinner")) btn.insertAdjacentHTML("beforeend", `<span class="spinner"></span>`);
    if (!btn.querySelector(".btn-label")) {
      btn.innerHTML = `<span class="btn-label">${btn.innerHTML}</span><span class="spinner"></span>`;
    }
  } else {
    btn.classList.remove("is-loading");
    btn.disabled = false;
    const label = btn.querySelector(".btn-label");
    if (label) btn.innerHTML = label.innerHTML;
  }
}

/* ---------- Simple table controller: search + filter + sort + paginate ---------- */
function createTableController({ data, pageSize = 8, renderRow, mountBodyId, mountPaginationId, mountCountId, filterFn }) {
  let state = { page: 1, sortKey: null, sortDir: 1 };
  function getFiltered() {
    let rows = filterFn ? data.filter(filterFn) : data.slice();
    if (state.sortKey) {
      rows.sort((a, b) => {
        const av = a[state.sortKey], bv = b[state.sortKey];
        if (av === bv) return 0;
        return (av > bv ? 1 : -1) * state.sortDir;
      });
    }
    return rows;
  }
  function render() {
    const rows = getFiltered();
    const total = rows.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (state.page > totalPages) state.page = totalPages;
    const start = (state.page - 1) * pageSize;
    const pageRows = rows.slice(start, start + pageSize);
    const body = document.getElementById(mountBodyId);
    if (body) {
      body.innerHTML = pageRows.length ? pageRows.map(renderRow).join("") : "";
    }
    const countEl = document.getElementById(mountCountId);
    if (countEl) {
      countEl.textContent = total === 0 ? "No records" : `Showing ${start + 1}-${Math.min(start + pageSize, total)} of ${total}`;
    }
    const pagEl = document.getElementById(mountPaginationId);
    if (pagEl) {
      let html = `<button class="page-btn" ${state.page === 1 ? "disabled" : ""} data-page="${state.page - 1}">${icon("chevronLeft")}</button>`;
      for (let i = 1; i <= totalPages; i++) {
        if (totalPages > 7 && Math.abs(i - state.page) > 2 && i !== 1 && i !== totalPages) {
          if (i === 2 || i === totalPages - 1) html += `<span style="padding:0 4px;color:var(--text-faint)">…</span>`;
          continue;
        }
        html += `<button class="page-btn ${i === state.page ? "active" : ""}" data-page="${i}">${i}</button>`;
      }
      html += `<button class="page-btn" ${state.page === totalPages ? "disabled" : ""} data-page="${state.page + 1}">${icon("chevronRight")}</button>`;
      pagEl.innerHTML = html;
      pagEl.querySelectorAll("[data-page]").forEach(btn => {
        btn.addEventListener("click", () => { state.page = parseInt(btn.dataset.page, 10); render(); });
      });
    }
    return { rows: pageRows, total };
  }
  function setSort(key) {
    if (state.sortKey === key) state.sortDir *= -1; else { state.sortKey = key; state.sortDir = 1; }
    render();
  }
  function refresh(newFilterFn) {
    if (newFilterFn) filterFn = newFilterFn;
    state.page = 1;
    render();
  }
  return { render, setSort, refresh, state };
}

/* ---------- Declarative icon decoration ----------
   Any static element with data-icon="name" gets that icon prepended to its
   content. Lets page HTML declare icons without inline JS/template noise. */
function decorateIconButtons(root) {
  (root || document).querySelectorAll("[data-icon]:not([data-icon-done])").forEach(el => {
    el.insertAdjacentHTML("afterbegin", icon(el.dataset.icon));
    el.setAttribute("data-icon-done", "1");
  });
}

/* ---------- Query param helper for cross-page navigation ---------- */
function qs(name) {
  return new URLSearchParams(window.location.search).get(name);
}
