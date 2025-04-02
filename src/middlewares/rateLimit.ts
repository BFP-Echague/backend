import { ErrorResponse } from "@src/global/apps";
import { RequestHandler } from "express";
import rateLimit, { ClientRateLimitInfo, Options } from "express-rate-limit";
import { StatusCodes } from "http-status-codes";
import { Duration, DurationLikeObject } from "luxon";


type OmitOptions = Omit<Partial<Options>, "message" | "statusCode" | "legacyHeaders" | "standardHeaders">;
export function getRateLimitArgs(data: OmitOptions): Partial<Options> {
    return Object.assign(
        {},
        data,
        {
            message: new ErrorResponse(
                "rateLimit",
                "You have been rate limited. Please retry the request again later."
            ).getResponse(),
            statusCode: StatusCodes.TOO_MANY_REQUESTS,
            legacyHeaders: false,
            standardHeaders: true,

            handler: (req, res) => {
                res.setHeader("Access-Control-Expose-Headers", "Retry-After");
                res.status(StatusCodes.TOO_MANY_REQUESTS).send();
            }
        } as Partial<Options>
    );
}


interface RateLimitGen {
    windowMs: number;
    limit: number;
}
export function rateLimitGen(data: RateLimitGen) {
    return rateLimit(getRateLimitArgs(data));
}



export function durationToMs(duration: DurationLikeObject) {
    return Duration.fromObject(duration).as("milliseconds");
}



export type RateLimitFunctions = {
    resetKey: (key: string) => void;
    getKey: (key: string) => Promise<ClientRateLimitInfo | undefined> | ClientRateLimitInfo | undefined;
}

export type RateLimitedRequestHandler<Params, ResBody, ReqBody, Query>
    = RequestHandler<Params, ResBody, ReqBody, Query> & RateLimitFunctions;



export function getPostExpensiveRateLimit<Params, ResBody, ReqBody, Query>() {
    return rateLimitGen({
        windowMs: durationToMs({ minutes: 1 }),
        limit: 15
    }) as RateLimitedRequestHandler<Params, ResBody, ReqBody, Query>;
}
export function getPostLightRateLimit<Params, ResBody, ReqBody, Query>() {
    return rateLimitGen({
        windowMs: durationToMs({ minutes: 1 }),
        limit: 50
    }) as RateLimitedRequestHandler<Params, ResBody, ReqBody, Query>;
}

export function getPatchExpensiveRateLimit<Params, ResBody, ReqBody, Query>() {
    return getPostExpensiveRateLimit<Params, ResBody, ReqBody, Query>();
}
export function getPatchLightRateLimit<Params, ResBody, ReqBody, Query>() {
    return getPostLightRateLimit<Params, ResBody, ReqBody, Query>();
}

export function getGetExpensiveRateLimit<Params, ResBody, ReqBody, Query>() {
    return rateLimitGen({
        windowMs: durationToMs({ seconds: 1 }),
        limit: 50
    }) as RateLimitedRequestHandler<Params, ResBody, ReqBody, Query>;
}
export function getGetLightRateLimit<Params, ResBody, ReqBody, Query>() {
    return rateLimitGen({
        windowMs: durationToMs({ seconds: 1 }),
        limit: 100
    }) as RateLimitedRequestHandler<Params, ResBody, ReqBody, Query>;
}


export function getDeleteExpensiveRateLimit<Params, ResBody, ReqBody, Query>() {
    return getPostExpensiveRateLimit<Params, ResBody, ReqBody, Query>();
}
export function getDeleteLightRateLimit<Params, ResBody, ReqBody, Query>() {
    return getPostLightRateLimit<Params, ResBody, ReqBody, Query>();
}