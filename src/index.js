import utils from "./utils";
import { request } from "./request";
import { API_HOST, CLIENT_ID, CLIENT_SECRET } from "./constants";
import { Vehicle } from "./vehicle";
import { Summon } from "./summon";
global.pd = console.log.bind(console);

export default class Tesla {
  static login(options) {
    return new Tesla(options).login();
  }

  constructor(options = {}) {
    Object.assign(
      this,
      utils.pick(options, "email", "password", "refreshToken", "distanceUnit")
    );
    request.defaults.distanceUnit = this.distanceUnit;
    return this;
  }

  login() {
    var oAuthParams = { client_id: CLIENT_ID, client_secret: CLIENT_SECRET };
    if (this.password && this.email) {
      oAuthParams = {
        ...oAuthParams,
        ...{
          email: this.email,
          password: this.password,
          grant_type: "password"
        }
      };
    } else if (this.refreshToken) {
      oAuthParams = {
        ...oAuthParams,
        ...{ refresh_token: this.refreshToken, grant_type: "refresh_token" }
      };
    }

    return new Promise((resolve, reject) => {
      request
        .post(`${API_HOST}/oauth/token`, oAuthParams)
        .then(res => {
          const { accessToken, refreshToken, expiresIn } = res.data;
          request.defaults.headers.common[
            "Authorization"
          ] = `Bearer ${accessToken}`;
          request.defaults.refreshToken = refreshToken;
          request.defaults.expiresAt = new Date().getTime() + expiresIn * 1000;
          resolve(res.data);
        })
        .catch(reject);
    });
  }

  vehicles() {
    return request.get("/vehicles")
      .then(res => res.data.response.map(v => new Vehicle(this, v)));
  }

  getVehicle(vehicleId = "") {
    return this.vehicles()
      .then(vehicles => vehicleId ? vehicles.find(v => v.vehicleId === vehicleId) : vehicles[0])
  }

  products() {
    return request.get("/products")
      .then(res => res.data.response);
  }

  summon(vehicle) {
    return new Summon(vehicle);
  }
}
