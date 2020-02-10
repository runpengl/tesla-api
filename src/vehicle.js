import { request } from "./request";
//import {Stream} from "./stream"
import { cdebug } from "./console";
import { Summon } from "./summon";

export class Seat {
  DRIVER = 0
  PASSENGER = 1
  REAR_LEFT = 2
  REAR_CENTER = 4
  REAR_RIGHT = 5
}

export class Vehicle {
  constructor(tesla, props) {
    this.tesla = tesla;
    Object.assign(this, props);
    return this;
  }

  stream() {
    return Stream.stream(this);
  }

  stopStream() {
    return Stream.stopStream();
  }

  async refresh() {
    try {
      const vehicles = await this.tesla.vehicles();
      return new Promise(resolve => {
        const vehicle = vehicles.find(v => v.idS === this.idS);
        Object.assign(this, vehicle);
        resolve(this);
      });
    } catch (err) {
      return Promise.reject(err);
    }
  }

  get(path) {
    return request
      .get(`/vehicles/${this.idS}${path}`)
      .then(res => res.data.response);
  }

  post(path, data = {}) {
    return request
      .post(`/vehicles/${this.idS}${path}`, data)
      .then(res => res.data.response);
  }

  dataRequest(key) {
    return this.get(`/data_request/${key}`);
  }

  command(key, data = {}) {
    return this.post(`/command/${key}`, data);
  }

  // State

  data() {
    return this.get("/vehicle_data");
  }

  mobileEnabled() {
    return this.get("/mobile_enabled");
  }

  nearbyChargingSites() {
    return this.get("/nearby_charging_sites");
  }

  chargeState() {
    return this.dataRequest("charge_state").then(charge => {
      // Add a extra time field
      charge.time = new Date().getTime();
      return charge;
    });
  }

  climateState() {
    return this.dataRequest("climate_state");
  }

  driveState() {
    return this.dataRequest("drive_state");
  }

  guiSettings() {
    return this.dataRequest("gui_settings");
  }

  vehicleState() {
    return this.dataRequest("vehicle_state");
  }

  vehicleConfig() {
    return this.dataRequest("vehicle_config");
  }

  // Commands

  wakeUp() {
    return this.post("/wake_up");
  }

  setValetMode(on, password = null) {
    return this.command("set_valet_mode", { on, password });
  }

  resetValetPin() {
    return this.command("reset_valet_pin");
  }

  // Charging

  chargePortDoorOpen() {
    return this.command("charge_port_door_open");
  }

  chargePortDoorClose() {
    return this.command("charge_port_door_close");
  }

  chargeStandard() {
    return this.command("charge_standard");
  }

  chargeMaxRange() {
    return this.command("charge_max_range");
  }

  setChargeLimit(percent) {
    return this.command("set_charge_limit", { percent });
  }

  chargeStart() {
    return this.command("charge_start");
  }

  chargeStop() {
    return this.command("charge_stop");
  }

  flashLights() {
    return this.command("flash_lights");
  }

  honkHorn() {
    return this.command("honk_horn");
  }

  doorUnlock() {
    return this.command("door_unlock");
  }

  doorLock() {
    return this.command("door_lock");
  }

  // Climate

  setTemps(driver_temp, passenger_temp) {
    const MIN_TEMP_C = 15;
    const MAX_TEMP_C = 30;
    if (!passenger_temp) {
      passenger_temp = driver_temp;
    }
    if (!driver_temp || driver_temp < MIN_TEMP_C || driver_temp > MAX_TEMP_C) {
      return Promise.reject(`Driver temp must be between ${MIN_TEMP_C}-${MAX_TEMP_C} C`);
    }
    if (!passenger_temp || passenger_temp < MIN_TEMP_C || passenger_temp > MAX_TEMP_C) {
      return Promise.reject(`Passenger temp must be between ${MIN_TEMP_C}-${MAX_TEMP_C} C`);
    }
    return this.command("set_temps", { driver_temp, passenger_temp });
  }

  autoConditioningStart() {
    return this.command("auto_conditioning_start");
  }

