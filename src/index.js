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

  async vehicles() {
    const res = await request.get("/vehicles");
    return res.data.response.map(v => new Vehicle(this, v));
  }

  async getVehicle(vehicleId = "") {
    const vehicles = await this.vehicles();
    if (vehicleId) {
      return vehicles.find(v => v.vehicleId === vehicleId);
    } else {
      return vehicles[0];
    }
  }

  async products() {
    const res = await request.get("/products");
    return res.data.response;
  }

  summon(vehicle) {
    return new Summon(vehicle);
  }
}
