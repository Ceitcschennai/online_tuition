// Live API validation. Prints only status codes + response shapes.
// Does NOT print tokens, passwords, or credentials.
const API = "http://localhost:5000";

const post = (path, body) =>
  fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

const get = (path, token) =>
  fetch(`${API}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

const run = async () => {
  // 1) Admin login via /api/auth/login (hardcoded admin account)
  const loginRes = await post("/api/auth/login", {
    email: process.env.TEST_ADMIN_EMAIL,
    password: process.env.TEST_ADMIN_PASS,
    role: "admin",
  });
  const loginData = await loginRes.json();
  console.log("LOGIN status:", loginRes.status, "success:", loginData.success, "role:", loginData.role);
  const token = loginData.token;
  console.log("TOKEN present:", !!token);

  // Decode token payload without printing the token itself
  if (token) {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
    console.log("TOKEN payload keys:", Object.keys(payload).join(","), "| has id:", "id" in payload, "| role:", payload.role);
  }

  // 2) Admin payments endpoint WITH token (current code path)
  const withToken = await get("/api/admin/payments/students", token);
  const withTokenData = await withToken.json();
  console.log("GET /api/admin/payments/students (with token) status:", withToken.status, "success:", withTokenData.success, "message:", withTokenData.message || "(none)", "paymentsCount:", Array.isArray(withTokenData.payments) ? withTokenData.payments.length : "n/a");

  // 3) Admin payments endpoint WITHOUT token
  const noToken = await get("/api/admin/payments/students", null);
  const noTokenData = await noToken.json();
  console.log("GET /api/admin/payments/students (no token) status:", noToken.status, "success:", noTokenData.success, "message:", noTokenData.message || "(none)");

  // 4) Student payment history endpoint used by Payments.js
  const historyNoAuth = await get("/api/payments/student/6abe45fbbe0501e4c10a9df7/history", null);
  console.log("GET /api/payments/student/:id/history status:", historyNoAuth.status);

  // 5) The receipt route (first definition currently shadows the PDF route)
  const receiptRoute = await get("/api/payments/student/6abe45fbbe0501e4c10a9df7/payment/x/receipt", null);
  const receiptData = await receiptRoute.json().catch(() => ({}));
  console.log("GET .../payment/:pid/receipt status:", receiptRoute.status, "success:", receiptData.success, "has payments array:", Array.isArray(receiptData.payments));

  process.exit(0);
};

run().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
