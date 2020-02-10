import Tesla from "../src/";
import { Vehicle } from "../src/vehicle";
import { Summon } from "../src/summon";
import credentials from "../config/credentials.example";
import WS from "jest-websocket-mock";

const MOCK_HOST = 'localhost:1337';
let myTesla;
let socketUrl;

beforeEach(() => {
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

    socketUrl = `ws://${MOCK_HOST}/connect/${myTesla.vehicleId}`;

    WS.clean();
});

describe("Autopark", () => {

    it("creates the socket connection", async () => {
        const mockServer = new WS(socketUrl);
        const autopark = new Summon(myTesla, 
            {}, 
            { host: MOCK_HOST, proto: 'ws', headers: false }
        );
        expect(autopark.socket.url).toBe(socketUrl);
        await mockServer.connected;
        mockServer.close();
    });

    it("receives the hello and autopark status messages", async () => {
        const mockServer = new WS(socketUrl, { jsonProtocol: true });

        const mockOnOpen = jest.fn();
        const mockOnSummonReady = jest.fn();
        const autopark = new Summon(myTesla, 
            { onOpen: mockOnOpen, onSummonReady: mockOnSummonReady }, 
            { host: MOCK_HOST, proto: 'ws', headers: false }
        );
        await mockServer.connected;

        mockServer.send({ msg_type: "control:hello", autopark: { heartbeat_frequency: 1000 }});
        expect(mockOnOpen).toHaveBeenCalled();
        expect(mockOnSummonReady).not.toHaveBeenCalled();
        expect(autopark.heartbeatTimer).toBeTruthy();

        mockServer.send({ msg_type: "autopark:status", autopark_state: "not_ready" });
        expect(mockOnSummonReady).not.toHaveBeenCalled();
        mockServer.send({ msg_type: "autopark:status", autopark_state: "ready" });
        expect(mockOnSummonReady).toHaveBeenCalled();

        mockServer.close();
    });

    it("can send autopark reverse message", async() => {
        const mockServer = new WS(socketUrl);

        const autopark = new Summon(myTesla, 
            {}, 
            { host: MOCK_HOST, proto: 'ws', headers: false }
        );
        await mockServer.connected;
        
        myTesla.driveState = jest.fn(() => 
            Promise.resolve({
                latitude: "33.11111",
                longitude: "88.11111"
            })
        );
        autopark.reverse();

        await expect(mockServer).toReceiveMessage(JSON.stringify({
            msg_type: "autopark:cmd_reverse",
            latitude: "33.11111",
            longitude: "88.11111"
        }));
    });

    it("can send autopark forward message", async() => {
        const mockServer = new WS(socketUrl);

        const autopark = new Summon(myTesla, 
            {}, 
            { host: MOCK_HOST, proto: 'ws', headers: false }
        );
        await mockServer.connected;
        
        myTesla.driveState = jest.fn(() => 
            Promise.resolve({
                latitude: "33.11111",
                longitude: "88.11111"
            })
        );
        autopark.forward();

        await expect(mockServer).toReceiveMessage(JSON.stringify({
            msg_type: "autopark:cmd_forward",
            latitude: "33.11111",
            longitude: "88.11111"
        }));
    });

    it("can send autopark abort message", async() => {
        const mockServer = new WS(socketUrl);

        const autopark = new Summon(myTesla, 
            {}, 
            { host: MOCK_HOST, proto: 'ws', headers: false }
        );
        await mockServer.connected;
        
        autopark.abort();

        await expect(mockServer).toReceiveMessage(JSON.stringify({
            msg_type: "autopark:cmd_abort"
        }));
    });

});