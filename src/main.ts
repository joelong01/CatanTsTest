import CatanServiceProxy, { ProxyHelper } from "./proxy"
import { ServiceError, TestContext, UserProfile, UserType } from './Models/shared_models';
import { loadAdminProfileFromConfig } from "./testHelpers";
import assert from "assert";
import { GameWorkerManager } from "./gameworker";

(async () => {
    const admin_profile = await loadAdminProfileFromConfig();


    const testContext = new TestContext(true);


    const proxy = new CatanServiceProxy("https://localhost:8080");
    const version = await proxy.getVersion();
    console.log("service version: ", version);

    // login as the admin

    const admin_password = process.env.ADMIN_PASSWORD;

    var loginResponse = await proxy.login(admin_profile.Pii?.Email as string, admin_password as string);
    let admin_auth_token = ProxyHelper.handleResponse<string>(loginResponse);
    proxy.setAuthToken(admin_auth_token);

    const test_phone_number = process.env.TEST_PHONE_NUMBER as string;
    const test_email = process.env.TEST_EMAIL as string;
    const test_password = "password01:)"

    const main_profile: UserProfile = {
        UserType: UserType.Connected,
        Pii: {
            Email: test_email,
            FirstName: "Joe",
            LastName: "Doe",
            PhoneNumber: test_phone_number
        },
        DisplayName: "Joe (Main)",
        PictureUrl: "https://example.com/images/john.jpg",
        ForegroundColor: "#00000000",
        BackgroundColor: "#FFFFFF",
        TextColor: "#00000000",
        GamesPlayed: 5,
        GamesWon: 2,
        ValidatedEmail: false,
        ValidatedPhone: false
    };
    proxy.setTestContext(testContext);
    let registerTestUserResponse = await proxy.registerTestUser(main_profile, test_password);
    if (registerTestUserResponse instanceof ServiceError) {
        console.log("error returned from registerTestUser: %o", (registerTestUserResponse as ServiceError).Status);
    } else {
        let returned_profile = ProxyHelper.handleResponse<UserProfile>(registerTestUserResponse);
        console.log("profile returned from register_test_user: %o", returned_profile);
    }


    loginResponse = await proxy.login(main_profile.Pii?.Email as string, test_password);
    let user_auth_token = ProxyHelper.handleResponse<string>(loginResponse);
    proxy.setAuthToken(user_auth_token);

    const local_user_1: UserProfile = {
        UserType: UserType.Local,
        DisplayName: "James",
        PictureUrl: "https://example.com/images/james.jpg",
        ForegroundColor: "#00000000",
        BackgroundColor: "#FFFFFF",
        TextColor: "#00000000",
        GamesPlayed: 5,
        GamesWon: 2,
        ValidatedEmail: false,
        ValidatedPhone: false
    };

    const local_user_2: UserProfile = {
        UserType: UserType.Local,
        DisplayName: "Doug",
        PictureUrl: "https://example.com/images/doug.jpg",
        ForegroundColor: "#00000000",
        BackgroundColor: "#FFFFFF",
        TextColor: "#00000000",
        GamesPlayed: 5,
        GamesWon: 2,
        ValidatedEmail: false,
        ValidatedPhone: false
    };
    //
    //  here we are going through the already registered users and making sure that the ones we want are registered
    //  it is possible to run these tests over and over, so we want to check and then create instead of simply
    //  creating and getting an error.  this is also what the client will probably do.
    var localUserResponse = await proxy.getLocalUsers("Self");
    const local_profiles = ProxyHelper.handleResponse<UserProfile[]>(localUserResponse);
    console.log(local_profiles);
    let local_profile: UserProfile;
    if (!local_profiles.find(profile => profile.DisplayName.includes(local_user_1.DisplayName))) {
        var createLocalUserResponse = await proxy.createLocalUser(local_user_1);
        ProxyHelper.handleResponse<void>(createLocalUserResponse);
    } else {
        console.log(local_user_1, "already exists");
    }

    if (!local_profiles.find(profile => profile.DisplayName.includes(local_user_2.DisplayName))) {
        var createLocalUserResponse = await proxy.createLocalUser(local_user_2);
        ProxyHelper.handleResponse<void>(createLocalUserResponse);
    } else {
        console.log(local_user_2, "already exists");
    }

    // we know have enough users to create a game...let's start the worker thread

    const gameManager = new GameWorkerManager("./dist/worker.js", proxy);
    gameManager.Start();

})();




