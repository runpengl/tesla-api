#!/usr/bin/env node-stage-0

process.env["DEBUG"] = "tesla-api";
const Tesla = require("./lib/index").default;
const credentials = require("./config/credentials");
global.pd = console.log.bind(console);

const perr = function(err) {
  if (err.status) console.error(err);
  else console.error(err.stack);
};

(async function main() {

  const teslaCli = new Tesla(credentials);
  try {
    await teslaCli.login();
  } catch(e) {
    perr(e);
  }

  const products = await teslaCli.products();
  console.log("Products: ", products);

  const vehicle = await teslaCli.getVehicle();
  if (vehicle) {
    const vehicleState = await vehicle.vehicleState();
    console.log("Vehicle state: ", vehicleState);
    const vehicleAutopark = await vehicle.autopark();
    // await vehicleAutopark.forward();
    // await vehicleAutopark.abort();
  } else {
    console.log("No vehicle found");
  }

})()
