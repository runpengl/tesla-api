import axios from "axios";
import utils from "./utils";
import { API_URL, ANDROID_USER_AGENT, CLIENT_ID, CLIENT_SECRET, API_HOST } from "./constants";
import {
  convertUnits,
  convertToCamelCase,
  convertError,
  log
} from "./middlewares";

export var request = axios;

Object.assign(axios.defaults, {
  baseURL: API_URL,
  headers: { common: { "User-Agent": ANDROID_USER_AGENT } }
});
axios.interceptors.response.use(...log);
axios.interceptors.response.use(...convertUnits);
axios.interceptors.response.use(...convertToCamelCase);
axios.interceptors.response.use(...convertError);

const refreshOAuth = token => (
  new Promise((resolve, reject) => {
    axios.post(`${API_HOST}/oauth/token`, {refresh_token: token, grant_type: "refresh_token"})
    .then(res => {
      resolve(res.data);
    })
    .catch(reject);
  })
);

axios.interceptors.request.use(async (config) => {
  if (config.url.includes('/oauth/token')) {
    return config;
  }
  const time = new Date().getTime();
  if (!config.expiresAt || time > config.expiresAt - 60 * 1000) {
    // refresh OAuth if with 60 seconds of expiring
    const oAuth = await refreshOAuth(config.refreshToken);
    config.headers["Authorization"] = `Bearer ${oAuth.accessToken}`;
    axios.defaults.headers.common["Authorization"] = config.headers["Authorization"];
    axios.defaults.refreshToken = oAuth.refreshToken;
    axios.defaults.expiresAt = time + oAuth.expiresIn * 1000;
  }
  return config;
});