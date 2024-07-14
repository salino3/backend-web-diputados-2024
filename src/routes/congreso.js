const express = require("express");
const congresoController = require("../controllers/congreso.controller");

const routerCongreso = express.Router();

routerCongreso.get("/get-data", congresoController.getDataCongreso);

module.exports = routerCongreso;
