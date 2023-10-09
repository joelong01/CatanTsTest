import { UserProfile } from "./shared_models";

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
    userData: UserProfile;
    roads: Road[];
    buildings: Building[];
    harbors: Harbor[];
    targets: Target[];
    resourceCount: ResourceCount;
    goodRolls: number;
    badRolls: number;
    state: CalculatedState;
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
    currentResource: TileResource;
    originalResource: TileResource;
    roll: number;
    tileKey: TileKey;
    roads: Map<Direction, Road>;
    ownedBuildings: Map<BuildingPosition, Building>;
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
//"{"harborKey":{"tileKey":{"q":-1,"r":2,"s":3},"position":"South"},"harborType":"ore"}"
export interface Harbor {
    harborKey: HarborKey; 
    harborType: HarborType;
}
export interface RoadKey {
    tileKey: TileKey;
    direction: Direction;
}
export enum RoadState {
    Unbuilt = "Unbuilt",
    Road = "Road",
    Ship = "Ship",
}

export interface Road {
    primaryKey: RoadKey;
    aliases: RoadKey[];
    adjacentRoads: Road[];
    owner: UserProfile | undefined;
    state: RoadState;
}

export interface BuildingKey {
    buildingPosition: BuildingPosition;
    tileKey: TileKey;
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

export enum CatanGames {
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

export interface StateData {
    gameState: GameState;
}

export type PlayerEntry = [string, Player];
export type HarborEntry = [HarborKey, Harbor];
export type RoadEntry = [RoadKey, Road];
export type BuildingEntry = [BuildingKey, Building];
export type TileEntry = [TileKey, Tile];

export interface RegularGame {
    gameId: string;
    players: PlayerEntry[];
    tiles: TileEntry[];
    harbors: HarborEntry[];
    roads: RoadEntry[];
    buildings: BuildingEntry[];
    currentPlayerId: string;
    playerOrder: string[];
    stateData: StateData;
    creatorId: string;
    baronTile: TileKey;
    shuffleCount: number;
}


