import CatanServiceProxy from "./proxy"
import { ProfileStorage, UserProfile, UserType } from './Models/shared_models';
import { loadAdminProfileFromConfig } from "./testHelpers";
import { GameWorkerManager } from "./gameworker";

(async () => {
    const admin_profile = await loadAdminProfileFromConfig();
    const proxy = new CatanServiceProxy("https://localhost:8080");
    const version = await proxy.getVersion();
    console.log("service version: ", version);

    // login as the admin

    const admin_password = process.env.ADMIN_PASSWORD;

    const admin_auth_token = (await proxy
        .login(admin_profile.pii?.email as string, admin_password as string, ProfileStorage.CosmosDb))
        .expect("login to work");

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

    const result = (await proxy.registerTestUser(main_profile, test_password))
    if (result.isOk()) {
        console.log("profile returned from register_test_user: %o", result.getValue());
    } else {
        const err = result.getError();
        console.log("registerTestUser error: %o", err);
    }
    const user_auth_token = (await proxy.login(main_profile.pii?.email as string, test_password, ProfileStorage.CosmosDbTest))
        .expect("login of a newly registered test account should work");

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
    const local_profiles = (await proxy.getLocalUsers("Self")).expect("to be able to get my own profile");
    console.log(local_profiles);
    if (!local_profiles.find(profile => profile.displayName.includes(local_user_1.displayName))) {
        (await proxy.createLocalUser(local_user_1)).expect("to be able to create a local user");
    } else {
        console.log(local_user_1, "already exists");
    }

    if (!local_profiles.find(profile => profile.displayName.includes(local_user_2.displayName))) {
        (await proxy.createLocalUser(local_user_2)).expect("success");
    } else {
        console.log(local_user_2, "already exists");
    }

    // we know have enough users to create a game...let's start the worker thread

    const gameManager = new GameWorkerManager("./dist/worker.js", proxy);
    gameManager.Start();

})();




