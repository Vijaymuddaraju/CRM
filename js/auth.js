/* ==========================================================================
   AUTH — mock session handling.
   Real authentication will later be implemented via Laravel (sessions/Sanctum).
   This module only simulates login state using localStorage.
   ========================================================================== */

const SESSION_KEY = "crm_session_v1";

function login(email, password, remember) {
  const user = DB.users.find(u => u.email.toLowerCase() === String(email).toLowerCase() && u.password === password);
  if (!user) return { ok: false, error: "Invalid email or password." };
  if (user.status === "inactive") return { ok: false, error: "This account has been deactivated. Contact your administrator." };
  const session = { userId: user.id, role: user.role, loginAt: new Date().toISOString() };
  if (remember) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } else {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }
  user.lastLogin = new Date().toISOString().slice(0, 16).replace("T", " ");
  saveDB();
  return { ok: true, user };
}

function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

function getCurrentUser() {
  const session = getSession();
  if (!session) return null;
  return getUserById(session.userId) || null;
}

function logout() {
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_KEY);
  window.location.href = isInPagesDir() ? "login.html" : "pages/login.html";
}

function isInPagesDir() {
  return window.location.pathname.includes("/pages/");
}

/* Call at the top of every protected page. Redirects to login if not authed,
   and redirects sales users away from admin-only pages. */
function requireAuth(pageKey) {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = "login.html";
    return null;
  }
  const allowed = (DB.settings.rolePermissions || ROLE_PERMISSIONS)[user.role] || [];
  if (pageKey && !allowed.includes(pageKey)) {
    window.location.href = user.role === "admin" ? "admin-dashboard.html" : "sales-dashboard.html";
    return null;
  }
  return user;
}

function hasPermission(pageKey, role) {
  role = role || (getCurrentUser() || {}).role;
  return ((DB.settings.rolePermissions || ROLE_PERMISSIONS)[role] || []).includes(pageKey);
}
