import mongoose from 'mongoose';

import verifiedUserModel, {emailAddressLinkedToUser} from '../../database/models/VerifiedUserModel';
import {hashString} from '../../utils/hashUtil';

describe('VerifiedUsers DB', () => {
    beforeAll(async () => {
        await mongoose.connect(process.env.MONGO_URL + 'VerifiedUsers' as string);
    });

    afterEach(async () => {
        await mongoose.connection.db.dropDatabase();
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    test('emailAddressLinkedToUser', async () => {
        const emailAddress = 'randomString@gmail.com';
        const guildId = 'randomGuildId';

        expect(await emailAddressLinkedToUser(emailAddress, guildId)).toBe(false);

        await verifiedUserModel.create({
            emailHash: await hashString(emailAddress.substring(0, emailAddress.indexOf('@'))),
            guildId: guildId,
        });

        expect(await emailAddressLinkedToUser(emailAddress, guildId)).toBe(true);
        expect(await emailAddressLinkedToUser(emailAddress, 'wrongGuildId')).toBe(false);
    });
});