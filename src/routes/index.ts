import { expressClient } from "@src/global/apps";
import { rateLimitGen, durationToMs } from "@src/middlewares";
import * as controllers from "@src/controllers";

import { baseRoute, generalRoute } from "./base";
import { getRpNone } from "@src/middlewares/auth";



generalRoute({
    route: "",
    permissions: getRpNone(),
    controllerList: controllers.baseControllerList
});



const user = "/user";
generalRoute({
    route: user,
    permissions: controllers.getRpUser(),
    controllerList: controllers.userControllerList
});

const userAuth = baseRoute + "/login";
expressClient.post(
    userAuth,
    rateLimitGen({
        windowMs: durationToMs({ seconds: 30 }),
        limit: 5
    }),
    controllers.userAuthPost
);
expressClient.delete(
    userAuth,
    rateLimitGen({
        windowMs: durationToMs({ seconds: 30 }),
        limit: 5
    }),
    controllers.userAuthDelete
);