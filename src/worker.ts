/* eslint-disable @typescript-eslint/no-unused-vars */

import { AxiosError } from "axios";
import { parentPort } from "worker_threads";
import { xformWireFormatToClientFormat } from "./Models/wire_formats";
import { WorkerMessage } from "./gameworker";
import CatanServiceProxy from "./proxy";






parentPort?.on('message', (message: WorkerMessage) => {
    console.log("parentPort?.on: ", message);
    switch (message.type) {
        case 'init': {

            longPollingLoop(message.data.authToken, message.data.host);
            break;
        }
    }
});

async function longPollingLoop(authToken: string, host: string) {

    const proxy = new CatanServiceProxy(host, authToken);

    let gameId: string | undefined;
    let index: number = 0;

    for (; ;) {
        try {
            console.log("polling service.  index: ", index);
            const pollResponse = await proxy.longPoll();
            console.log("returned from longPoll", pollResponse);
            if (pollResponse.isOk()) {
                const message = xformWireFormatToClientFormat(pollResponse.getValue());
                console.log("long_poll.  message=%o", message);
                if (message.type == "gameCreated") {
                    gameId = message.payload.gameId;
                }
                parentPort?.postMessage(message);
                index++;

            } else {
                let version_response;
                do {
                    // Handle error or retry logic
                    await new Promise(res => setTimeout(res, 10000)); // 10 second delay before retry
                    version_response = await proxy.getVersion();

                } while (version_response.isErr());

                // we've come out of the loop, so service must be running again -- tell it to load the game
                if (gameId) {
                    const connect_result = await proxy.joinLobby();
                    if (connect_result.isOk()) {
                        const load_response = await proxy.reloadGame(gameId);
                        if (load_response.isOk()) {
                            parentPort?.postMessage({ type: "GameUpdate", data: load_response.getValue() })
                        }
                    }
                }
            }
        }
        catch (e: unknown) {
            const axios_err: AxiosError = e as AxiosError;

            if (axios_err) {
                if (axios_err.code! === 'ECONNRESET') {
                    console.log("Service is down. waiting 5 seconds and then attempting to refresh the game.")
                    await new Promise(res => setTimeout(res, 5000));
                }
            } else {
                console.log("caught exception in worker.  ignoring", e);
            }
        }
    }

}




