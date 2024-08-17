const express = require("express");
const congresoController = require("../controllers/congreso.controller");

const routerCongreso = express.Router();

routerCongreso.get("/get-data", congresoController.getDataCongreso);

routerCongreso.get("/distinct", congresoController.getDataDistinct);

routerCongreso.post("/filter", congresoController.filterDataCongreso);

routerCongreso.post(
  "/filter-by-cache",
  congresoController.filterDataCongresoByCache
);

module.exports = routerCongreso;
