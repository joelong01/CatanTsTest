/* eslint-disable @typescript-eslint/no-unused-vars */
import { UserProfile } from './shared_models';

export enum Weapon {
    Knight = "Knight",
    RolledSeven = "RolledSeven",
    PirateShip = "PirateShip",
}

export interface Target {
    weapon: Weapon;
    target: string; // the user ID of the target
}
export interface ResourceCount {
    acquired: number;
    lost: number;
}


export interface WonResources {
    sheep: number;
    wood: number;
    wheat: number;
    ore: number;
    brick: number;
    gold: number;
}

export interface CalculatedState {
    knightsPlayed: number;
    longestRoad: number;
    totalResources: number;
    wonResources: WonResources;
    hasLongestRoad: boolean;
    hasLargestArmy: boolean;
    cityCount: number;
    settlementCount: number;
    roadCount: number;
    shipCount: number;
    knownScore: number;
    timesTargeted: number;
    pipCount: number;
    isCurrentPlayer: boolean;
    maxNoResourcesRun: number;
}


export interface Player {
    profile: UserProfile;
    roads: Road[];
    buildings: Building[];
    harbors: Harbor[];
    targets: Target[];
    resourceCount: ResourceCount;
    goodRolls: number;
    badRolls: number;
    state: CalculatedState;
}

export function isEqualPlayer(a: Player | undefined, b: Player | undefined): boolean {
    return a?.profile.userId === b?.profile.userId;
}

export enum TileResource {
    Back = "back.png",
    Brick = "brick.png",
    Desert = "desert.png",
    GoldMine = "goldMine",
    Ore = "ore",
    Sheep = "sheep",
    Wheat = "wheat",
    Wood = "wood",

}
export enum TileOrientation {
    FaceUp = 'FaceUp',
    FaceDown = 'FaceDown',
}

export interface TileKey {
    q: number;
    r: number;
    s: number;
}

export enum Direction {
    North = 'North',
    NorthEast = 'NorthEast',
    SouthEast = 'SouthEast',
    South = 'South',
    SouthWest = 'SouthWest',
    NorthWest = 'NorthWest',
}

export enum BuildingPosition {
    Right = "Right",
    BottomRight = "BottomRight",
    BottomLeft = "BottomLeft",
    Left = "Left",
    TopLeft = "TopLeft",
    TopRight = "TopRight",
}

export interface Tile {
    tileKey: TileKey;
    currentResource: TileResource;
    originalResource: TileResource;
    roll: number;
    roads: Map<Direction, Road>;
    ownedBuildings: Map<BuildingPosition, Building>;
}

export function isEqualTileKey(a: TileKey, b: TileKey): boolean {
    return a.q === b.q && a.r === b.r && a.s === b.s;
}

export function isEqualTile(a: Tile, b: Tile | undefined): boolean {
    if (b === undefined) {
        return false;
    }
    return (a.currentResource == b.currentResource && a.originalResource == b.originalResource
        && a.roll == b.roll && isEqualTileKey(a.tileKey, b.tileKey));

}

export function findTile(tileKey: TileKey, tiles: Tile[]): Tile | undefined {
    return tiles.find(t => isEqualTileKey(t.tileKey, tileKey));
}

export function findRoad(roadKey: RoadKey, roads: Road[]): Road | undefined {
    return roads.find(t => isEqualRoadKey(roadKey, roadKey));
}


export enum HarborType {
    Wheat = "wheat",
    Wood = "wood",
    Ore = "ore",
    Sheep = "sheep",
    Brick = "brick",
    ThreeForOne = "threeForOne",
}
export interface HarborKey {
    tileKey: TileKey;
    position: Direction;
}

export function isEqualHarborKey(key1: HarborKey, key2: HarborKey): boolean {
    return isEqualTileKey(key1.tileKey, key2.tileKey) && key1.position === key2.position;
}
//"{"harborKey":{"tileKey":{"q":-1,"r":2,"s":3},"position":"South"},"harborType":"ore"}"
export interface Harbor {
    harborKey: HarborKey;
    harborType: HarborType;
}
export function isEqualHarbor(a: Harbor, b: Harbor) {
    return isEqualHarborKey(a.harborKey, b.harborKey) && a.harborType === b.harborType;
}
export interface RoadKey {
    tileKey: TileKey;
    direction: Direction;
}

export function isEqualRoadKey(a: RoadKey, b: RoadKey): boolean {
    return isEqualTileKey(a.tileKey, b.tileKey) && a.direction === b.direction;
}

export enum RoadState {
    Unbuilt = "Unbuilt",
    Road = "Road",
    Ship = "Ship",
}

