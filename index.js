const express = require("express");
const { graphqlHTTP } = require("express-graphql");
const cors = require("cors");
const dotenv = require("dotenv");
const routerCongreso = require("./src/routes/congreso");
const schema = require("./src/models/schema");

// Config dotenv
dotenv?.config();
const app = express();
// Middleware CORS
app.use(
  cors({
    // origin: "http://localhost:4000",
    origin: "*",
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    credentials: true,
  })
);

app.use((req, res, next) => {
  // console.log(`${req.method} ${req.path}`);
  next();
});

const port = process.env.PORT ?? 8100;

app.use(express.json());

console.log("variable START_MODE:", process.env.START_MODE);
if (process.env.START_MODE === "GRAPHQL") {
  //* GraphQL Endpoint
  app.use(
    "/graphql",
    graphqlHTTP({
      schema,
      graphiql: true,
    })
  );
} else if (process.env.START_MODE === "REST") {
  //* API REST endpoint
  app.use("/api", routerCongreso);
} else {
  console.error(
    "Invalid START_MODE environment variable. Set it to 'GRAPHQL' or 'REST'."
  );
  process.exit(1);
}

app.listen(port, () => {
  console.log(`Express server listening on port ${port}`);
});
