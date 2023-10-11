/**
 * Some of the wire fomats coming back from the rust service are not canonical typescript.  This file contains data 
 * structures that represent the wire format that we want to change. The "final" datastructures used by the client
 * are in shread_models.ts or in game_models.ts.
 * 
 * if there is no tranform required, then we skip defining a wire format
 */

import {
    ClientGame, GameState, TileKey, CatanGameType, Player, HarborKey, Harbor, RoadKey, Road,
    BuildingKey, Building, Tile
} from "./game_models";
import { ServiceMessage, Invitation, InvitationResponseData, GameCreatedData, ErrorData } from "./shared_models";
/**
 * the wire has the arrays as a series of key/value pairs, but the key is in the value.
 */

export type PlayerEntry = [string, Player];
export type HarborEntry = [HarborKey, Harbor];
export type RoadEntry = [RoadKey, Road];
export type BuildingEntry = [BuildingKey, Building];
export type TileEntry = [TileKey, Tile];


export interface GameWireFormat {
    gameId: string;
    players: PlayerEntry[];
    tiles: TileEntry[];
    harbors: HarborEntry[];
    roads: RoadEntry[];
    buildings: BuildingEntry[];
    currentPlayerId: string;
    playerOrder: string[];
    gameState: GameState;
    creatorId: string;
    baronTile: TileKey;
    canUndo: boolean,
    shuffleCount: number;
    gameIndex: number,
    gameType: CatanGameType
}

/**
 * the wire has the arrays as a series of key/value pairs, but the key is in the value.  so we convert them directly
 * to arrays of values (players, tile, harbors, roads, and buildings)
 * @param serviceGame 
 * @returns ClientGame
 */
export function serviceToClientGame(serviceGame: GameWireFormat): ClientGame {

    return {
        gameId: serviceGame.gameId,
        players: serviceGame.players.map(entry => entry[1]),
        tiles: serviceGame.tiles.map(entry => entry[1]),
        harbors: serviceGame.harbors.map(entry => entry[1]),
        roads: serviceGame.roads.map(entry => entry[1]),
        buildings: serviceGame.buildings.map(entry => entry[1]),
        currentPlayerId: serviceGame.currentPlayerId,
        playerOrder: [...serviceGame.playerOrder],
        gameState: serviceGame.gameState,
        creatorId: serviceGame.creatorId,
        baronTile: { ...serviceGame.baronTile },
        canUndo: serviceGame.canUndo,
        shuffleCount: serviceGame.shuffleCount,
        gameIndex: serviceGame.gameIndex,
        gameType: serviceGame.gameType

    };
}
/**
 * converts the client representation of the game back to the wire format so it can be deserialized by the rust serde
 * code
 * @param clientGame 
 * @returns game in Wire Format (GameWireFormat)
 */
export function clientToServiceGame(clientGame: ClientGame): GameWireFormat {
    return {
        gameId: clientGame.gameId,
        players: clientGame.players.map(player => [player.profile.userId as string, player]),
        tiles: clientGame.tiles.map(tile => [tile.tileKey, tile]),
        harbors: clientGame.harbors.map(harbor => [harbor.harborKey, harbor]),
        roads: clientGame.roads.map(road => [road.roadKey, road]),
        buildings: clientGame.buildings.map(building => [building.buildingKey, building]),
        currentPlayerId: clientGame.currentPlayerId,
        playerOrder: [...clientGame.playerOrder],
        gameState: clientGame.gameState,
        creatorId: clientGame.creatorId,
        baronTile: clientGame.baronTile,
        canUndo: clientGame.canUndo,
        shuffleCount: clientGame.shuffleCount,
        gameIndex: clientGame.gameIndex,
        gameType: clientGame.gameType
    };
}



export function xformWireFormatToClientFormat(message: LongPollMesageWireFormat): ServiceMessage {
    for (const key in message) {
        if (Object.prototype.hasOwnProperty.call(message, key)) {
            const typedKey = key as keyof LongPollMesageWireFormat;

            if (message[typedKey] !== undefined) {
                if (typedKey === "gameUpdate") {
                    return { type: typedKey, payload: serviceToClientGame(message[typedKey]) } as ServiceMessage;
                }
                return { type: typedKey, payload: message[typedKey] } as ServiceMessage;
            }
        }
    }
    throw new Error("Invalid message format");
}

/**
 * the wire format returned by the service for long poll.  we convert this to a more TypeScript friendly form to use
 * in the rest of the applicaiton
 */
export interface LongPollMesageWireFormat {
    gameUpdate: GameWireFormat;
    invite: Invitation;
    invitationResponse: InvitationResponseData;
    gameCreated: GameCreatedData;
    playerAdded: string[];
    started: string;
    ended: string;
    error: ErrorData;
}

