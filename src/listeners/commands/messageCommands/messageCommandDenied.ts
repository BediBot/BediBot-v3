import type { Events, MessageCommandDeniedPayload } from '@sapphire/framework';
import { Listener, UserError } from '@sapphire/framework';
import {capFirstLetter} from "../../../utils/stringsUtil";
import logger from "../../../utils/loggerUtil";
import {BediEmbed} from "../../../lib/BediEmbed";
import colors from "../../../utils/colorUtil";

module.exports = class CommandDeniedListener extends Listener<typeof Events.MessageCommandDenied> {
    public async run({ context, message: content }: UserError, { message, command }: MessageCommandDeniedPayload) {
        const commandName = capFirstLetter(command.name);

        logger.debug('Command Denied: ' + commandName + ' - ' + content);

        // Does nothing if command has 'silent' flag
        if (Reflect.get(Object(context), 'silent')) return;

        const embed = new BediEmbed().setTitle(commandName + ' Reply').setColor(colors.ERROR).setDescription(content);
        return message.reply({embeds: [embed]});
    }
}