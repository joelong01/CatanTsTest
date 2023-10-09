import CatanServiceProxy, { ProxyHelper } from "./proxy"
import { ProfileStorage, ServiceError, TestCallContext, UserProfile, UserType } from './Models/shared_models';
import { loadAdminProfileFromConfig } from "./testHelpers";
import { GameWorkerManager } from "./gameworker";

(async () => {
    const admin_profile = await loadAdminProfileFromConfig();
    const proxy = new CatanServiceProxy("https://localhost:8080");
    const version = await proxy.getVersion();
    console.log("service version: ", version);

    // login as the admin

    const admin_password = process.env.ADMIN_PASSWORD;

    var loginResponse = await proxy.login(admin_profile.pii?.email as string, admin_password as string, ProfileStorage.CosmosDb);
    let admin_auth_token = ProxyHelper.getResponseOrThrow<string>(loginResponse);
    proxy.setAuthToken(admin_auth_token);

    const test_phone_number = process.env.TEST_PHONE_NUMBER as string;
    const test_email = process.env.TEST_EMAIL as string;
    const test_password = "password01:)"

    const main_profile: UserProfile = {
        userType: UserType.Connected,
        pii: {
            email: test_email,
            firstName: "Joe",
            lastName: "Doe",
            phoneNumber: test_phone_number
        },
        displayName: "Joe (Main)",
        pictureUrl: "https://example.com/images/john.jpg",
        foregroundColor: "#00000000",
        backgroundColor: "#FFFFFF",
        textColor: "#00000000",
        gamesPlayed: 5,
        gamesWon: 2,
        validatedEmail: false,
        validatedPhone: false
    };

    let registerTestUserResponse = await proxy.registerTestUser(main_profile, test_password);
    if (registerTestUserResponse instanceof ServiceError) {
        console.log("error returned from registerTestUser: %o", (registerTestUserResponse as ServiceError).Status);
    } else {
        let returned_profile = ProxyHelper.getResponseOrThrow<UserProfile>(registerTestUserResponse);
        console.log("profile returned from register_test_user: %o", returned_profile);
    }


    loginResponse = await proxy.login(main_profile.pii?.email as string, test_password, ProfileStorage.CosmosDbTest);
    let user_auth_token = ProxyHelper.getResponseOrThrow<string>(loginResponse);
    proxy.setAuthToken(user_auth_token);

    const local_user_1: UserProfile = {
        userType: UserType.Local,
        displayName: "James",
        pictureUrl: "https://example.com/images/james.jpg",
        foregroundColor: "#00000000",
        backgroundColor: "#FFFFFF",
        textColor: "#00000000",
        gamesPlayed: 5,
        gamesWon: 2,
        validatedEmail: false,
        validatedPhone: false
    };

    const local_user_2: UserProfile = {
        userType: UserType.Local,
        displayName: "Doug",
        pictureUrl: "https://example.com/images/doug.jpg",
        foregroundColor: "#00000000",
        backgroundColor: "#FFFFFF",
        textColor: "#00000000",
        gamesPlayed: 5,
        gamesWon: 2,
        validatedEmail: false,
        validatedPhone: false
    };
    //
    //  here we are going through the already registered users and making sure that the ones we want are registered
    //  it is possible to run these tests over and over, so we want to check and then create instead of simply
    //  creating and getting an error.  this is also what the client will probably do.
    var localUserResponse = await proxy.getLocalUsers("Self");
    const local_profiles = ProxyHelper.getResponseOrThrow<UserProfile[]>(localUserResponse);
    console.log(local_profiles);
    if (!local_profiles.find(profile => profile.displayName.includes(local_user_1.displayName))) {
        var createLocalUserResponse = await proxy.createLocalUser(local_user_1);
        ProxyHelper.getResponseOrThrow<void>(createLocalUserResponse);
    } else {
        console.log(local_user_1, "already exists");
    }

    if (!local_profiles.find(profile => profile.displayName.includes(local_user_2.displayName))) {
        var createLocalUserResponse = await proxy.createLocalUser(local_user_2);
        ProxyHelper.getResponseOrThrow<void>(createLocalUserResponse);
    } else {
        console.log(local_user_2, "already exists");
    }

    // we know have enough users to create a game...let's start the worker thread

    const gameManager = new GameWorkerManager("./dist/worker.js", proxy);
    gameManager.Start();

})();




