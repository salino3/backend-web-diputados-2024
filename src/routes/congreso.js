const express = require("express");
const congresoController = require("../controllers/congreso.controller");

const routerCongreso = express.Router();

routerCongreso.post(
  "/filter-by-cache",
  congresoController.filterDataCongresoByDB
);

module.exports = routerCongreso;
