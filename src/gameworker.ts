import { Worker } from 'worker_threads';
import { CatanGames, GameAction, RegularGame } from './Models/game_models';
import { Invitation, InvitationResponseData, GameCreatedData, ErrorData, CatanMessageMap, UserProfile } from './Models/shared_models';
import CatanServiceProxy from './proxy';
import { serialize } from 'v8';

export interface WorkerInitData {
    authToken: string;
    // Add any other data as needed
}

export interface WorkerMessage {
    type: 'init' | 'quit'; // you can expand this union type as needed
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: WorkerInitData | any; // use more specific types as needed
}

export type ServiceMessage = {
    [K in keyof CatanMessageMap]: {
        type: K,
        data: CatanMessageMap[K]
    }
}[keyof CatanMessageMap];


export class GameWorkerManager {
    private worker: Worker;
    private proxy: CatanServiceProxy;

    private game: RegularGame | undefined;
    constructor(workerPath: string, proxy: CatanServiceProxy) {
        this.worker = new Worker(workerPath);
        this.proxy = proxy;
        this.bindEvents();
    }

    private bindEvents() {
        this.worker.on('message', this.handleMessage.bind(this));
        this.worker.on('error', this.handleError.bind(this));
        this.worker.on('exit', this.handleExit.bind(this));

    }

    public postMessage(message: WorkerMessage): void {
        this.worker.postMessage(message);
    }



    public async Start(): Promise<void> {

        (await this.proxy.joinLobby()).expect("joining lobby should work");


        this.postMessage({ type: 'init', data: { authToken: this.proxy.getAuthToken() } });
        this.game = (await this.proxy.newGame(CatanGames.Regular)).expect("newGame should not fail");
        //
        // next we should get a Created message
    }

    private handleMessage(message: ServiceMessage) {
        console.log("received message: ", message.type);
        switch (message.type) {
            case 'gameUpdate':
                this.handleGameUpdate(message.data);
                break;
            case 'invite':
                this.handleInvite(message.data);
                break;
            case 'invitationResponse':
                this.handleInvitationResponse(message.data);
                break;
            case 'gameCreated':
                this.handleGameCreated(message.data);
                break;
            case 'playerAdded':
                this.handlePlayerAdded(message.data);
                break;
            case 'started':
                this.handleStarted(message.data);
                break;
            case 'ended':
                this.handleEnded(message.data);
                break;
            case 'error':
                this.handleErrorData(message.data);
                break;
            default:
                console.log('Received unknown message:', message);
        }
    }

    private handleGameUpdate(data: RegularGame) {
        console.log('GameUpdate received: %o [size=%i]', data, serialize(data).length);
        this.game = data;

        // Handle the GameUpdate logic
    }

    private handleInvite(data: Invitation) {
        console.log('Invite received:', data);
        // Handle the Invite logic
    }

    private handleInvitationResponse(data: InvitationResponseData) {
        console.log('InvitationResponse received:', data);
        // Handle the InvitationResponse logic
    }

    private async handleGameCreated(data: GameCreatedData) {
        console.log('GameCreated received:', data);
        //
        //  lets add our first local players
        let localUsers = (await this.proxy.getLocalUsers("Self")).expect("getLocalUser to work");
        (await this.proxy.addLocalUserToLobby(localUsers[0].userId as string, data.gameId))
            .expect("addLocalUserToLobby should succeed");
        (await this.proxy.addLocalUserToLobby(localUsers[1].userId as string, data.gameId))
            .expect("addLocalUserToLobby should succeed");;

    }

    private async handlePlayerAdded(data: string[]) {
        console.log('PlayerAdded received:', data);
        var actions = (await this.proxy.getActions(this.game!.gameId)).expect("success");

        console.log("adding players:  valid actions: %o players: %o", actions, data);
        if (actions.includes(GameAction.Next)) {
            actions = (await this.proxy.next(this.game!.gameId)).expect("success");
            console.log("now valid actions: ", actions);
            let game = (await this.proxy.newBoard(this.game!.gameId)).expect("success newBoard");
            console.log("new game created: %o", game);

        }
    }

    private handleStarted(data: string) {
        console.log('Started received:', data);
        // Handle the Started logic
    }

    private handleEnded(data: string) {
        console.log('Ended received:', data);
        // Handle the Ended logic
    }

    private handleErrorData(data: ErrorData) {
        console.log('Error received:', data);
        // Handle the Error logic
    }

    private handleError(err: Error) {
        console.error('Worker error:', err);
        // Handle the error, maybe retry the worker, log the error, etc.
    }

    private handleExit(code: number) {
        if (code !== 0) {
            console.warn(`Worker stopped with exit code ${code}`);
            // Handle the exit, maybe restart the worker, etc.
        } else {
            console.log('Worker stopped gracefully');
        }
    }

    // ... any other methods related to the worker management or game logic
}

// Usage:

//const gameManager = new GameWorkerManager('./worker.ts', proxy);
// Now you can use methods of gameManager as required
