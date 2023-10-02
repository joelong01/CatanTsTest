import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { TestContext, GameHeader, ResponseTypeOld, ServiceError, UserProfile, GameError, CatanMessage, Invitation, InvitationResponseData } from './Models/shared_models';
import { CatanGames, GameAction, RegularGame } from './Models/game_models';

export class ProxyHelper {
    public static handleResponse<T>(response: T | ServiceError): T {
        if (response instanceof ServiceError) {
            console.log("ERROR: {%o}", response);
            throw new Error(`panic: ${response}`);
        }

        return response as T;
    }
}

export class CatanServiceProxy {

    hostName: string;
    testContext?: TestContext;
    authToken?: string;

    constructor(hostName: string, testContext?: TestContext, authToken?: string) {
        this.hostName = hostName;
        this.testContext = testContext;
        this.authToken = authToken;
    }

    public setAuthToken(token: string | undefined) {
        this.authToken = token;
    }

    public getAuthToken(): string | undefined {
        return this.authToken;
    }



    public useCosmos(): boolean | undefined {
        return this.testContext?.UseCosmosDb;
    }

    public setTestContext(testContext: TestContext | undefined) {
        this.testContext = testContext;
    }
    private async sendRequest<B, R>(
        method: 'GET' | 'POST' | 'PUT' | 'DELETE',
        url: string,
        headers?: Record<string, string>,
        body?: B
    ): Promise<R | ServiceError> {
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

        if (this. testContext) {
            allHeaders[GameHeader.TEST] = JSON.stringify(this.testContext);
        }

        const requestConfig: AxiosRequestConfig = {
            method,
            url: requestUrl,
            headers: allHeaders,
            data: body,
            httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false })
        };
        let status: number = 0;
        try {
            const response: AxiosResponse = await axios(requestConfig);
            status = response.status;
            if (response.status >= 200 && response.status < 300) {

                return response.data as R;
            } else {
                // Here, we are assuming that the server returned a ServiceError object in its body
                const serviceError = response.data as ServiceError;
                return new ServiceError(
                    serviceError.Message,
                    serviceError.Status,
                    serviceError.ResponseType,
                    serviceError.GameError
                );
            }
        } catch (error) {

            if (error instanceof AxiosError) {
                if (error.response) {
                    status = error.response.status;
                    // Here, we assume the server returned a ServiceError object as the error response
                    const serviceError = error.response.data as ServiceError;
                    return new ServiceError(
                        serviceError.Message,
                        serviceError.Status,
                        serviceError.ResponseType,
                        serviceError.GameError
                    );
                } else {
                    status = 500;
                    // If there's no response, it means the request never reached the server or the server didn't reply
                    return new ServiceError(
                        error.message,
                        status,
                        { ErrorInfo: 'Network or Axios error' },
                        {} as GameError
                    );
                }
            } else {
                status = 500;
                return new ServiceError(
                    `Unexpected error: ${error}`,  // Providing as much context as you can
                    500,                                   // Default to 500 - internal server error
                    { AzError: 'Unknown error' },          // Indicate it's an unknown error
                    {} as GameError
                );
            }
        } finally {
            console.log(`status: ${status}`);
        }
    }

    private post<B, R>(
        url: string,
        headers?: Record<string, string>,
        body?: B
    ): Promise<R | ServiceError> {
        return this.sendRequest('POST', url, headers, body);
    }

    private get<R>(
        url: string,
        headers?: Record<string, string>
    ): Promise<R | ServiceError> {
        return this.sendRequest('GET', url, headers);
    }

    private put<B, R>(
        url: string,
        headers?: Record<string, string>,
        body?: B
    ): Promise<R | ServiceError> {
        return this.sendRequest('PUT', url, headers, body);
    }

    private delete<R>(
        url: string,
        headers?: Record<string, string>
    ): Promise<R | ServiceError> {
        return this.sendRequest('DELETE', url, headers);
    }

    register(profile: UserProfile, password: string): Promise<UserProfile | ServiceError> {
        const headers: Record<string, string> = {
            [GameHeader.PASSWORD]: password,
        };

        const url = '/api/v1/users/register';
        return this.post<UserProfile, UserProfile>(url, headers, profile);
    }

    login(username: string, password: string): Promise<string | ServiceError> {
        const headers: Record<string, string> = {
            [GameHeader.PASSWORD]: password,
            [GameHeader.EMAIL]: username,
        };

        const url = '/api/v1/users/login';
        return this.post<null, string>(url, headers);
    }
    registerTestUser(profile: UserProfile, password: string): Promise<UserProfile | ServiceError> {
        const headers: Record<string, string> = {
            [GameHeader.PASSWORD]: password,
        };

        const url = "/auth/api/v1/users/register-test-user";
        return this.post<UserProfile, UserProfile>(url, headers, profile);
    }

    setup(): Promise<void | ServiceError> {
        const url = "/api/v1/test/verify-service";
        return this.post<void, void>(url);
    }

    getProfile(id: string): Promise<UserProfile | ServiceError> {
        return this.get<UserProfile>(`/auth/api/v1/profile/${id}`);
    }

    newGame(gameType: CatanGames, game?: RegularGame): Promise<RegularGame | ServiceError> {
        const url = `/auth/api/v1/games/${gameType}`;
        if (game) {
            return this.post(url, undefined, game);
        }
        return this.post<void, RegularGame>(url);
    }

    newBoard(gameId: string): Promise<RegularGame | ServiceError> {
        const url = `/auth/api/v1/games/shuffle/${gameId}`;
        return this.post<void, RegularGame>(url);
    }

    getLobby(): Promise<UserProfile[] | ServiceError> {
        return this.get<UserProfile[]>("/auth/api/v1/lobby");
    }

    getActions(gameId: string): Promise<GameAction[] | ServiceError> {
        const url = `/auth/api/v1/action/actions/${gameId}`;
        return this.get<GameAction[]>(url);
    }

    longPoll(): Promise<CatanMessage | ServiceError> {
        const url = "/auth/api/v1/longpoll";
        return this.get<CatanMessage>(url);
    }

    sendInvite(invite: Invitation): Promise<void | ServiceError> {
        const url = "/auth/api/v1/lobby/invite";
        return this.post<Invitation, void>(url, undefined, invite);
    }

    invitationResponse(inviteResponse: InvitationResponseData): Promise<void | ServiceError> {
        const url = "/auth/api/v1/lobby/acceptinvite";
        return this.post<InvitationResponseData, void>(url, undefined, inviteResponse);
    }


    startGame(gameId: string): Promise<void | ServiceError> {
        const url = `/auth/api/v1/action/start/${gameId}`;
        return this.post<void, void>(url);
    }
    next(gameId: string): Promise<GameAction[] | ServiceError> {
        const url = `/auth/api/v1/action/next/${gameId}`;
        return this.post<void, GameAction[]>(url);
    }

    rotateLoginKeys(gameId: string): Promise<void | ServiceError> {
        const url = `/auth/api/v1/action/start/${gameId}`;
        return this.post<void, void>(url);
    }

    getAllUsers(): Promise<UserProfile[] | ServiceError> {
        const url = "/auth/api/v1/users";
        return this.get<UserProfile[]>(url);
    }

    deleteUser(userId: string): Promise<void | ServiceError> {
        const url = `/auth/api/v1/users/${userId}`;
        return this.delete<void>(url);
    }

    updateProfile(newProfile: UserProfile): Promise<void | ServiceError> {
        const url = "/auth/api/v1/users";
        return this.put<UserProfile, void>(url, undefined, newProfile);
    }

    sendPhoneCode(): Promise<void | ServiceError> {
        const url = "/auth/api/v1/users/phone/send-code";
        return this.post<void, void>(url);
    }

    validatePhoneCode(code: number): Promise<void | ServiceError> {
        const url = `/auth/api/v1/users/phone/validate/${code}`;
        return this.post<void, void>(url);
    }

    sendValidationEmail(): Promise<string | ServiceError> {
        const url = "/auth/api/v1/users/email/send-validation-email";
        return this.post<void, string>(url);
    }

    validateEmail(token: string): Promise<string | ServiceError> {
        const url = `/api/v1/users/validate-email/${token}`;
        return this.get<string>(url);
    }

    createLocalUser(newProfile: UserProfile): Promise<void | ServiceError> {
        const url = "/auth/api/v1/users/local";
        return this.post<UserProfile, void>(url, undefined, newProfile);
    }

    updateLocalUser(newProfile: UserProfile): Promise<void | ServiceError> {
        const url = "/auth/api/v1/users/local";
        return this.put<UserProfile, void>(url, undefined, newProfile);
    }

    deleteLocalUser(id: string): Promise<void | ServiceError> {
        const url = `/auth/api/v1/users/local/${id}`;
        return this.delete<void>(url);
    }

    getLocalUsers(id: string): Promise<UserProfile[] | ServiceError> {
        const url = `/auth/api/v1/users/local/${id}`;
        return this.get<UserProfile[]>(url);
    }
    getVersion(): Promise<string | ServiceError> {
        const url = `/api/v1/version`;
        return this.get<string>(url);
    }

    addLocalUserToLobby(localUserId: string, gameId: string): Promise<void | ServiceError> {
        const url = `/auth/api/v1/lobby/add-local-user/${localUserId}`;
        const headers: Record<string, string> = {
            [GameHeader.GAME_ID]: gameId,
        };

        return this.post<void, void>(url, headers);

    }

    joinLobby(): Promise<void | ServiceError> {
        const url = `/auth/api/v1/lobby/join`;

        return this.post<void, void>(url);
    }
    leaveLobby(): Promise<void | ServiceError> {
        const url = `/auth/api/v1/lobby/leave`;

        return this.post(url);
    }
}

export default CatanServiceProxy;
