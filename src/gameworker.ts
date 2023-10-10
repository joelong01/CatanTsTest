import { Worker } from 'worker_threads';
import {
    CatanGameType, GameAction, ClientGame, findTile, isEqualTile, clientToServiceGame,
    serviceToClientGame, isEqualTileKey, findRoad,  isEqualRoad, isEqualBuildingKey, isEqualBuilding
} from './Models/game_models';
import {
    Invitation, InvitationResponseData, GameCreatedData, ErrorData,
    CatanMessageMap
} from './Models/shared_models';
import CatanServiceProxy from './proxy';
import _ from 'lodash';
import { serialize } from 'v8';
import assert from 'assert';



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

    private game: ClientGame | undefined;
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
        this.game = (await this.proxy.newGame(CatanGameType.Regular)).expect("newGame should not fail");
        //
        // next we should get a Created message
    }

    private handleMessage(message: ServiceMessage) {
        console.log("received message: ", message.type);
        switch (message.type) {
            case 'gameUpdate': {
                const clientGame = serviceToClientGame(message.data);
                this.handleGameUpdate(clientGame);
            }
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

    private handleGameUpdate(data: ClientGame) {
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
        const localUsers = (await this.proxy.getLocalUsers("Self")).expect("getLocalUser to work");
        (await this.proxy.addLocalUserToLobby(localUsers[0].userId as string, data.gameId))
            .expect("addLocalUserToLobby should succeed");
        (await this.proxy.addLocalUserToLobby(localUsers[1].userId as string, data.gameId))
            .expect("addLocalUserToLobby should succeed");

    }

    private async handlePlayerAdded(data: string[]) {
        console.log('PlayerAdded received:', data);
        let actions = (await this.proxy.getActions(this.game!.gameId)).expect("success");

        console.log("adding players:  valid actions: %o players: %o", actions, data);
        if (actions.includes(GameAction.Next)) {
            actions = (await this.proxy.next(this.game!.gameId)).expect("success");
            console.log("now valid actions: ", actions);
            const game = (await this.proxy.shuffleBoard(this.game!.gameId, undefined)).expect("success newBoard");
            console.log("new game created: %o", game);
            assert(!_.isEqual(game, this.game), "games should be different");
            assert(_.isEqual(game.players, this.game?.players), "players should be the same");
            assert(_.isEqual(game.gameId, this.game?.gameId), "ids should be the same");

            const local_game: ClientGame = _.cloneDeep(this.game) as ClientGame;

            assert(this.isSameGame(local_game, this.game as ClientGame), "clone deep yields same game");
            const services_game = clientToServiceGame(local_game);
            const game2 = serviceToClientGame(services_game);
            assert(this.isSameGame(local_game, game2), "client/service game round trip yeils the same game");
            const shuffled_game = (await this.proxy.shuffleBoard(this.game!.gameId, local_game)).expect("success newBoard");
            assert(this.isSameGame(shuffled_game, local_game), "shuffled game with call context returns passed in game");
            assert(isEqualTileKey(shuffled_game.baronTile, local_game?.baronTile), "newBoard with test call context has the same baron")
       //     logGames(shuffled_game, local_game);


        }
    }

    private isSameGame(game1: ClientGame, game2: ClientGame): boolean {
        game1.tiles.forEach((tile) => {
            const tile2 = findTile(tile.tileKey, game2.tiles);
            if (!isEqualTile(tile, tile2)) {
                return false;
            }
        })

        game1.roads.forEach((road) => {
            const road2 = findRoad(road.roadKey, game2.roads);
            if (!isEqualRoad(road, road2)) {
                return false;
            }
        })

        game1.buildings.forEach((building)=> {
            const building2 = game2.buildings.find( (b) => isEqualBuildingKey(b.buildingKey, building.buildingKey));
            if (!isEqualBuilding(building, building2)) return false;
        })


        // const test = objectsAreEqual(game1, game2)
        // return test;
        // game1.tiles.forEach((tile) => {
        //     const tile2 = findTile(tile.tileKey, game2.tiles);
        //     if (!isEqualTile(tile, tile2)) {
        //         return false;
        //     }
        // })

        if (!isEqualTileKey(game1.baronTile, game2.baronTile)) return false;
        if (game1.gameId !== game2.gameId) return false;
        if (game1.gameState !== game2.gameState) return false;
        if (game1.currentPlayerId !== game2.currentPlayerId) return false;
        if (game1.creatorId !== game2.creatorId) return false;
        if (game1.canUndo !== game2.canUndo) return false;
        if (game1.shuffleCount !== game2.shuffleCount) return false;
        if (game1.gameIndex !== game2.gameIndex) return false;
        if (game1.gameType !== game2.gameType) return false;

        // const difference = diff.diffString(JSON.stringify(deepSort(game1)), JSON.stringify(deepSort(game2)), {verbose: true});
        // console.log("%o", JSON.parse(difference));
        return true;
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


}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deepSort(object: any): any {
    if (Array.isArray(object)) {
        return object.map(deepSort).sort();
    } else if (typeof object === 'object' && object !== null) {
        return Object.keys(object)
            .sort()
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .reduce((sorted: { [key: string]: any }, key) => {
                sorted[key] = deepSort(object[key]);
                return sorted;
            }, {});
    } else {
        return object;
    }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
function objectsAreEqual(a: any, b: any): boolean {
    return JSON.stringify(deepSort(a)) === JSON.stringify(deepSort(b));
}


// Usage:

//const gameManager = new GameWorkerManager('./worker.ts', proxy);
// Now you can use methods of gameManager as required