export interface Road {
    roadKey: RoadKey;
    aliases: RoadKey[];
    adjacentRoads: Road[];
    owner: UserProfile | undefined;
    state: RoadState;
}

export function isEqualRoad(r1: Road | undefined, r2: Road | undefined): boolean {
    if (r1 === undefined || r2 === undefined) return false;

    if (!isEqualRoadKey(r1.roadKey, r2.roadKey)) return false;

    if (r1.aliases.length !== r2.aliases.length) return false;

    // all road 1 aliases must be in road 2
    for (const key of r1.aliases) {
        const found = r2.aliases.find((k) => k === key);
        if (!found) return false;
    }

    //adjacent roads must be the same
    if (r1.adjacentRoads.length != r2.adjacentRoads.length) return false;

    //
    //  make sure keys match
    for (const road of r1.adjacentRoads) {
        const found = r2.adjacentRoads.find((r) => r.roadKey === road.roadKey);
        if (!found) return false;
    }

    if (r1.state !== r2.state) return false;

    if (r1.owner !== null && r1.owner !== undefined) {
        if (r2.owner !== null && r2.owner !== undefined) {
            if (r1.owner.userId !== r2.owner.userId) return false;
        }

    }

    return true;
}


export interface BuildingKey {
    buildingPosition: BuildingPosition;
    tileKey: TileKey;
}

export function isEqualBuildingKey(k1: BuildingKey, k2: BuildingKey): boolean {
    return k1.buildingPosition === k2.buildingPosition && isEqualTileKey(k1.tileKey, k2.tileKey);
}

export enum BuildingState {
    Empty = "Empty",
    Settlement = "Settlement",
    City = "City",
    Pips = "Pips"
}

export enum GameAction {
    AddPlayer = "AddPlayer",
    NewBoard = "NewBoard",
    SetOrder = "SetOrder",
    Start = "Start",
    Buy = "Buy",
    Build = "Build",
    Roll = "Roll",
    MoveBaron = "MoveBaron",
    Trade = "Trade",
    Next = "Next",
    Undo = "Undo",
    Redo = "Redo",
}

export enum CatanGameType {
    Regular = "Regular",
    Expansion = "Expansion",
    Seafarers = "Seafarers",
    Seafarers4Player = "Seafarers4Player",
}

export interface Building {
    buildingKey: BuildingKey;
    connectedTiles: TileKey[];
    aliases: BuildingKey[];
    pipCount: number;
    ownerId?: string;
    state: BuildingState;
}

export function isEqualBuilding(b1: Building, b2: Building | undefined): boolean{
    if (b2 === undefined) return false;
    if (b1.buildingKey !== b2.buildingKey) return false;
    if (b1.connectedTiles.length !== b2.connectedTiles.length) return false;
    if (b1.aliases.length !== b2.aliases.length) return false;
    if (b1.pipCount !== b2.pipCount) return false;
    if (b1.state !== b2.state) return false;

    for (const tileKey of b1.connectedTiles){
        const found = b2.connectedTiles.find( (key) => isEqualTileKey(key, tileKey));
        if (!found) return false;
    }
    for (const buildingKey of b1.aliases) {
        const found = b2.aliases.find((key) => isEqualBuildingKey(key, buildingKey));
        if (!found) return false;
    }

    if (b1.ownerId !== null && b1.ownerId !== undefined) {
        if (b2.ownerId !== null && b2.ownerId !== undefined) {
            if (b1.ownerId !== b2.ownerId) return false;
        }

    }
    return true;
}
export enum GameState {
    AddingPlayers = 'AddingPlayers',
    ChoosingBoard = 'ChoosingBoard',
    SettingPlayerOrder = 'SettingPlayerOrder',
    AllocateResourceForward = 'AllocateResourceForward',
    AllocateResourceReverse = 'AllocateResourceReverse',
    WaitingForRoll = 'WaitingForRoll',
    MustMoveBaron = 'MustMoveBaron',
    BuyingAndTrading = 'BuyingAndTrading',
    Supplemental = 'Supplemental',
}





export interface ClientGame {
    gameId: string;
    players: Player[];
    tiles: Tile[];
    harbors: Harbor[];
    roads: Road[];
    buildings: Building[];
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



export function logGames(game1: ClientGame, game2: ClientGame) {
    for (let i=0; i<game1.tiles.length; i++){
        console.log(`key: %o %o\nresource: %s %s\nroll: %s %s`,
            game1.tiles[i].tileKey, game2.tiles[i].tileKey,
            game1.tiles[i].currentResource, game2.tiles[i].currentResource,
            game1.tiles[i].roll, game2.tiles[i].roll);

    }
}


