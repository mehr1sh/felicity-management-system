const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const { config } = require("./config");
const { connectMongo } = require("./db");
const { Admin } = require("./models/User");
const { hashPassword } = require("./utils/password");


const { authRouter } = require("./routes/auth");
const { meRouter } = require("./routes/me");

const app = express();


app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173", credentials: true }));
app.use(morgan("dev"));
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));
app.use(cookieParser());


app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});


app.use("/api/auth", authRouter);
app.use("/api/me", meRouter);
app.use("/api/events", require("./routes/events"));
app.use("/api/organizers", require("./routes/organizers"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/registrations", require("./routes/registrations"));
app.use("/api/teams", require("./routes/teams"));
app.use("/api/payments", require("./routes/payments"));
app.use("/api/forum", require("./routes/forum"));
app.use("/api/password-reset", require("./routes/password-reset"));
app.use("/api/attendance", require("./routes/attendance"));
app.use("/api/feedback", require("./routes/feedback"));


app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
});


app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

async function bootstrapAdmin() {
  const existing = await Admin.findOne({ email: config.adminBootstrap.email });
  if (existing) {
    console.log("[bootstrap] Admin already exists");
    return;
  }

  const passwordHash = await hashPassword(config.adminBootstrap.password);
  await Admin.create({
    role: "admin",
    email: config.adminBootstrap.email,
    passwordHash,
  });
  console.log(`[bootstrap] Admin created: ${config.adminBootstrap.email}`);
}

async function start() {
  try {
    await connectMongo(config.mongoUri);
    console.log("[mongo] Connected");

    await bootstrapAdmin();

    app.listen(config.port, () => {
      console.log(`[server] Listening on port ${config.port}`);
    });
  } catch (err) {
    console.error("[startup] Failed:", err);
    process.exit(1);
  }
}

start();
