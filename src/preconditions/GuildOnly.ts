import {Command, Precondition} from '@sapphire/framework';
import {ContextMenuInteraction, Message} from 'discord.js';

import ChatInputInteraction = Command.ChatInputInteraction;

module.exports = class GuildPrecondition extends Precondition {
    public messageRun(message: Message) {
        if (message.guild) return this.ok();
        return this.error({message: 'This command can only be used in guilds.'});
    }

    public chatInputRun(interaction: ChatInputInteraction) {
        if (interaction.guild) return this.ok();
        return this.error({message: 'This command can only be used in guilds.'});
    }

    public contextMenuRun(interaction: ContextMenuInteraction) {
        if (interaction.guild) return this.ok();
        return this.error({message: 'This command can only be used in guilds.'});
    }
}

declare module '@sapphire/framework' {
    interface Preconditions {
        GuildOnly: never;
    }
}