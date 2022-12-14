import {Precondition} from '@sapphire/framework';
import {Message} from 'discord.js';

import {getSettings} from '../database/models/SettingsModel';

module.exports = class VerificationEnabledPrecondition extends Precondition {
    public async messageRun(message: Message) {
        const {guildId, author} = message;

        const settingsData = await getSettings(guildId as string);

        if (settingsData.verificationEnabled) return this.ok();
        return this.error({message: 'Verification is not enabled on this server!'});
    }
}