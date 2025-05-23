import { expressClient } from "@src/global/apps";
import { rateLimitGen, durationToMs } from "@src/middlewares";
import * as controllers from "@src/controllers";

import { baseRoute, generalRoute } from "./base";
import { getRpBasicOnly, getRpEditAdminOnly, getRpNone } from "@src/middlewares/auth";



generalRoute({
    route: "",
    permissions: getRpNone(),
    controllerList: controllers.helloWorldControllerList
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
        windowMs: durationToMs({ seconds: 60 }),
        limit: 5
    }),
    controllers.userAuthPost
);
expressClient.delete(
    userAuth,
    controllers.userAuthDelete
);


const helloWorld = "/";
generalRoute({
    route: helloWorld,
    permissions: getRpNone(),
    controllerList: controllers.helloWorldControllerList
});


const barangay = "/barangay";
generalRoute({
    route: barangay,
    permissions: getRpEditAdminOnly(),
    controllerList: controllers.barangayControllerList
});

const category = "/category";
generalRoute({
    route: category,
    permissions: getRpBasicOnly(),
    controllerList: controllers.categoryControllerList
});

const incident = "/incident";
generalRoute({
    route: incident,
    permissions: getRpBasicOnly(),
    controllerList: controllers.incidentControllerList
});

const cluster = "/cluster";
generalRoute({
    route: cluster,
    permissions: getRpBasicOnly(),
    controllerList: controllers.clusteringControllerList
});