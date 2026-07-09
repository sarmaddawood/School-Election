async function test() {
  const res = await fetch("http://localhost:3000/api/auth/me", {
    headers: { "Authorization": "Bearer mock-token-admin-1" }
  });
  console.log("Status:", res.status);
  console.log("Response:", await res.json().catch(() => "no json"));
}
test();
