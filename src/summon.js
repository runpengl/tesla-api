const WebSocket = require("isomorphic-ws");
import { WebSocket as MockWebSocket } from "mock-socket";
import { STREAM_HOST } from "./constants";

const noop = () => {};

export class Summon {
  constructor(vehicle, { onOpen = noop, onSummonReady = noop } = {}, opts = { host:  STREAM_HOST, protocol: "wss", headers: true }) {
    
    this.vehicle = vehicle;

    const { tesla, vehicleId, tokens } = this.vehicle;

    const socketUrl = `${opts.proto}://${opts.host}/connect/${vehicleId}`;

    const encodedAuthStr = new Buffer(`${tesla.email}:${tokens[0]}`).toString(
      "base64"
    );
    
    this.socket = opts.headers ? new WebSocket(
      socketUrl,
      null,
      {
        headers: {
          Authorization: `Basic ${encodedAuthStr}`
        }
      }
    ) : new MockWebSocket(socketUrl);

    this.socket.onmessage = event => {
      const message = JSON.parse(event.data);
      switch (message.msg_type) {
        case "control:hello":
          this.beginHeartbeat(message.autopark.heartbeat_frequency);
          onOpen();
          break;
        case "autopark:status":
          message.autopark_state === "ready" && onSummonReady();
          break;
      }
    }

    return this;
  }

  beginHeartbeat(frequency) {
    this.heartbeatTimer = setInterval(() => {
      this.heartbeat().catch(err => {
        this.socket.close(1, err);
      });
    }, frequency);
  }

  heartbeat() {
    return new Promise((resolve, reject) => {
      const commandObj = {
        msg_type: "autopark:heartbeat_app",
        timestamp: Date.now()
      };
      this.socket.send(JSON.stringify(commandObj), err => {
        return err ? reject(err) : resolve();
      });
    });
  }

  forward() {
    return new Promise((resolve, reject) => {
      this.vehicle
        .driveState()
        .then(state => {
          const commandObj = {
            msg_type: "autopark:cmd_forward",
            latitude: state.latitude,
            longitude: state.longitude
          };
          this.socket.send(JSON.stringify(commandObj), err => {
            return err ? reject(err) : resolve();
          });
        })
        .catch(err => reject(err));
    });
  }

  reverse() {
    return new Promise((resolve, reject) => {
      this.vehicle
        .driveState()
        .then(state => {
          const commandObj = {
            msg_type: "autopark:cmd_reverse",
            latitude: state.latitude,
            longitude: state.longitude
          };
          this.socket.send(JSON.stringify(commandObj), err => {
            return err ? reject(err) : resolve();
          });
        })
        .catch(err => reject(err));
    });
  }

  abort() {
    return new Promise((resolve, reject) => {
      const commandObj = {
        msg_type: "autopark:cmd_abort"
      };
      this.socket.send(JSON.stringify(commandObj), err => {
        return err ? reject(err) : resolve();
      });
    });
  }

}