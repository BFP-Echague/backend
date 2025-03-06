import { IdParams } from "@dbm";
import { ControllerList, QPController } from "@src/controllers/base/base";
import { ErrorResponse, expressClient } from "@src/global/apps";
import { getDeleteLightRateLimit, getGetLightRateLimit, getPatchExpensiveRateLimit, getPostExpensiveRateLimit, idParams } from "@src/middlewares";
import { RoutePermissions } from "@src/middlewares/auth";
import { Request, RequestHandler } from "express";
import { validationResult } from "express-validator";
import { ParsedQs } from "qs";



export const baseRoute = "/api";


export function getBlankHandler<Params, ResBody, ReqBody, Query>(): RequestHandler<Params, ResBody, ReqBody, Query> {
    return async (_req, _res, next) => { next(); };
}


function addBaseToRoute(route: string) {
    return baseRoute + route;
}

function addIdtoRoute(route: string) {
    return baseRoute + route + "/:id";
}

interface GeneralRouteArgs<Params, ResBody, ReqBody, Query, QP> {
    route: string;
    permissions: RoutePermissions<Params, ResBody, ReqBody, Query>;

    controllerList: ControllerList<QP, Params, ResBody, ReqBody, Query>;
}



function queryParamsWrapper<Params, ResBody, ReqBody, Query extends ParsedQs, QP>(
    controller: QPController<Params, ResBody, ReqBody, Query, QP>
): RequestHandler {
    return async (req, res) => {
        const validation = validationResult(req);
        if (!validation.isEmpty()) 
            throw new ErrorResponse("invalidQueryParams", "Your query parameters are invalid!", validation.array());

        await controller(
            req as Request<Params, ResBody, ReqBody, Query>,
            req.query as unknown as QP,
            res
        );
    };
}



export function generalRoute<Params, ResBody, ReqBody, Query extends ParsedQs, QP>(args: GeneralRouteArgs<Params, ResBody, ReqBody, Query, QP>) {
    if (args.controllerList.get) {
        expressClient.get(
            addIdtoRoute(args.route),
            idParams,
            args.permissions.get as RequestHandler<Params & IdParams, ResBody, ReqBody, Query>,
            getGetLightRateLimit(),
            args.controllerList.get
        );
    }

    if (args.controllerList.getMany) {
        expressClient.get(
            addBaseToRoute(args.route),
            ...(args.controllerList.queryParams ?? []),
            args.permissions.getMany as RequestHandler,
            getGetLightRateLimit(),
            queryParamsWrapper(args.controllerList.getMany)
        );
    }

    if (args.controllerList.post) {
        expressClient.post(
            addBaseToRoute(args.route),
            args.permissions.post,
            getPostExpensiveRateLimit(),
            args.controllerList.post
        );
    }

    if (args.controllerList.putMany) {
        expressClient.put(
            addBaseToRoute(args.route),
            ...(args.controllerList.queryParams ?? []),
            args.permissions.putMany as RequestHandler,
            getGetLightRateLimit(),
            queryParamsWrapper(args.controllerList.putMany)
        );
    }

    if (args.controllerList.patch) {
        expressClient.patch(
            addIdtoRoute(args.route),
            idParams,
            args.permissions.patch as RequestHandler<Params & IdParams, ResBody, ReqBody, Query>,
            getPatchExpensiveRateLimit(),
            args.controllerList.patch
        );
    }

    if (args.controllerList.delete) {
        expressClient.delete(
            addIdtoRoute(args.route),
            idParams,
            args.permissions.delete as RequestHandler<Params & IdParams, ResBody, ReqBody, Query>,
            getDeleteLightRateLimit(),
            args.controllerList.delete
        );
    }
}