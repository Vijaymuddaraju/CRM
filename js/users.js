/* ==========================================================================
   User Management (Admin only)
   ========================================================================== */

let usersTable;

function renderUsersPage() {
  usersTable = createTableController({
    data: DB.users, pageSize: 8,
    mountBodyId: "usersTableBody", mountPaginationId: "usersPagination", mountCountId: "usersCount",
    filterFn: buildUserFilter(), renderRow: renderUserRow,
  });
  usersTable.render();
  document.getElementById("addUserBtn").addEventListener("click", () => openUserModal());
  ["userSearchInput", "userRoleFilter", "userStatusFilter"].forEach(id => document.getElementById(id).addEventListener(id === "userSearchInput" ? "input" : "change", debounce(refreshUsers, 150)));
  injectUserModal();
  document.addEventListener("user:saved", refreshUsers);
}

function buildUserFilter() {
  const term = document.getElementById("userSearchInput").value.trim().toLowerCase();
  const role = document.getElementById("userRoleFilter").value;
  const status = document.getElementById("userStatusFilter").value;
  return (u) => {
    if (term && !(u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term))) return false;
    if (role && u.role !== role) return false;
    if (status && u.status !== status) return false;
    return true;
  };
}
function refreshUsers() { usersTable.data = DB.users; usersTable.refresh(buildUserFilter()); }

function renderUserRow(u) {
  const isSelf = u.id === CURRENT_LAYOUT_USER.id;
  return `<tr>
    <td>
      <div class="cell-with-avatar">
        <div class="avatar avatar-sm" style="background:${u.avatarColor}22;color:${u.avatarColor};">${initials(u.name)}</div>
        <div><div class="cwa-name">${u.name}</div><div class="cwa-sub">${u.id}</div></div>
      </div>
    </td>
    <td class="cell-muted">${u.email}</td>
    <td class="cell-muted">${u.phone}</td>
    <td><span class="badge ${u.role === "admin" ? "badge-primary" : "badge-info"}">${u.role === "admin" ? "Admin" : "Sales"}</span></td>
    <td>${statusBadge(u.status)}</td>
    <td class="cell-muted">${formatDate(u.joined)}</td>
    <td class="cell-muted">${formatDateTime(u.lastLogin)}</td>
    <td class="cell-actions">
      <div class="dropdown" style="display:inline-block;">
        <button class="row-menu-btn">${icon("more")}</button>
        <div class="row-menu-panel">
          <div class="dropdown-item" data-u-act="view" data-u-id="${u.id}">${icon("eye")} View</div>
          <div class="dropdown-item" data-u-act="edit" data-u-id="${u.id}">${icon("edit")} Edit</div>
          ${!isSelf ? `<div class="dropdown-item" data-u-act="toggle" data-u-id="${u.id}">${icon(u.status === "active" ? "lock" : "checkCircle")} ${u.status === "active" ? "Deactivate" : "Activate"}</div>` : ""}
        </div>
      </div>
    </td>
  </tr>`;
}

document.addEventListener("click", (e) => {
  const item = e.target.closest("[data-u-act]");
  if (!item) return;
  const id = item.dataset.uId, act = item.dataset.uAct;
  const u = DB.users.find(x => x.id === id);
  if (act === "view" || act === "edit") openUserModal(id, act === "view");
  if (act === "toggle") {
    confirmAction({
      title: u.status === "active" ? "Deactivate User" : "Activate User",
      message: `Are you sure you want to ${u.status === "active" ? "deactivate" : "activate"} ${u.name}?`,
      confirmLabel: u.status === "active" ? "Deactivate" : "Activate",
      danger: u.status === "active",
      onConfirm: () => {
        u.status = u.status === "active" ? "inactive" : "active";
        saveDB();
        showToast(`${u.name} has been ${u.status === "active" ? "activated" : "deactivated"}.`, "success");
        document.dispatchEvent(new CustomEvent("user:saved"));
      }
    });
  }
});

