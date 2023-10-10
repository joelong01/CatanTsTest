import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import {
    TestCallContext, GameHeader, ServiceError, UserProfile, GameError, CatanMessage, Invitation,
    InvitationResponseData, LoginHeaderData, ProfileStorage
} from './Models/shared_models';
import { CatanGameType, GameAction, ClientGame, serviceToClientGame, ServiceGame } from './Models/game_models';
import { Err, Ok, Result, err } from './Models/result'
import https from 'https';



export class CatanServiceProxy {

    hostName: string;
    authToken?: string;

    constructor(hostName: string, authToken?: string) {
        this.hostName = hostName;
        this.authToken = authToken;
    }

    public setAuthToken(token: string | undefined) {
        this.authToken = token;
    }

    public getAuthToken(): string | undefined {
        return this.authToken;
    }


    private async sendRequest<B, R>(
        method: 'GET' | 'POST' | 'PUT' | 'DELETE',
        url: string,
        headers?: Record<string, string>,
        body?: B
    ): Promise<Result<R, ServiceError>> {
        const requestUrl = this.hostName + url;
        console.log(`${method}:${url}`);
        const allHeaders: Record<string, string> = {
            ...headers,
        };

        if (method === 'POST' || method === 'PUT') {
            allHeaders['Content-Type'] = 'application/json';
        }

        if (this.authToken) {
            allHeaders['Authorization'] = `Bearer ${this.authToken}`;
        }
        const httpsAgent = new https.Agent({ rejectUnauthorized: false });
 
        const requestConfig: AxiosRequestConfig = {
            method,
            url: requestUrl,
            headers: allHeaders,
            data: body,
            httpsAgent: httpsAgent
        };
        let status: number = 0;
        try {
            const response: AxiosResponse = await axios(requestConfig);
            status = response.status;
            if (response.status >= 200 && response.status < 300) {

                return new Ok(response.data as R);
            } else {
                // Here, we are assuming that the server returned a ServiceError object in its body
                const serviceError = response.data as ServiceError;
                return err(new ServiceError(
                    serviceError.Message,
                    serviceError.Status,
                    serviceError.ResponseType,
                    serviceError.GameError)
                );
            }
        } catch (error) {
            console.log("Pxoxy Error! %o", error);
            if (error instanceof AxiosError) {
                if (error.response) {
                    status = error.response.status;
                    // Here, we assume the server returned a ServiceError object as the error response
                    const serviceError = error.response.data as ServiceError;
                    return new Err(serviceError);
                } else {
                    status = 500;
                    // If there's no response, it means the request never reached the server or the server didn't reply
                    return new Err(new ServiceError(
                        error.message,
                        status,
                        { errorInfo: 'Network or Axios error' },
                        {} as GameError
                    ));
                }
            } else {
                status = 500;
                return new Err(new ServiceError(
                    `Unexpected error: ${error}`,  // Providing as much context as you can
                    500,                                   // Default to 500 - internal server error
                    { azError: 'Unknown error' },          // Indicate it's an unknown error
                    {} as GameError
                ));
            }
        } finally {
            console.log(`status: ${status}`);
        }
    }

    private post<B, R>(
        url: string,
        headers?: Record<string, string>,
        body?: B
    ): Promise<Result<R, ServiceError>> {
        return this.sendRequest('POST', url, headers, body);
    }

    private get<R>(
        url: string,
        headers?: Record<string, string>
    ): Promise<Result<R, ServiceError>> {
        return this.sendRequest('GET', url, headers);
    }

    private put<B, R>(
        url: string,
        headers?: Record<string, string>,
        body?: B
    ): Promise<Result<R, ServiceError>> {
        return this.sendRequest('PUT', url, headers, body);
    }

    private delete<R>(
        url: string,
        headers?: Record<string, string>
    ): Promise<Result<R, ServiceError>> {
        return this.sendRequest('DELETE', url, headers);
    }

