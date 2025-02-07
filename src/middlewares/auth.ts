import bcrypt from "bcrypt";
import { StatusCodes } from "http-status-codes";
import { RequestHandler, Request } from "express";
import { Prisma, PrivilegeLevel } from "@prisma/client";
import { ErrorResponse, prismaClient, env } from "@src/global/apps";
import crypto from "crypto";
import { LoginData } from "@dbm/auth";
import { getBlankHandler } from "@src/routes/base";
import { userSelect } from "@dbm/user";




export async function createSession(data: Prisma.SessionCreateInput) {
    return await prismaClient.session.create({
        data: data
    });
}

export async function updateSessionExpiration(sessionId: string, newExpiration: Date) {
    return await prismaClient.session.update({
        where: {
            uuidHash: sessionId
        },
        data: {
            expiresOn: newExpiration
        }
    });
}

export async function deleteSession(sessionId: string) {
    return await prismaClient.session.delete({
        where: {
            uuidHash: sessionId
        }
    });
}

export async function deleteAllSessionsOfUser(userId: number) {
    return await prismaClient.session.deleteMany({
        where: {
            userId: userId
        }
    });
}

export async function getSessionById(sessionId: string) {
    return await prismaClient.session.findUnique({
        where: {
            uuidHash: sessionId
        },
        include: {
            user: true
        }
    });
}



const invalidLoginError = new ErrorResponse("invalidLogin", "Invalid login credentials.", undefined, StatusCodes.UNAUTHORIZED);

export async function authenticateUser(loginData: LoginData) {
    // timing attack mitigation
    await new Promise((resolve) => {
        setTimeout(resolve, Math.random() * 1000);
    });

    const result = await prismaClient.user.findUnique({
        where: {
            username: loginData.username
        }
    });

    if (result === null) throw invalidLoginError;
    if (!await bcrypt.compare(loginData.password, result.passwordHash)) throw invalidLoginError;


    const sessionInfo = await makeSession(result.id);

    return {
        user: {
            id: result.id,
            username: result.username,
            email: result.email,
            privilege: result.privilege,
            createdAt: result.createdAt,
            updatedAt: result.updatedAt
        },
        sessionInfo: sessionInfo
    };
}



interface SessionInfoSend {
    sessionId: string;
    expiresOn: Date;
}

async function makeSession(userId: number) {
    const uuid = crypto.randomUUID();
    const expiresOn = new Date(Date.now() + env.SESSION_LENGTH_HOURS);
    await createSession({
        uuidHash: uuid,
        expiresOn: expiresOn,
        user: { connect: { id: userId } }
    });

    return {
        sessionId: uuid,
        expiresOn: expiresOn
    } as SessionInfoSend;
}

async function refreshSession(sessionId: string) {
    return await updateSessionExpiration(sessionId, new Date(Date.now() + env.SESSION_LENGTH_HOURS));
}


export async function logoutSession(sessionId: string) {
    return await prismaClient.session.update({
        where: {
            uuidHash: sessionId
        },
        data: {
            loggedOut: true
        },
        include: {
            user: { select: userSelect }
        }
    });
}



export async function validateUser(sessionId: string) {
    const result = await getSessionById(sessionId);
    if (result === null)
        throw new ErrorResponse(
            "invalidSession",
            "Session is invalid.",
            undefined, StatusCodes.UNAUTHORIZED
        );

    if (result.expiresOn < new Date())
        throw new ErrorResponse(
            "expiredSession",
            "Your session has expired.",
            undefined, StatusCodes.UNAUTHORIZED
        );

    if (result.loggedOut)
        throw new ErrorResponse(
            "loggedOut",
            "Your session has been logged out.",
            undefined, StatusCodes.UNAUTHORIZED
        );

    return result;
}


export const cookieSessionKey = "sessionId";
export function getSessionIdFromCookie<Params, ResBody, ReqBody, Query>(req: Request<Params, ResBody, ReqBody, Query>) {
    const token: string | undefined = req.signedCookies[cookieSessionKey];
    if (token === undefined)
        throw new ErrorResponse(
            "missingCookieSessionId",
            `Your cookie is missing a "${cookieSessionKey}" key.`,
            undefined, StatusCodes.UNAUTHORIZED
        );

    return token;
}


const privilegeLevelMagnitude: Record<PrivilegeLevel, number> = {
    [PrivilegeLevel.BASIC]: 1,
    [PrivilegeLevel.ADMIN]: 99
};

