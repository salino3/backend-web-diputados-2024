const express = require("express");

const routerCongreso = express.Router();

routerCongreso.get("get-data", getDataCongreso);
