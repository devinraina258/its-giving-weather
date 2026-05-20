import "dotenv/config";
import express from "express";
import session from "express-session";
import { handleGenerateRecommendation } from "../handlers.js";
import { isMockAuth, logout, mockLogin, requireAuth } from "./auth.js";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET ?? "dev-session-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 },
  })
);

app.get("/", (_req, res) => {
  res.send(`<html><body style="font-family:sans-serif;max-width:640px;margin:2rem auto">
    <h1>Weather Recommendation Agent</h1>
    <p>Challenge 8 — MCP multi-source recommendations (TalentServ)</p>
    <p><a href="/login">Login</a> to access the dashboard.</p>
  </body></html>`);
});

app.get("/login", (req, res) => {
  if (isMockAuth()) {
    res.send(`<html><body style="font-family:sans-serif;max-width:640px;margin:2rem auto">
      <h1>Login (Mock Auth)</h1>
      <p>MOCK_AUTH is enabled. Use demo login (no password storage).</p>
      <p>For production, configure Auth0 in .env — see README.</p>
      <form action="/auth/mock" method="post"><button type="submit">Demo Login</button></form>
    </body></html>`);
    return;
  }
  res.status(501).send("Configure AUTH0_DOMAIN for real Auth0 login.");
});

app.post("/auth/mock", express.urlencoded({ extended: true }), mockLogin);
app.post("/logout", logout);
app.get("/logout", logout);

app.get("/dashboard", requireAuth, (req, res) => {
  const user = req.session.user!;
  res.send(`<html><body style="font-family:sans-serif;max-width:720px;margin:2rem auto">
    <h1>Recommendation Dashboard</h1>
    <p>Signed in as <strong>${user.name}</strong> (${user.email})</p>
    <form id="f">
      <label>Location: <input name="location" value="pune" required></label><br><br>
      <label>Question:<br><textarea name="question" rows="3" style="width:100%">Should I go for an outing in Pune this evening?</textarea></label><br><br>
      <label><input type="checkbox" name="fail"> Simulate source failure</label><br><br>
      <button type="submit">Get Recommendation</button>
    </form>
    <pre id="out" style="background:#f4f4f4;padding:1rem;overflow:auto"></pre>
    <p><a href="/logout">Logout</a></p>
    <script>
      document.getElementById('f').onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const r = await fetch('/api/recommend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: fd.get('location'),
            question: fd.get('question'),
            simulateSourceFailure: fd.get('fail') === 'on'
          })
        });
        document.getElementById('out').textContent = JSON.stringify(await r.json(), null, 2);
      };
    </script>
  </body></html>`);
});

app.post("/api/recommend", requireAuth, async (req, res) => {
  const { location, question, simulateSourceFailure } = req.body ?? {};
  const result = await handleGenerateRecommendation({
    location,
    question,
    simulateSourceFailure,
  });
  res.json({ user: req.session.user, result });
});

app.listen(PORT, () => {
  console.log(`Demo web client: http://localhost:${PORT}`);
  console.log(`Mock auth: ${isMockAuth()}`);
});
