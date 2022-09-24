import {Command, Precondition} from '@sapphire/framework';
import {ContextMenuInteraction, Message, Permissions} from 'discord.js';

import ChatInputInteraction = Command.ChatInputInteraction;

module.exports = class AdminPrecondition extends Precondition {
    public messageRun(message: Message) {
        if (message.guild && message.member!.permissions.has(Permissions.FLAGS.ADMINISTRATOR)) return this.ok();
        return this.error({message: 'Only an admin is allowed to execute this command.'});
    }

    public chatInputRun(interaction: ChatInputInteraction) {
        if (interaction.guild && interaction.memberPermissions!.has(Permissions.FLAGS.ADMINISTRATOR)) return this.ok();
        return this.error({message: 'Only an admin is allowed to execute this command.'});
    }
}

declare module '@sapphire/framework' {
    interface Preconditions {
        AdminOnly: never;
    }
}