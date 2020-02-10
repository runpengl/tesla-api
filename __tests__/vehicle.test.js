import axios from "axios";
import Tesla from "../src/";
import { Vehicle } from "../src/vehicle";
import credentials from "../config/credentials.example";
import {
    convertToCamelCase,
} from "../src/middlewares";
import utils from "../src/utils";

let myTesla;

beforeEach(() => {
    axios.reset();
    axios._mockResponse = res => axios.mockResponse(convertToCamelCase[0](res));
    axios._mockResponseFor = (url, res) => axios.mockResponseFor(url, convertToCamelCase[0](res));

    const teslaCli = new Tesla(credentials);

    myTesla = new Vehicle(teslaCli, {
        id: 12345678901234567,
        vehicleId: 1234567890,
        vin: "5YJSA11111111111",
        displayName: "Nikola 2.0",
        optionCodes: "MDLS,RENA,AF02,APF1,APH2,APPB,AU01,BC0R,BP00,BR00,BS00,CDM0,CH05,PBCW,CW00,DCF0,DRLH,DSH7,DV4W,FG02,FR04,HP00,IDBA,IX01,LP01,ME02,MI01,PF01,PI01,PK00,PS01,PX00,PX4D,QTVB,RFP2,SC01,SP00,SR01,SU01,TM00,TP03,TR00,UTAB,WTAS,X001,X003,X007,X011,X013,X021,X024,X027,X028,X031,X037,X040,X044,YFFC,COUS",
        color: "White",
        tokens: ["abcdef1234567890", "1234567890abcdef"],
        state: "online",
        inService: false,
        idS: "12345678901234567",
        calendarEnabled: true,
        apiVersion: 7
    });
});

describe("Vehicle State", () => {

    it("can fetch vehicle data", () => {
        const getData = myTesla.data();
        const path = `/vehicles/${myTesla.idS}/vehicle_data`;
        expect(axios.get).toBeCalledWith(path);
        axios._mockResponse({
            data: require("../__fixtures__/vehicle_data_response.json")
        });

        return getData.then(data => {
            expect(data.driveState).toBeTruthy();
            expect(data.climateState).toBeTruthy();
            expect(data.vehicleState).toBeTruthy();
            expect(data.chargeState).toBeTruthy();
            expect(data.guiSettings).toBeTruthy();
            expect(data.vehicleConfig).toBeTruthy();
        });
    });

    it("can fetch charge state", () => {
        myTesla.chargeState();
        const path = `/vehicles/${myTesla.idS}/data_request/charge_state`;
        expect(axios.get).toBeCalledWith(path);
        axios._mockResponse({
            data: require("../__fixtures__/charge_state_response.json")
        });
    });

    it("can fetch climate state", () => {
        myTesla.climateState();
        const path = `/vehicles/${myTesla.idS}/data_request/climate_state`;
        expect(axios.get).toBeCalledWith(path);
        axios._mockResponse({
            data: require("../__fixtures__/climate_state_response.json")
        });
    });

    it("can fetch drive state", () => {
        myTesla.driveState();
        const path = `/vehicles/${myTesla.idS}/data_request/drive_state`;
        expect(axios.get).toBeCalledWith(path);
        axios._mockResponse({
            data: require("../__fixtures__/drive_state_response.json")
        });
    });

    it("can fetch GUI settings", () => {
        myTesla.guiSettings();
        const path = `/vehicles/${myTesla.idS}/data_request/gui_settings`;
        expect(axios.get).toBeCalledWith(path);
        axios._mockResponse({
            data: require("../__fixtures__/gui_settings_response.json")
        });
    });

    it("can fetch vehicle state", () => {
        myTesla.vehicleState();
        const path = `/vehicles/${myTesla.idS}/data_request/vehicle_state`;
        expect(axios.get).toBeCalledWith(path);
        axios._mockResponse({
            data: require("../__fixtures__/vehicle_state_response.json")
        });
    });

    it("can fetch vehicle config", () => {
        myTesla.vehicleConfig();
        const path = `/vehicles/${myTesla.idS}/data_request/vehicle_config`;
        expect(axios.get).toBeCalledWith(path);
        axios._mockResponse({
            data: require("../__fixtures__/vehicle_config_response.json")
        });
    });

    it("can fetch mobile-enabled state", () => {
        myTesla.mobileEnabled();
        const path = `/vehicles/${myTesla.idS}/mobile_enabled`;
        expect(axios.get).toBeCalledWith(path);
    });
    
    it("can fetch nearby charging sites", () => {
        myTesla.nearbyChargingSites();
        const path = `/vehicles/${myTesla.idS}/nearby_charging_sites`;
        expect(axios.get).toBeCalledWith(path);
    });

});

describe("Commands", () => {

    it("can wake up the car", () => {
        myTesla.wakeUp();
        const path = `/vehicles/${myTesla.idS}/wake_up`;
        expect(axios.post).toBeCalledWith(path, {});
    });

    it("can unlock and lock the doors", () => {
        myTesla.doorUnlock();
        let path = `/vehicles/${myTesla.idS}/command/door_unlock`;
        expect(axios.post).toBeCalledWith(path, {});

        myTesla.doorLock();
        path = `/vehicles/${myTesla.idS}/command/door_lock`;
        expect(axios.post).toBeCalledWith(path, {});
    });

    it("it can flash the lights", () => {
        myTesla.flashLights();
        const path = `/vehicles/${myTesla.idS}/command/flash_lights`;
        expect(axios.post).toBeCalledWith(path, {});
    });

    it("it can honk the horn", () => {
        myTesla.honkHorn();
        const path = `/vehicles/${myTesla.idS}/command/honk_horn`;
        expect(axios.post).toBeCalledWith(path, {});
    });

    describe("Charging", () => {
        it("can execute all charging commands", () => {
            const chargeCommands = [
                "charge_port_door_open", 
                "charge_port_door_close", 
                "charge_start", 
                "charge_stop",
                "charge_max_range",
                "charge_standard"
            ]
    
            for (let command of chargeCommands) {
                const methodName = utils.camelCase(command);
                myTesla[methodName]();
                const path = `/vehicles/${myTesla.idS}/command/${command}`;
                expect(axios.post).toBeCalledWith(path, {});
            }
        });

        it("can set charge limit", () => {
            myTesla.setChargeLimit(80);
            const path = `/vehicles/${myTesla.idS}/command/set_charge_limit`;
            expect(axios.post).toBeCalledWith(path, { percent: 80 });
        });
    });

    describe("Sentry mode", () => {
        it("can toggle sentry mode", () => {
            const path = `/vehicles/${myTesla.idS}/command/set_sentry_mode`;

            myTesla.setSentryMode(true);
            expect(axios.post).toBeCalledWith(path, {on: true});
            
            myTesla.setSentryMode(false);
            expect(axios.post).toBeCalledWith(path, {on: false});
        });
    });

    describe("Media", () => {
        it("can execuate all media commands", () => {
            const mediaCommands = [
                "media_toggle_playback", 
                "media_next_track", 
                "media_prev_track", 
                "media_next_fav", 
                "media_prev_fav", 
                "media_volume_up", 
                "media_volume_down"
            ]
    
            for (let command of mediaCommands) {
                const methodName = utils.camelCase(command);
                myTesla[methodName]();
                const path = `/vehicles/${myTesla.idS}/command/${command}`;
                expect(axios.post).toBeCalledWith(path, {});
            }
        });
    });
});