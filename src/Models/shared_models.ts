import { ClientGame } from "./game_models";
import { GameWireFormat, clientToServiceGame } from "./wire_formats";


export interface ResponseType {

    errorInfo?: string;
    todo?: string;
    noData?: null;
    sendMessageError?: [string, GameError][];
    serviceMessage?: ServiceMessage;
    azError?: string;
    jsonError?: string;
    containerError?: string;
}

export class ServiceError {
    constructor(
        public Message: string,
        public Status: number,
        public ResponseType: ResponseType,
        public GameError: GameError
    ) { }
}

export class TestCallContext {
    phoneCode?: number | null;
    game?: GameWireFormat | null;

    constructor(phoneCode?: number | null, game?: ClientGame | null) {

        this.phoneCode = phoneCode ?? null;
        if (game != null) {
            this.game = clientToServiceGame(game)
        } else {
            this.game = null;
        }

    }
}

/**
 * GameError enum
 */
export enum GameError {
    MissingData = "MissingData",
    BadActionData = "BadActionData",
    BadId = "BadId",
    ChannelError = "ChannelError",
    AlreadyExists = "AlreadyExists",
    ActionError = "ActionError",
    TooFewPlayers = "TooFewPlayers",
    TooManyPlayers = "TooManyPlayers",
    ReqwestError = "ReqwestError",
    NoError = "NoError",
    HttpError = "HttpError",
    AzError = "AzError",
    JsonError = "JsonError",
    AzureCoreError = "AzureCoreError",
    ContainerError = "ContainerError",
    UnsupportedGame = "UnsupportedGame"
}

/**
 * UserType enum
 */
export enum UserType {
    Connected = "Connected",
    Local = "Local",
}

/**
 * PersonalInformation type
 */
export interface PersonalInformation {
    phoneNumber: string;
    email: string;
    firstName: string;
    lastName: string;
}

/**
 * UserProfile type
 */
export interface UserProfile {
    userId?: string;
    userType: UserType;
    pii?: PersonalInformation | null;
    displayName: string;
    pictureUrl: string;
    foregroundColor: string;
    backgroundColor: string;
    textColor: string;
    gamesPlayed?: number | null;
    gamesWon?: number | null;
    validatedEmail: boolean;
    validatedPhone: boolean;
}


export interface Invitation {
    fromId: string;
    toId: string;
    fromName: string;
    toName: string;
    message: string;
    fromPicture: string;
    gameId: string;
}


export const GameHeader = {
    GAME_ID: "x-game-id",
    USER_ID: "x-user-id",
    PASSWORD: "x-password",
    TEST: "x-test",
    EMAIL: "x-email",
    ROLES: "x-roles",
    CLAIMS: "x-claims",
    PROFILE_LOCATION: "x-profile-location",
    LOGIN_DATA: "x-login-data"
};




export interface InvitationResponseData {
    fromId: string;
    toId: string;
    fromName: string;
    toName: string;
    gameId: string;
    accepted: boolean;
}

export interface GameCreatedData {
    userId: string;
    gameId: string;
}

export interface ErrorData {
    statusCode: number;
    message: string;
}



export type ServiceMessage =
    | { type: 'gameUpdate', payload: ClientGame }
    | { type: 'invite', payload: Invitation }
    | { type: 'invitationResponse', payload: InvitationResponseData }
    | { type: 'gameCreated', payload: GameCreatedData }
    | { type: 'playerAdded', payload: string[] }  
    | { type: 'started', payload: string }  
    | { type: 'ended', payload: string }  
    | { type: 'error', payload: ErrorData }



export function isMessageType<T extends ServiceMessage['type']>(
    message: ServiceMessage,
    type: T
): message is Extract<ServiceMessage, { type: T }> {
    return message.type === type;
}



export enum GameStatus {
    PlayingGame = "PlayingGame",
    Available = "Available",
    Hidden = "Hidden"
}

export enum ProfileStorage {
    CosmosDb = "CosmosDb",
    CosmosDbTest = "CosmosDbTest",
    MockDb = "MockDb"
}

export class LoginHeaderData {
    profileLocation: ProfileStorage;
    userName: string;
    password: string;

    constructor(userName: string, password: string, profileLocation: ProfileStorage) {
        this.userName = userName;
        this.password = password;
        this.profileLocation = profileLocation;
    }

    static testDefault(userName: string, password: string): LoginHeaderData {
        return new LoginHeaderData(userName, password, ProfileStorage.CosmosDbTest);
    }
}