    register(profile: UserProfile, password: string): Promise<Result<UserProfile, ServiceError>> {
        const headers: Record<string, string> = {
            [GameHeader.PASSWORD]: password,
        };

        const url = '/api/v1/users/register';
        return this.post<UserProfile, UserProfile>(url, headers, profile);
    }

    login(username: string, password: string, profileLocation: ProfileStorage): Promise<Result<string, ServiceError>> {
        const loginHeaderData = new LoginHeaderData(username, password, profileLocation);
        const headers: Record<string, string> = {
            [GameHeader.LOGIN_DATA]: JSON.stringify(loginHeaderData)
        };

        const url = '/api/v1/users/login';
        return this.post<null, string>(url, headers);
    }
    registerTestUser(profile: UserProfile, password: string): Promise<Result<UserProfile, ServiceError>> {
        const headers: Record<string, string> = {
            [GameHeader.PASSWORD]: password,
        };

        const url = "/auth/api/v1/users/register-test-user";
        return this.post<UserProfile, UserProfile>(url, headers, profile);
    }

    setup(): Promise<Result<void, ServiceError>> {
        const url = "/api/v1/test/verify-service";
        return this.post<void, void>(url);
    }

    getProfile(id: string): Promise<Result<UserProfile, ServiceError>> {
        return this.get<UserProfile>(`/auth/api/v1/profile/${id}`);
    }

    async newGame(gameType: CatanGameType, game?: ClientGame): Promise<Result<ClientGame, ServiceError>> {
        const url = `/auth/api/v1/games/${gameType}`;
        let headers: Record<string, string> | undefined;

        if (game) {
            const testCallContext = new TestCallContext(undefined, game);
            const json = JSON.stringify(testCallContext) as string;
            headers = { [GameHeader.TEST]: json };
        }
        const result: Result<ServiceGame, ServiceError> = await this.post<void, ServiceGame>(url, headers);
        return transformGameResult(result);

    }

    async reloadGame(gameId: string): Promise<Result<ClientGame, ServiceError>> {
        const url = `/auth/api/v1/games/reload/${gameId}`;

        const result = await this.post<void, ServiceGame>(url);
        return transformGameResult(result);
    }

    async shuffleBoard(gameId: string, game: ClientGame | undefined): Promise<Result<ClientGame, ServiceError>> {
        const url = `/auth/api/v1/games/shuffle/${gameId}`;
        let headers: Record<string, string> | undefined;

        if (game !== undefined) {
            const testCallContext = new TestCallContext(undefined, game);
            const json = JSON.stringify(testCallContext) as string;
            headers = { [GameHeader.TEST]: json };
        }
        const result = await this.post<void, ServiceGame>(url, headers);
        return transformGameResult(result);
    }

    getLobby(): Promise<Result<UserProfile[], ServiceError>> {
        return this.get<UserProfile[]>("/auth/api/v1/lobby");
    }

    getActions(gameId: string): Promise<Result<GameAction[], ServiceError>> {
        const url = `/auth/api/v1/action/actions/${gameId}`;
        return this.get<GameAction[]>(url);
    }

    async longPoll(): Promise<Result<CatanMessage, ServiceError>> {
        const url = "/auth/api/v1/longpoll";
        return this.get<CatanMessage>(url);
    }

    sendInvite(invite: Invitation): Promise<Result<void, ServiceError>> {
        const url = "/auth/api/v1/lobby/invite";
        return this.post<Invitation, void>(url, undefined, invite);
    }

    invitationResponse(inviteResponse: InvitationResponseData): Promise<Result<void, ServiceError>> {
        const url = "/auth/api/v1/lobby/acceptinvite";
        return this.post<InvitationResponseData, void>(url, undefined, inviteResponse);
    }


    startGame(gameId: string): Promise<Result<void, ServiceError>> {
        const url = `/auth/api/v1/action/start/${gameId}`;
        return this.post<void, void>(url);
    }
    next(gameId: string): Promise<Result<GameAction[], ServiceError>> {
        const url = `/auth/api/v1/action/next/${gameId}`;
        return this.post<void, GameAction[]>(url);
    }

