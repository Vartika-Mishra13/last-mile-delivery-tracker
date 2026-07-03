let token = localStorage.getItem("token") || "";
let currentUser = JSON.parse(localStorage.getItem("user") || "null");

const authView = document.querySelector("#authView");
const dashboardView = document.querySelector("#dashboardView");
const output = document.querySelector("#output");
const sessionName = document.querySelector("#sessionName");
const sessionRole = document.querySelector("#sessionRole");
const statusText = document.querySelector("#statusText");
const dashboardTitle = document.querySelector("#dashboardTitle");
const dashboardSubtitle = document.querySelector("#dashboardSubtitle");
const BASE_URL = window.location.origin.startsWith("http") ? window.location.origin : "http://localhost:5000";
const roleContent = {
  customer: {
    panel: "customerPanel",
    title: "Customer Portal",
    subtitle: "Create shipments, view charges, track timeline, and reschedule failed deliveries.",
  },
  admin: {
    panel: "adminPanel",
    title: "Admin Console",
    subtitle: "Manage zones, rate cards, orders, assignments, and status overrides.",
  },
  deliveryAgent: {
    panel: "agentPanel",
    title: "Agent App",
    subtitle: "View assigned orders, update location, availability, and delivery status.",
  },
};

const show = (data) => {
  if (output) {
    output.textContent = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  }
};

const toPayload = (form) => {
  const payload = Object.fromEntries(new FormData(form).entries());

  for (const key of ["length", "breadth", "height", "actualWeight", "ratePerKg", "codSurcharge", "minCharge", "lat", "lng"]) {
    if (payload[key] !== undefined && payload[key] !== "") {
      payload[key] = Number(payload[key]);
    }
  }

  return payload;
};

const api = async (path, options = {}) => {
  if (statusText) statusText.textContent = "Loading...";

  try {
    const response = await fetch(BASE_URL + path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });

    const data = await response.json();

    if (statusText) {
      statusText.textContent = response.ok ? "Success" : "Request failed";
    }

    show(data);
    return data;
  } catch (error) {
    if (statusText) statusText.textContent = "Network error";

    show({
      success: false,
      message: "Could not reach API",
      error: error.message,
    });

    return { success: false };
  }
};
const switchAuthForm = (mode) => {
  document.querySelector("#showLogin").classList.toggle("active", mode === "login");
  document.querySelector("#showRegister").classList.toggle("active", mode === "register");
  document.querySelector("#loginForm").classList.toggle("active", mode === "login");
  document.querySelector("#registerForm").classList.toggle("active", mode === "register");
};

const activateRolePanel = () => {
  const role = currentUser?.role;
  const content = roleContent[role] || roleContent.customer;

  document.querySelectorAll(".panel").forEach((panel) => panel.classList.remove("active"));
  document.querySelector(`#${content.panel}`)?.classList.add("active");

  document.querySelectorAll(".tab").forEach((tab) => {
    const allowed = tab.dataset.role === role;
    tab.classList.toggle("active", tab.dataset.panel === content.panel);
    tab.classList.toggle("hidden", !allowed);
  });

  dashboardTitle.textContent = content.title;
  dashboardSubtitle.textContent = content.subtitle;
};

const renderSession = () => {
  const isLoggedIn = Boolean(token && currentUser);
  authView.classList.toggle("hidden", isLoggedIn);
  dashboardView.classList.toggle("hidden", !isLoggedIn);

  if (!isLoggedIn) {
    return;
  }

  sessionName.textContent = currentUser.name;
  sessionRole.textContent = `Role: ${currentUser.role}`;
  activateRolePanel();
};

const setSession = (data) => {
  token = data.token || "";
  currentUser = data.user || null;
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(currentUser));
  renderSession();
};

const clearSession = () => {
  token = "";
  currentUser = null;
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  renderSession();
};

