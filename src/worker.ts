// worker.ts
import { parentPort } from 'worker_threads';
import CatanServiceProxy from "./proxy";
import { CatanMessage, TestContext, CatanMessageMap, isCatanMessage } from './Models/shared_models';
import { WorkerMessage, WorkerInitData } from './gameworker';
import { AxiosError } from 'axios';

parentPort?.on('message', (message: WorkerMessage) => {
    console.log("parentPort?.on: ", message);
    console.log("worker authToken: ", message.data.authToken);
    console.log("worker cosmos: ", message.data.useCosmos);
    switch (message.type) {
        case 'init': {
            const { authToken, useCosmos } = message.data as WorkerInitData;
            longPollingLoop(authToken, useCosmos);
            break;
        }
        // handle other message types as needed
    }
});

async function longPollingLoop(authToken: string, useCosmos: boolean) {

    let proxy = new CatanServiceProxy("https://localhost:8080", new TestContext(useCosmos), authToken);

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
                    parentPort?.postMessage({ type: messageType, data: message[messageType] });
                }
                index++;
            } else {
                // Handle error or retry logic
                await new Promise(res => setTimeout(res, 1000)); // 1 second delay before retry

                //
                // we can get here if the connection was reset and the id is bad
                proxy = new CatanServiceProxy("https://localhost:8080", new TestContext(useCosmos), authToken);
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


