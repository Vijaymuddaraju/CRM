/* ==========================================================================
   Roles & Permissions (Admin only)
   NOTE: These are UI-only restrictions for this frontend prototype.
   Real authorization will later be enforced via Laravel middleware & policies.
   ========================================================================== */

const PERMISSION_MODULES = [
  { key: "dashboard", label: "Dashboard" },
  { key: "leads", label: "Leads" },
  { key: "meetings", label: "Meetings" },
  { key: "followups", label: "Follow-ups" },
  { key: "calendar", label: "Calendar" },
  { key: "estimations", label: "Estimations" },
  { key: "quotations", label: "Quotations" },
  { key: "invoices", label: "Invoices" },
  { key: "purchase-orders", label: "Purchase Orders" },
  { key: "payments", label: "Payments" },
  { key: "expenses", label: "Expenses" },
  { key: "income", label: "Income" },
  { key: "reports", label: "Profit & Reports" },
  { key: "users", label: "Users" },
  { key: "roles", label: "Roles & Permissions" },
  { key: "notifications", label: "Notifications" },
  { key: "settings", label: "Settings" },
  { key: "profile", label: "Profile" },
];

function renderRolesPage() {
  renderPermissionMatrix();
  document.getElementById("resetPermissionsBtn").addEventListener("click", () => {
    confirmAction({
      title: "Reset to Default Permissions",
      message: "This will restore the default Admin and Sales permission sets. Continue?",
      confirmLabel: "Reset",
      danger: false,
      onConfirm: () => {
        DB.settings.rolePermissions = JSON.parse(JSON.stringify(ROLE_PERMISSIONS));
        saveDB();
        renderPermissionMatrix();
        showToast("Permissions reset to default.", "success");
      }
    });
  });
}

function renderPermissionMatrix() {
  const perms = DB.settings.rolePermissions;
  document.getElementById("permissionMatrixBody").innerHTML = PERMISSION_MODULES.map(m => `
    <tr>
      <td class="cell-primary">${m.label}</td>
      <td style="text-align:center;">
        <label class="switch"><input type="checkbox" data-role="admin" data-module="${m.key}" ${perms.admin.includes(m.key) ? "checked" : ""} ${m.key === "dashboard" ? "disabled" : ""}><span class="slider"></span></label>
      </td>
      <td style="text-align:center;">
        <label class="switch"><input type="checkbox" data-role="sales" data-module="${m.key}" ${perms.sales.includes(m.key) ? "checked" : ""} ${m.key === "dashboard" ? "disabled" : ""}><span class="slider"></span></label>
      </td>
    </tr>`).join("");

  document.querySelectorAll("#permissionMatrixBody input[type=checkbox]").forEach(cb => {
    cb.addEventListener("change", () => {
      const role = cb.dataset.role, moduleKey = cb.dataset.module;
      const list = DB.settings.rolePermissions[role];
      const idx = list.indexOf(moduleKey);
      if (cb.checked && idx === -1) list.push(moduleKey);
      if (!cb.checked && idx > -1) list.splice(idx, 1);
      saveDB();
      showToast(`${moduleKey.charAt(0).toUpperCase() + moduleKey.slice(1)} access ${cb.checked ? "granted to" : "revoked from"} ${role === "admin" ? "Admin" : "Sales"}.`, "info");
    });
  });
}

document.addEventListener("layout:ready", renderRolesPage);
