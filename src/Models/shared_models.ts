
import { CatanGames, GameAction, RegularGame } from './game_models';


export interface ResponseType {

    ErrorInfo?: string;
    Todo?: string;
    NoData?: null;
    SendMessageError?: [string, GameError][];
    ServiceMessage?: CatanMessage;
    AzError?: string;
    JsonError?: string;
    ContainerError?: string;
}

export class ServiceError {
    constructor(
        public Message: string,
        public Status: number,
        public ResponseType: ResponseType,
        public GameError: GameError
    ) { }
}

export class ServiceResponse {
    Message: string;
    Status: number;
    ResponseType: ResponseTypeOld;
    GameError: GameError;

    constructor(data: Partial<ServiceResponse>) {
        if (typeof data.Message !== 'string' || typeof data.Status !== 'number') {
            throw new Error('Invalid data format');
        }
        this.Message = data.Message as string;
        this.Status = data.Status as number;
        this.ResponseType = data.ResponseType as ResponseTypeOld;
        this.GameError = data.GameError as GameError;
    }

    getToken(): string {

        if (this.ResponseType.Token) {
            return this.ResponseType.Token as string;
        }
        throw new Error("Not a token!");
    }

    getProfile(): UserProfile {
        if (this.ResponseType.Profile) {
            return this.ResponseType.Profile as UserProfile;
        }
        throw new Error("Not a profile!");
    }

    getProfiles(): UserProfile[] {
        if (this.ResponseType.Profiles) {
            return this.ResponseType.Profiles as UserProfile[];
        }
        throw new Error("Not a profile!");
    }

    getMessage(): CatanMessage {
        if (this.ResponseType.ServiceMessage) {
            return this.ResponseType.ServiceMessage;
        }

        throw new Error("Not a Message!");
    }

    getActions(): GameAction[] {
        if (this.ResponseType.ValidActions) {
            return this.ResponseType.ValidActions;
        }
        throw new Error("not a ValidActions message!")
    }


    isSuccess(): boolean {
        return this.Status >= 200 && this.Status <= 300;
    }
}


export class TestContext {
    UseCosmosDb: boolean;
    PhoneCode?: number | null;
    Game?: RegularGame | null;

    constructor(useCosmosDb: boolean, phoneCode?: number | null, game?: RegularGame | null) {
        this.UseCosmosDb = useCosmosDb;
        this.PhoneCode = phoneCode ?? null;
        this.Game = game ?? null;
    }

    static asJson(useCosmos: boolean): string {
        const tc = new TestContext(useCosmos);
        return JSON.stringify(tc);
    }

    setPhoneCode(code: number | null): void {
        this.PhoneCode = code;
    }
    setGame(game: RegularGame | null): void {
        this.Game = game;
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
    SerdeError = "SerdeError",
    AzureCoreError = "AzureCoreError",
    ContainerError = "ContainerError"
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
    PhoneNumber: string;
    Email: string;
    FirstName: string;
    LastName: string;
}

/**
 * UserProfile type
 */
export interface UserProfile {
    UserId?: string;
    UserType: UserType;
    Pii?: PersonalInformation | null;
    DisplayName: string;
    PictureUrl: string;
    ForegroundColor: string;
    BackgroundColor: string;
    TextColor: string;
    GamesPlayed?: number | null;
    GamesWon?: number | null;
    ValidatedEmail: boolean;
    ValidatedPhone: boolean;
}

/**
 * ResponseType enum - only one of these should be set per response type
 */
export interface ResponseTypeOld {
    Token?: string;
    Profile?: UserProfile;
    Profiles?: UserProfile[];
    Url?: string;
    ErrorInfo?: string;
    Todo?: string;
    NoData?: null;
    ValidActions?: GameAction[];
    Game?: RegularGame;
    SupportedGames?: CatanGames[];
    SendMessageError?: [string, GameError][];
    ServiceMessage?: CatanMessage;
    AzError?: string;
    JsonError?: string;
    ContainerError?: string;
}




export interface Invitation {
    FromId: string;
    ToId: string;
    FromName: string;
    ToName: string;
    Message: string;
    FromPicture: string;
    GameId: string;
}

export const GameHeader = {
    GAME_ID: "x-game-id",
    USER_ID: "x-user-id",
    PASSWORD: "x-password",
    TEST: "x-test",
    EMAIL: "x-email",
    ROLES: "x-roles",
    CLAIMS: "x-claims",
};




export interface InvitationResponseData {
    FromId: string;
    ToId: string;
    FromName: string;
    ToName: string;
    GameId: string;
    Accepted: boolean;
}

export interface GameCreatedData {
    UserId: string;
    GameId: string;
}

export interface ErrorData {
    StatusCode: number;
    Message: string;
}

export interface CatanMessageMap {
    GameUpdate: RegularGame;
    Invite: Invitation;
    InvitationResponse: InvitationResponseData;
    GameCreated: GameCreatedData;
    PlayerAdded: string[];
    Started: string;
    Ended: string;
    Error: ErrorData;
}

export type CatanMessage = {
    [K in keyof CatanMessageMap]?: CatanMessageMap[K];
};

export function isCatanMessage(obj: any): CatanMessage | null {
    if (obj && (obj.GameUpdate || obj.Invite || obj.InvitationResponse || obj.GameCreated ||
        obj.PlayerAdded || obj.Started || obj.Ended || obj.Error)) {
        return obj;
    }
    return null;
}


export enum GameStatus {
    PlayingGame = "PlayingGame",
    Available = "Available",
    Hidden = "Hidden"
}