    rotateLoginKeys(gameId: string): Promise<Result<void, ServiceError>> {
        const url = `/auth/api/v1/action/start/${gameId}`;
        return this.post<void, void>(url);
    }

    getAllUsers(): Promise<Result<UserProfile[], ServiceError>> {
        const url = "/auth/api/v1/users";
        return this.get<UserProfile[]>(url);
    }

    deleteUser(userId: string): Promise<Result<void, ServiceError>> {
        const url = `/auth/api/v1/users/${userId}`;
        return this.delete<void>(url);
    }

    updateProfile(newProfile: UserProfile): Promise<Result<void, ServiceError>> {
        const url = "/auth/api/v1/users";
        return this.put<UserProfile, void>(url, undefined, newProfile);
    }

    sendPhoneCode(code: number | undefined): Promise<Result<void, ServiceError>> {
        const url = "/auth/api/v1/users/phone/send-code";
        let headers: Record<string, string> | undefined;

        if (code) {
            const testCallContext = new TestCallContext(code, undefined);
            const json = JSON.stringify(testCallContext) as string;
            headers = { [GameHeader.TEST]: json };
        }
        return this.post<void, void>(url, headers);
    }

    validatePhoneCode(code: number): Promise<Result<void, ServiceError>> {
        const url = `/auth/api/v1/users/phone/validate/${code}`;
        return this.post<void, void>(url);
    }

    sendValidationEmail(): Promise<Result<string, ServiceError>> {
        const url = "/auth/api/v1/users/email/send-validation-email";
        return this.post<void, string>(url);
    }

    validateEmail(token: string): Promise<Result<string, ServiceError>> {
        const url = `/api/v1/users/validate-email/${token}`;
        return this.get<string>(url);
    }

    createLocalUser(newProfile: UserProfile): Promise<Result<void, ServiceError>> {
        const url = "/auth/api/v1/users/local";
        return this.post<UserProfile, void>(url, undefined, newProfile);
    }

    updateLocalUser(newProfile: UserProfile): Promise<Result<void, ServiceError>> {
        const url = "/auth/api/v1/users/local";
        return this.put<UserProfile, void>(url, undefined, newProfile);
    }

    deleteLocalUser(id: string): Promise<Result<void, ServiceError>> {
        const url = `/auth/api/v1/users/local/${id}`;
        return this.delete<void>(url);
    }

    getLocalUsers(id: string): Promise<Result<UserProfile[], ServiceError>> {
        const url = `/auth/api/v1/users/local/${id}`;
        return this.get<UserProfile[]>(url);
    }
    getVersion(): Promise<Result<string, ServiceError>> {
        const url = `/api/v1/version`;
        return this.get<string>(url);
    }

    addLocalUserToLobby(localUserId: string, gameId: string): Promise<Result<void, ServiceError>> {
        const url = `/auth/api/v1/lobby/add-local-user/${localUserId}`;
        const headers: Record<string, string> = {
            [GameHeader.GAME_ID]: gameId,
        };

        return this.post<void, void>(url, headers);

    }

    joinLobby(): Promise<Result<void, ServiceError>> {
        const url = `/auth/api/v1/lobby/join`;

        return this.post<void, void>(url);
    }
    leaveLobby(): Promise<Result<void, ServiceError>> {
        const url = `/auth/api/v1/lobby/leave`;

        return this.post(url);
    }
}

function transformGameResult(result: Result<ServiceGame, ServiceError>): Result<ClientGame, ServiceError> {
    if (result.isOk()) {
        return new Ok(serviceToClientGame(result.getValue()));
    } else {
        const error = result.getError();
        if (!error) {
            return new Err(new ServiceError(
                `undefined error`,
                500,
                { azError: 'Unknown error' },
                {} as GameError
            ));
        }
        return new Err(error);
    }
}

export default CatanServiceProxy;