export function isPrivilegeMet(userPrivilegeLevel: PrivilegeLevel, minPrivilegeLevel: PrivilegeLevel) {
    return privilegeLevelMagnitude[userPrivilegeLevel] >= privilegeLevelMagnitude[minPrivilegeLevel];
}


export const unauthorizedError = new ErrorResponse(
    "unauthorized",
    "You do not have sufficient permissions to do this.",
    undefined, StatusCodes.FORBIDDEN
);

function privilegeMiddlewareGenerator<
    Params, ResBody, ReqBody, Query
>(
    minPrivilegeLevel: PrivilegeLevel
): RequestHandler<Params, ResBody, ReqBody, Query> {
    return (async (req, res, next) => {
        const token = getSessionIdFromCookie(req);

        const result = await validateUser(token);
        refreshSession(token);

        if (!isPrivilegeMet(result.user.privilege, minPrivilegeLevel)) {
            throw unauthorizedError;
        }

        req.user = result.user;

        next();
    });
}



export function getMustBeBasic<Params, ResBody, ReqBody, Query>() {
    return privilegeMiddlewareGenerator<Params, ResBody, ReqBody, Query>(PrivilegeLevel.BASIC);
}

export function getMustBeAdmin<Params, ResBody, ReqBody, Query>() {
    return privilegeMiddlewareGenerator<Params, ResBody, ReqBody, Query>(PrivilegeLevel.ADMIN);
}



export interface RoutePermissions<Params, ResBody, ReqBody, Query> {
    get: RequestHandler<Params, ResBody, ReqBody, Query>;
    getMany: RequestHandler<Params, ResBody, ReqBody, Query>;
    post: RequestHandler<Params, ResBody, ReqBody, Query>;
    putMany: RequestHandler<Params, ResBody, ReqBody, Query>;
    patch: RequestHandler<Params, ResBody, ReqBody, Query>;
    delete: RequestHandler<Params, ResBody, ReqBody, Query>;
}

export function getRpAdminOnly<Params, ResBody, ReqBody, Query>(): RoutePermissions<Params, ResBody, ReqBody, Query> {
    return {
        get: getMustBeAdmin<Params, ResBody, ReqBody, Query>(),
        getMany: getMustBeAdmin<Params, ResBody, ReqBody, Query>(),
        post: getMustBeAdmin<Params, ResBody, ReqBody, Query>(),
        putMany: getMustBeAdmin<Params, ResBody, ReqBody, Query>(),
        patch: getMustBeAdmin<Params, ResBody, ReqBody, Query>(),
        delete: getMustBeAdmin<Params, ResBody, ReqBody, Query>()
    };
}

export function getRpEditAdminOnly<Params, ResBody, ReqBody, Query>(): RoutePermissions<Params, ResBody, ReqBody, Query> {
    return {
        get: getMustBeBasic<Params, ResBody, ReqBody, Query>(),
        getMany: getMustBeBasic<Params, ResBody, ReqBody, Query>(),
        post: getMustBeAdmin<Params, ResBody, ReqBody, Query>(),
        putMany: getMustBeAdmin<Params, ResBody, ReqBody, Query>(),
        patch: getMustBeAdmin<Params, ResBody, ReqBody, Query>(),
        delete: getMustBeAdmin<Params, ResBody, ReqBody, Query>()
    };
}

export function getRpBasicOnly<Params, ResBody, ReqBody, Query>(): RoutePermissions<Params, ResBody, ReqBody, Query> {
    return {
        get: getMustBeBasic<Params, ResBody, ReqBody, Query>(),
        getMany: getMustBeBasic<Params, ResBody, ReqBody, Query>(),
        post: getMustBeBasic<Params, ResBody, ReqBody, Query>(),
        putMany: getMustBeBasic<Params, ResBody, ReqBody, Query>(),
        patch: getMustBeBasic<Params, ResBody, ReqBody, Query>(),
        delete: getMustBeBasic<Params, ResBody, ReqBody, Query>()
    };
}

export function getRpNone<Params, ResBody, ReqBody, Query>(): RoutePermissions<Params, ResBody, ReqBody, Query> {
    return {
        get: getBlankHandler<Params, ResBody, ReqBody, Query>(),
        getMany: getBlankHandler<Params, ResBody, ReqBody, Query>(),
        post: getBlankHandler<Params, ResBody, ReqBody, Query>(),
        putMany: getBlankHandler<Params, ResBody, ReqBody, Query>(),
        patch: getBlankHandler<Params, ResBody, ReqBody, Query>(),
        delete: getBlankHandler<Params, ResBody, ReqBody, Query>()
    };
}
