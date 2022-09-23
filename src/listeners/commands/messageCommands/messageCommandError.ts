import type { Events, MessageCommandDeniedPayload } from '@sapphire/framework';
import { Listener, UserError } from '@sapphire/framework';
import {capFirstLetter} from "../../../utils/stringsUtil";
import logger from "../../../utils/loggerUtil";

module.exports = class CommandErrorListener extends Listener<typeof Events.MessageCommandError> {
    public async run({ context, message: content }: UserError, { message, command }: MessageCommandDeniedPayload) {
        const commandName = capFirstLetter(command.name);
        logger.error('Command Error:' + commandName + ' - ' + content);
        logger.error('==== ERROR CONTEXT BEGIN ====');
        logger.error(JSON.stringify(message));  // Log the message to ensure that we can debug later
        logger.error('==== ERROR CONTEXT END ====');
    }
}