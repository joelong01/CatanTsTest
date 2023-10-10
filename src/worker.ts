// worker.ts
import { parentPort } from 'worker_threads';
import CatanServiceProxy from "./proxy";
import { CatanMessage, CatanMessageMap } from './Models/shared_models';
import { WorkerMessage, WorkerInitData } from './gameworker';
import { AxiosError } from 'axios';


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

    const proxy = new CatanServiceProxy("https://localhost:8080", authToken);

    let gameId: string | undefined;
    let index: number = 0;

    for (; ;) {
        try {
            console.log("polling service.  index: ", index);
            const pollResponse = await proxy.longPoll();
            console.log("returned from longPoll", pollResponse);
            if (pollResponse.isOk()) {
                const message: CatanMessage = pollResponse.getValue();
                console.log("long_poll.  message=%o", message);
                const messageType = getMessageType(message);
                if (messageType && Object.prototype.hasOwnProperty.call(message, messageType)) {
                    // let messageData: unknown = message[messageType];
                    // if (messageType === "gameCreated") {
                    //     gameId = message.gameCreated?.gameId as string;
                    // } else if (messageType === "gameUpdate") {
                    //   messageData = serviceToClientGame(messageData as ServiceGame) as ClientGame;
                    // }
                    parentPort?.postMessage({ type: messageType, data: message[messageType] });

                }
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

function getMessageType(message: CatanMessage): keyof CatanMessageMap | null {
    for (const key of Object.keys(message) as Array<keyof CatanMessageMap>) {
        if (message[key] !== undefined) {
            return key;
        }
    }
    return null;
}


