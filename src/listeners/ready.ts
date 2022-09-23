import { Listener } from '@sapphire/framework';
import logger from "../utils/loggerUtil";
import {connectDatabase} from "../database/connectDatabase";
import {startAgenda} from "../utils/schedulerUtil";

module.exports = class ReadyListener extends Listener {
    public constructor(context: Listener.Context, options: Listener.Options) {
        super(context, {
            ...options,
            once: true,
            event: 'ready',
        });
    }

    public async run() {
        logger.warn('The bot is up and running!');

        await connectDatabase();

        await startAgenda();
    }
}