document.querySelector("#showLogin").addEventListener("click", () => switchAuthForm("login"));
document.querySelector("#showRegister").addEventListener("click", () => switchAuthForm("register"));
document.querySelector("#logoutButton").addEventListener("click", clearSession);

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((button) => button.classList.remove("active"));
    document.querySelectorAll(".panel").forEach((panel) => panel.classList.remove("active"));
    tab.classList.add("active");
    document.querySelector(`#${tab.dataset.panel}`).classList.add("active");
  });
});

document.querySelectorAll("[data-login]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelector("#loginForm [name=email]").value = button.dataset.login;
    document.querySelector("#loginForm [name=password]").value = "Password@123";
  });
});

document.querySelector("#loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = await api("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(toPayload(event.currentTarget)),
  });

  if (data.success) {
    setSession(data);
  }
});

document.querySelector("#registerForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = await api("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(toPayload(event.currentTarget)),
  });

  if (data.success) {
    setSession(data);
  }
});

document.querySelector("#quoteForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const action = event.submitter.dataset.action;

  await api(action === "create" ? "/api/orders" : "/api/orders/quote", {
    method: "POST",
    body: JSON.stringify(toPayload(event.currentTarget)),
  });
});

document.querySelector("#customerOrderForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = toPayload(event.currentTarget);
  const action = event.submitter.dataset.action;

  if (action === "list") {
    return api("/api/orders");
  }

  if (!payload.orderId) {
    return show("Order ID is required for this action.");
  }

  if (action === "track") {
    return api(`/api/orders/${payload.orderId}`);
  }

  return api(`/api/orders/${payload.orderId}/reschedule`, {
    method: "POST",
    body: JSON.stringify({ rescheduleDate: payload.rescheduleDate }),
  });
});

document.querySelector("#zoneForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = toPayload(event.currentTarget);

  await api("/api/admin/zones", {
    method: "POST",
    body: JSON.stringify({
      name: payload.name,
      areas: payload.areas.split(",").map((area) => area.trim()),
      pincodes: payload.pincodes.split(",").map((pincode) => pincode.trim()),
      center: { lat: payload.lat, lng: payload.lng },
    }),
  });
});

document.querySelector("#rateCardForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  await api("/api/admin/rate-cards", {
    method: "POST",
    body: JSON.stringify(toPayload(event.currentTarget)),
  });
});

document.querySelector("#adminOrderForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = toPayload(event.currentTarget);
  const action = event.submitter.dataset.action;

  if (action === "orders") {
    return api("/api/admin/orders");
  }

  if (!payload.orderId) {
    return show("Order ID is required for this action.");
  }

  if (action === "assign") {
    return api(`/api/admin/orders/${payload.orderId}/assign`, {
      method: "PATCH",
      body: JSON.stringify({ agentId: payload.agentId }),
    });
  }

  if (action === "auto") {
    return api(`/api/admin/orders/${payload.orderId}/auto-assign`, { method: "POST" });
  }

  return api(`/api/admin/orders/${payload.orderId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status: payload.status, note: payload.note }),
  });
});

document.querySelector("#loadZones").addEventListener("click", () => api("/api/admin/zones"));
document.querySelector("#loadRates").addEventListener("click", () => api("/api/admin/rate-cards"));

document.querySelector("#agentStatusForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = toPayload(event.currentTarget);
  const action = event.submitter.dataset.action;

  if (action === "assigned") {
    return api("/api/agent/orders");
  }

  if (!payload.orderId) {
    return show("Order ID is required for this action.");
  }

  return api(`/api/agent/orders/${payload.orderId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status: payload.status, note: payload.note }),
  });
});

document.querySelector("#agentLocationForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = toPayload(event.currentTarget);
  const action = event.submitter.dataset.action;

  if (action === "location") {
    return api("/api/agent/location", {
      method: "PATCH",
      body: JSON.stringify({ lat: payload.lat, lng: payload.lng }),
    });
  }

  return api("/api/agent/availability", {
    method: "PATCH",
    body: JSON.stringify({ isAvailable: payload.isAvailable === "true" }),
  });
});

renderSession();