function injectUserModal() {
  if (document.getElementById("userModal")) return;
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.id = "userModal";
  backdrop.innerHTML = `<div class="modal">
    <div class="modal-header"><h3 id="userModalTitle">Add User</h3><button class="modal-close" data-close-modal>${icon("x")}</button></div>
    <div class="modal-body">
      <input type="hidden" id="userIdInput">
      <div class="form-grid">
        <div class="field" id="uf_name"><label>Full Name <span class="required">*</span></label><input class="input" id="userName"><div class="error-msg">Name is required.</div></div>
        <div class="field" id="uf_email"><label>Email <span class="required">*</span></label><input class="input" type="email" id="userEmail"><div class="error-msg">A valid email is required.</div></div>
        <div class="field"><label>Phone</label><input class="input" id="userPhone" placeholder="+91 98765 43210"></div>
        <div class="field"><label>Role</label><select class="select-field2" id="userRole"><option value="sales">Sales</option><option value="admin">Admin</option></select></div>
      </div>
    </div>
    <div class="modal-footer"><button class="btn btn-secondary" data-close-modal>Cancel</button><button class="btn btn-primary" id="userSaveBtn"><span class="btn-label">Save User</span></button></div>
  </div>`;
  document.body.appendChild(backdrop);
  document.getElementById("userSaveBtn").addEventListener("click", () => {
    let valid = true;
    document.getElementById("uf_name").classList.toggle("has-error", !document.getElementById("userName").value.trim());
    if (!document.getElementById("userName").value.trim()) valid = false;
    const email = document.getElementById("userEmail").value.trim();
    document.getElementById("uf_email").classList.toggle("has-error", !/^\S+@\S+\.\S+$/.test(email));
    if (!/^\S+@\S+\.\S+$/.test(email)) valid = false;
    if (!valid) return;
    const btn = document.getElementById("userSaveBtn");
    setBtnLoading(btn, true);
    setTimeout(() => {
      const id = document.getElementById("userIdInput").value;
      const payload = { name: document.getElementById("userName").value.trim(), email, phone: document.getElementById("userPhone").value.trim(), role: document.getElementById("userRole").value };
      if (id) { Object.assign(DB.users.find(x => x.id === id), payload); showToast("User updated successfully.", "success"); }
      else {
        const colors = ["#4f46e5", "#0891b2", "#d97706", "#16a34a", "#7c3aed", "#dc2626"];
        DB.users.unshift({ id: nextId("U", DB.users), password: "changeme123", status: "active", joined: "2026-09-10", lastLogin: "—", avatarColor: colors[Math.floor(Math.random() * colors.length)], ...payload });
        showToast("User created successfully.", "success");
      }
      saveDB();
      setBtnLoading(btn, false);
      closeModal("userModal");
      document.dispatchEvent(new CustomEvent("user:saved"));
    }, 500);
  });
}
function openUserModal(id, readOnly) {
  injectUserModal();
  document.querySelectorAll("#userModal .field").forEach(f => f.classList.remove("has-error"));
  document.getElementById("userIdInput").value = id || "";
  document.querySelectorAll("#userModal input, #userModal select").forEach(el => el.disabled = !!readOnly);
  document.getElementById("userSaveBtn").classList.toggle("hidden", !!readOnly);
  if (id) {
    const u = DB.users.find(x => x.id === id);
    document.getElementById("userModalTitle").textContent = readOnly ? `View User — ${u.name}` : `Edit User — ${u.name}`;
    document.getElementById("userName").value = u.name;
    document.getElementById("userEmail").value = u.email;
    document.getElementById("userPhone").value = u.phone;
    document.getElementById("userRole").value = u.role;
  } else {
    document.getElementById("userModalTitle").textContent = "Add User";
    document.getElementById("userName").value = "";
    document.getElementById("userEmail").value = "";
    document.getElementById("userPhone").value = "";
    document.getElementById("userRole").value = "sales";
  }
  openModal("userModal");
}

document.addEventListener("layout:ready", renderUsersPage);
