import pino from "pino";

import {
    expressClient, asyncErrorHandler, prismaClient,
    env, setLogger, streams
} from "@src/global/apps";

import "./routes";
import expressListRoutes from "express-list-routes";
import { ensureAdmin, ensureBarangays, ensureCategory, populateRandomIncidents } from "./controllers";


async function main() {
    expressClient.use(asyncErrorHandler);
    prismaClient.$connect();
    setLogger(pino({ level: "debug" }, streams));

    expressListRoutes(expressClient);

    const url = `${env.HOST}:${env.PORT}`;
    expressClient.listen(
        env.PORT,
        env.HOST,
        async () => {
            await ensureAdmin();
            await ensureBarangays();
            await ensureCategory();
            await populateRandomIncidents();
            console.log(`Server now listening on ${url}.`);
        }
    );
}

main().catch(() => {
    prismaClient.$disconnect();
});