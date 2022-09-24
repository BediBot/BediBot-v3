import {Precondition} from '@sapphire/framework';
import {CommandInteraction, ContextMenuInteraction, Message} from 'discord.js';

import {getSettings} from '../database/models/SettingsModel';

export class QuotesEnabledPrecondition extends Precondition {
    public async messageRun(message: Message) {
        const {guildId, author} = message;

        const settingsData = await getSettings(guildId as string);

        if (settingsData.quotesEnabled) return this.ok();
        return this.error({message: 'Quotes are not enabled on this server!'});
    }

    public override async chatInputRun(interaction: CommandInteraction) {
        const {guildId, user} = interaction;

        const settingsData = await getSettings(guildId as string);

        if (settingsData.quotesEnabled) return this.ok();
        return this.error({message: 'Quotes are not enabled on this server!'});
    }

    public override async contextMenuRun(interaction: ContextMenuInteraction) {
        const {guildId} = interaction;

        const settingsData = await getSettings(guildId as string);

        if (settingsData.quotesEnabled) return this.ok();
        return this.error({message: 'Quotes are not enabled on this server!'});
    }
}

declare module '@sapphire/framework' {
    interface Preconditions {
        QuotesEnabled: never;
    }
}
