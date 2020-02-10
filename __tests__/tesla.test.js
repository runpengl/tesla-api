import axios from "axios";
import Tesla from "../src/";
import { checkAccessTokenExpiration } from "../src/request";
import { CLIENT_ID, CLIENT_SECRET, API_HOST } from "../src/constants";
import credentials from "../config/credentials.example";
import {
    convertToCamelCase,
} from "../src/middlewares";
import crypto from "crypto";

beforeEach(() => {
    axios.reset();
    axios._mockResponse = res => axios.mockResponse(convertToCamelCase[0](res));
    axios._mockResponseFor = (url, res) => axios.mockResponseFor(url, convertToCamelCase[0](res));
});

describe("Authentication", () => {

    it("can authenticate with username and password", () => {

        const teslaLogin = new Tesla(credentials).login();

        expect(axios.post).toHaveBeenCalledWith(`${API_HOST}/oauth/token`,
            {
                grant_type: "password",
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                email: credentials.email,
                password: credentials.password
            }
        );

        const mockAuthResponse = {
            data: {
                access_token: crypto.randomBytes(16).toString("hex"),
                refresh_token: crypto.randomBytes(16).toString("hex"),
                expires_in: 3600
            }
        }
        axios._mockResponse(mockAuthResponse);

        return teslaLogin.then(() => {
            expect(axios.defaults.refreshToken).toBe(mockAuthResponse.data.refresh_token);
            expect(axios.defaults.headers.common['Authorization']).toBe(`Bearer ${mockAuthResponse.data.access_token}`);
            expect(axios.defaults.expiresAt / 1000).toBeCloseTo(new Date().getTime() / 1000 + mockAuthResponse.data.expires_in);
        });

    });

    it("can authenticate with refresh token", () => {

        const teslaLogin = new Tesla({ refreshToken: credentials.refreshToken }).login();

        expect(axios.post).toHaveBeenCalledWith(`${API_HOST}/oauth/token`,
            {
                grant_type: "refresh_token",
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                refresh_token: credentials.refreshToken
            }
        );

        const mockAuthResponse = {
            data: {
                access_token: crypto.randomBytes(16).toString("hex"),
                refresh_token: crypto.randomBytes(16).toString("hex"),
                expires_in: 3600
            }
        }
        axios._mockResponse(mockAuthResponse);

        return teslaLogin.then(() => {
            expect(axios.defaults.refreshToken).toBe(mockAuthResponse.data.refresh_token);
            expect(axios.defaults.headers.common['Authorization']).toBe(`Bearer ${mockAuthResponse.data.access_token}`);
            expect(axios.defaults.expiresAt / 1000).toBeCloseTo(new Date().getTime() / 1000 + mockAuthResponse.data.expires_in);
        });

    });

    it("can re-authenticate with refresh token", () => {

        const teslaCli = new Tesla(credentials);

        const login = teslaCli.login();
        axios._mockResponseFor(`${API_HOST}/oauth/token`, {
            data: {
                access_token: "fake_access_token_1",
                refresh_token: "fake_refresh_token_1",
                expires_in: 0
            }
        });

        return login.then(async () => {
            const refreshOAuthMock = jest.fn(() =>
                Promise.resolve({
                    accessToken: "fake_access_token_2",
                    refreshToken: "fake_refresh_token_2",
                    expiresIn: 3600
                })
            );
            axios.defaults.url = "/products";
            await checkAccessTokenExpiration(axios.defaults, refreshOAuthMock);
            expect(refreshOAuthMock).toHaveBeenCalledWith("fake_refresh_token_1");
            const products = teslaCli.products();
            axios._mockResponseFor(`/products`, {
                data: {
                    response: []
                }
            });
            return products.then(() => {
                expect(axios.defaults.refreshToken).toBe("fake_refresh_token_2");
                expect(axios.defaults.headers.common['Authorization']).toBe("Bearer fake_access_token_2");
                expect(axios.defaults.expiresAt / 1000).toBeCloseTo(new Date().getTime() / 1000 + 3600);
            });
        });
    });
});

describe("Products", () => {
    it("can fetch products", () => {
        const teslaCli = new Tesla(credentials);

        teslaCli.products();

        expect(axios.get).toHaveBeenCalledWith("/products");
    });
});

describe("Vehicles", () => {

    let teslaCli;
    let mockVehiclesResponse;

    beforeEach(() => {
        teslaCli = new Tesla(credentials);
        mockVehiclesResponse = { data: require("../__fixtures__/vehicles_response.json") };
    });

    it("can fetch vehicles", () => {
        const getVehicles = teslaCli.vehicles();

        expect(axios.get).toHaveBeenCalledWith("/vehicles");
        axios._mockResponseFor("/vehicles", mockVehiclesResponse);

        return getVehicles.then(vehicles => {
            expect(vehicles).toHaveLength(mockVehiclesResponse.data.response.length);
            expect(vehicles[0]).toBeTruthy();
        });

    });

    it("can fetch default vehicle", async () => {
        const getDefaultVehicle = teslaCli.getVehicle();

        axios._mockResponseFor({ url: "/vehicles" }, mockVehiclesResponse);

        return getDefaultVehicle.then(vehicle => {
            expect(vehicle.sId).toBe(mockVehiclesResponse.data.response[0].s_id);
        });
    });

    it("can fetch vehicle with ID", async () => {
        const getVehicleWithId = teslaCli.getVehicle(mockVehiclesResponse.data.response[0].vehicle_id);

        axios._mockResponseFor({ url: "/vehicles" }, mockVehiclesResponse);

        return getVehicleWithId.then(vehicle => {
            expect(vehicle.vehicleId).toBe(mockVehiclesResponse.data.response[0].vehicle_id);
        });
    });

});