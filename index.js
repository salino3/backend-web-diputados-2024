const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const routerCongreso = require("./src/routes/congreso");

// Config dotenv
dotenv?.config();
const app = express();

// Middleware of register
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Middleware CORS
app.use(
  cors({
    origin: "http://localhost:8000",
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    credentials: true,
  })
);

const port = process.env.PORT ?? 8100;

app.use(express.json());

app.use("/api", routerCongreso);

app.listen(port, () => {
  console.log(`Express server listening on port ${port}`);
});
