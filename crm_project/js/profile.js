/* ==========================================================================
   Profile page
   ========================================================================== */

function renderProfilePage() {
  const user = CURRENT_LAYOUT_USER;
  document.getElementById("profileAvatar").textContent = initials(user.name);
  document.getElementById("profileAvatar").style.background = user.avatarColor + "22";
  document.getElementById("profileAvatar").style.color = user.avatarColor;
  document.getElementById("profileNameHeading").textContent = user.name;
  document.getElementById("profileRoleHeading").textContent = user.role === "admin" ? "Administrator" : "Sales Executive";

  document.getElementById("profileName").value = user.name;
  document.getElementById("profileEmail").value = user.email;
  document.getElementById("profilePhone").value = user.phone;
  document.getElementById("profileRole").value = user.role === "admin" ? "Administrator" : "Sales Executive";

  document.getElementById("emailNotifToggle").checked = DB.settings.notifications.email;
  document.getElementById("followupReminderToggle").checked = DB.settings.notifications.followupReminders;
  document.getElementById("paymentReminderToggle").checked = DB.settings.notifications.paymentReminders;

  if (window.__profilePageWired) return;
  window.__profilePageWired = true;

  document.getElementById("saveProfileBtn").addEventListener("click", () => {
    const btn = document.getElementById("saveProfileBtn");
    user.name = document.getElementById("profileName").value.trim() || user.name;
    user.phone = document.getElementById("profilePhone").value.trim();
    saveDB();
    setBtnLoading(btn, true);
    setTimeout(() => { setBtnLoading(btn, false); showToast("Profile updated successfully.", "success"); renderTopbar(CURRENT_LAYOUT_USER, window.PAGE); window.__profilePageWired = false; renderProfilePage(); }, 500);
  });

  document.getElementById("changePasswordBtn").addEventListener("click", () => {
    const current = document.getElementById("currentPassword").value;
    const next = document.getElementById("newPassword").value;
    const confirm = document.getElementById("confirmPassword").value;
    let valid = true;
    document.getElementById("pwd_current").classList.toggle("has-error", current !== user.password);
    if (current !== user.password) valid = false;
    document.getElementById("pwd_new").classList.toggle("has-error", next.length < 6);
    if (next.length < 6) valid = false;
    document.getElementById("pwd_confirm").classList.toggle("has-error", next !== confirm);
    if (next !== confirm) valid = false;
    if (!valid) return;
    const btn = document.getElementById("changePasswordBtn");
    setBtnLoading(btn, true);
    setTimeout(() => {
      user.password = next;
      saveDB();
      setBtnLoading(btn, false);
      document.getElementById("currentPassword").value = "";
      document.getElementById("newPassword").value = "";
      document.getElementById("confirmPassword").value = "";
      showToast("Password changed successfully.", "success");
    }, 600);
  });

  ["emailNotifToggle", "followupReminderToggle", "paymentReminderToggle"].forEach(id => {
    document.getElementById(id).addEventListener("change", (e) => {
      const map = { emailNotifToggle: "email", followupReminderToggle: "followupReminders", paymentReminderToggle: "paymentReminders" };
      DB.settings.notifications[map[id]] = e.target.checked;
      saveDB();
      showToast("Notification preferences updated.", "success");
    });
  });
}

document.addEventListener("layout:ready", renderProfilePage);