  autoConditioningStop() {
    return this.command("auto_conditioning_stop");
  }

  seatHeaterRequest(data) {
    return this.command("remote_seat_heater_request", data);
  }

  heatSeats(seats, level) {
    const MAX_HEAT_LEVEL = 3;
    level = parseInt(level || 0);
    seats = seats || [];
    if (data.level > MAX_HEAT_LEVEL) {
      return Promise.reject(`Heat level must be between 0-${MAX_HEAT_LEVEL}`);
    }
    return Promise.all(
      seats.map(seatCode => this.seatHeaterRequest({ heater: seatCode, level }))
    );
  }

  setSteeringWheelHeater(on) {
    return this.command("remote_steering_wheel_heater_request", { on });
  }

  sunRoofControl(state) {
    return this.command("sun_roof_control", { state });
  }

  sunRoofMove(percent) {
    return this.command("sun_roof_control", { state: "move", percent });
  }

  remoteStartDrive() {
    return this.command("remote_start_drive", { password: this.tesla.password });
  }

  actuateTrunk(data) {
    return this.command("actuate_trunk", data);
  }

  toggleTrunk() {
    return this.actuateTrunk({ which_trunk: "rear" });
  }

  toggleFrunk() {
    return this.actuateTrunk({ which_trunk: "front" });
  }

  windowControl(data) {
    return this.command("window_control", data);
  }

  ventWindows() {
    return this.windowControl({command: "vent", lat: 0, lon: 0});
  }

  closeWindows() {
    // must be near current location of the car for close operation to succeed
    return this.driveState()
      .then(data => {
        return this.windowControl({command: "close", lat: data.latitude, lon: data.longitude})
      });
  }

  setSpeedLimit(limitMph) {
    const MIN_SPEED_LIMIT_MPH = 50;
    const MAX_SPEED_LIMIT_MPH = 90;
    if (!limitMph || !parseInt(limitMph)) {
      return Promise.reject("Invalid `limitMph` value")
    }
    limitMph = parseInt(limitMph);
    if (limitMph < MIN_SPEED_LIMIT_MPH || limitMph > MAX_SPEED_LIMIT_MPH) {
      return Promise.reject(`Speed limit in MPH must be between ${MIN_SPEED_LIMIT_MPH}-${MAX_SPEED_LIMIT_MPH}`);
    }
    return this.command("speed_limit_set_limit", { limit_mph: limitMph });
  }

  activateSpeedLimit(pin) {
    if (pin && /^\d{4}$/.test(pin)) {
      this.speed_limit_pin = pin;
      return this.command("speed_limit_activate", { pin });
    } else {
      return Promise.reject("Invalid PIN format");
    }
  }

  deactivateSpeedLimit() {
    return this.command("speed_limit_deactivate", { pin: this.speed_limit_pin });
  }

  navigationRequest(address) {
    return this.command("navigation_request", {
      type: 'share_ext_content_raw',
      locale: 'en-US',
      timestamp_ms: new Date().getTime(),
      value: { 'android.intent.extra.TEXT': address }
    });
  }

  setSentryMode(on) {
    return this.command("set_sentry_mode", { on });
  }

  // Media

  mediaTogglePlayback() {
    return this.command("media_toggle_playback");
  }

  mediaNextTrack() {
    return this.command("media_next_track");
  }

  mediaPrevTrack() {
    return this.command("media_prev_track");
  }

  mediaNextFav() {
    return this.command("media_next_fav");
  }

  mediaPrevFav() {
    return this.command("media_prev_fav");
  }

  mediaVolumeUp() {
    return this.command("media_volume_up");
  }

  mediaVolumeDown() {
    return this.command("media_volume_down");
  }

  // Software Updates

  scheduleSoftwareUpdate(offset_sec = 1) {
    return this.command("schedule_software_update", { offset_sec });
  }

  cancelSoftwareUpdate() {
    return this.command("cancel_software_update");
  }

  // Summon/Autopark

  async autopark() {
    await this.refresh();
    return new Summon(this);
  }

}
