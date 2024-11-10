const express = require("express");
const { graphqlHTTP } = require("express-graphql");
const cors = require("cors");
const dotenv = require("dotenv");
// const routerCongreso = require("./src/routes/congreso");
const schema = require("./src/models/schema");

// Config dotenv
dotenv?.config();
const app = express();

// Middleware of register
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

const port = process.env.PORT ?? 8100;

app.use(express.json());

//* GraphQL Endpoint
app.use(
  "/graphql",
  graphqlHTTP({
    schema,
    graphiql: true,
  })
);

//* API REST endpoint
// app.use("/api", routerCongreso);

// Middleware CORS
// app.use(
//   cors({
//     origin: "http://localhost:4000",
//     allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
//     credentials: true,
//   })
// );

app.listen(port, () => {
  console.log(`Express server listening on port ${port}`);
});
