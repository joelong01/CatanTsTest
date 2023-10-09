// worker.ts
import { parentPort } from 'worker_threads';
import CatanServiceProxy from "./proxy";
import { CatanMessage, TestCallContext, CatanMessageMap, isCatanMessage, ServiceError } from './Models/shared_models';
import { WorkerMessage, WorkerInitData } from './gameworker';
import { AxiosError } from 'axios';
import { RegularGame } from './Models/game_models';

parentPort?.on('message', (message: WorkerMessage) => {
    console.log("parentPort?.on: ", message);
    console.log("worker authToken: ", message.data.authToken);
    console.log("worker cosmos: ", message.data.useCosmos);
    switch (message.type) {
        case 'init': {
            const { authToken } = message.data as WorkerInitData;
            longPollingLoop(authToken);
            break;
        }
        // handle other message types as needed
    }
});

async function longPollingLoop(authToken: string) {

    let proxy = new CatanServiceProxy("https://localhost:8080", authToken);

    var gameId: string | undefined;
    let index: number = 0;

    for (; ;) {
        try {
            console.log("polling service.  index: ", index);
            const pollResponse = await proxy.longPoll();
            console.log("returned from longPoll", pollResponse);
            var message = isCatanMessage(pollResponse);
            if (message) {
                console.log("long_poll.  message=%o", message);
                const messageType = getMessageType(message);
                if (messageType && Object.prototype.hasOwnProperty.call(message, messageType)) {
                    if (messageType === "GameCreated") {
                        gameId = message.gameCreated?.GameId as string;
                    }
                    parentPort?.postMessage({ type: messageType, data: message[messageType] });
                }
                index++;
            } else {
                var version_response;
                do {
                    // Handle error or retry logic
                    await new Promise(res => setTimeout(res, 10000)); // 10 second delay before retry
                    version_response = proxy.getVersion();

                } while (version_response instanceof ServiceError);

                // we've come out of the loop, so service must be running again -- tell it to load the game
                if (gameId) {
                    var connect_result = await proxy.joinLobby();
                    if (!(connect_result instanceof ServiceError)) {
                        let load_response = await proxy.reloadGame(gameId);
                        if (!(load_response instanceof ServiceError)) {

                            parentPort?.postMessage({ type: "GameUpdate", data: load_response as RegularGame })
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

function getMessageType(message: CatanMessage): keyof CatanMessageMap | null {
    for (const key of Object.keys(message) as Array<keyof CatanMessageMap>) {
        if (message[key] !== undefined) {
            return key;
        }
    }
    return null;
}


