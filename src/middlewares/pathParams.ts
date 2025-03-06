import { ErrorResponse } from "@src/global/apps";
import { RequestHandler } from "express";
import { IdParams } from "@dbm";



export function idRoute(route: string) { return route + "/:id"; }

export const idParams: RequestHandler<IdParams> = async function (req, res, next) {
    const stillString = req.params.id as unknown as string | null | undefined;

    if (!stillString) throw new ErrorResponse("noId", "You did not specify an ID.");

    req.id = Math.floor(Number(stillString));
    if (Number.isNaN(req.id)) {
        throw new ErrorResponse("badID", "Your ID is not valid.");
    }

    next();
};