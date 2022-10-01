import {Command, Precondition} from '@sapphire/framework';
import {ContextMenuInteraction, Message} from 'discord.js';

import ChatInputInteraction = Command.ChatInputInteraction;

module.exports = class BotOwnerPrecondition extends Precondition {
    public messageRun(message: Message) {
        const BOT_OWNERS = process.env.BOT_OWNERS!.split(',');
        return BOT_OWNERS.includes(message.author.id) ? this.ok() : this.error({context: {silent: true}});
    }

    public chatInputRun(interaction: ChatInputInteraction) {
        const BOT_OWNERS = process.env.BOT_OWNERS!.split(',');
        return BOT_OWNERS.includes(interaction.user.id) ? this.ok() : this.error({context: {silent: true}});
    }
}

declare module '@sapphire/framework' {
    interface Preconditions {
        BotOwnerOnly: never;
    }
}