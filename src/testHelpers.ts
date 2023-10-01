import { UserProfile } from "./Models/shared_models";
import fs from 'fs/promises';

export async function loadAdminProfileFromConfig(): Promise<UserProfile> {
    const adminJsonPath = process.env.ADMIN_PROFILE_JSON;
    if (!adminJsonPath) {
        throw new Error("ADMIN_PROFILE_JSON not found in environment - unable to continue");
    }

    try {
        const contents = await fs.readFile(adminJsonPath, 'utf8');
        const profile = JSON.parse(contents) as UserProfile; // Assuming PascalCase conversion is handled in UserProfile type or elsewhere
        return profile;
    } catch (error) {
        throw new Error(`Error reading or parsing admin profile. Ensure the Admin Profile at ${adminJsonPath} is in PascalCase.`);
    }
}

