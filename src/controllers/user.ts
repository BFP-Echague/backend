import { searchAlg, userOrderBy, userSelect, LoginData } from "@dbm";
import { SimpleRequestHandler } from "@src/upsert";
import { UserUpsertUtils } from "@src/upsert";
import { PrivilegeLevel } from "@prisma/client";
import { ErrorResponse, logger, prismaClient, SuccessResponse } from "@src/global/apps";
import bcrypt from "bcrypt";
import { authenticateUser, cookieSessionKey, getMustBeAdmin, getMustBeBasic, getSessionIdFromCookie, isPrivilegeMet, logoutSession, RoutePermissions, unauthorizedError, validateUser } from "../middlewares/auth";
import * as base from "./base";
import { createSearchNameQueryParam, SearchNameQueryParam } from "./base";
import { z } from "zod";



export function getRpUser<Params, ResBody, ReqBody, Query>(): RoutePermissions<Params, ResBody, ReqBody, Query> {
    return {
        get: getMustBeBasic<Params, ResBody, ReqBody, Query>(),
        getMany: getMustBeBasic<Params, ResBody, ReqBody, Query>(),
        post: getMustBeAdmin<Params, ResBody, ReqBody, Query>(),
        putMany: getMustBeAdmin<Params, ResBody, ReqBody, Query>(),
        patch: getMustBeBasic<Params, ResBody, ReqBody, Query>(),
        delete: getMustBeBasic<Params, ResBody, ReqBody, Query>()
    };
}


export async function logoutAll(userId: number, exceptSessionId?: string) {
    return await prismaClient.session.updateMany({
        where: {
            userId: userId,
            NOT: exceptSessionId !== undefined ? {
                uuidHash: exceptSessionId
            } : undefined
        },

        data: {
            loggedOut: true
        }
    });
}


export const userControllerList: base.ControllerList<SearchNameQueryParam> = {
    queryParams: [createSearchNameQueryParam()],


    get: base.generalGet(
        async (req) => await prismaClient.user.findUnique({
            select: userSelect,
            where: { id: req.id }
        })
    ),

    getMany: base.generalGetMany(
        async (req, validatedQuery) => await prismaClient.user.findMany({
            select: userSelect,
            where: { username: validatedQuery.search ? searchAlg(validatedQuery.search) : undefined },
            orderBy: userOrderBy
        })
    ),

    post: base.generalPost(
        UserUpsertUtils.inst,
        async (req, body) => await prismaClient.user.create({
            select: userSelect,
            data: UserUpsertUtils.inst.getCreateQuery(req, body)
        })
    ),

    patch: base.generalPatch(
        UserUpsertUtils.inst,
        async (req, body) => {
            if (req.user?.id !== req.id) {
                throw new ErrorResponse("editingDifferentUser", "You are editing a different user than who you are logged into.");
            }

            const toUpdate = await prismaClient.user.findUniqueOrThrow({
                where: { id: req.id }
            });

            if (body.privilege !== undefined && body.privilege !== toUpdate?.privilege) {
                throw new ErrorResponse("cannotUpdatePrivilege", "You cannot update your own privilege.");
            }
            delete body.privilege;


            const updateResult = await prismaClient.user.update({
                where: { id: req.id },
                data: UserUpsertUtils.inst.getUpdateQuery(req, body)
            });

            if (body.password !== undefined && !(await bcrypt.compare(body.password, toUpdate.passwordHash))) {
                logoutAll(updateResult.id);
            }

            const result = await prismaClient.user.findUnique({
                select: userSelect,
                where: { id: req.id }
            });
            if (result === null) throw new Error("User not found after updating.");

            return result;
        }
    ),

    delete: base.generalDelete(
        async (req) => {
            const toDelete = await prismaClient.user.findUniqueOrThrow({
                select: userSelect,
                where: { id: req.id }
            });

            if (req.user === undefined) throw unauthorizedError;
            if (!isPrivilegeMet(req.user.privilege, PrivilegeLevel.ADMIN)) {
                if (toDelete.id !== req.user.id) {
                    throw new ErrorResponse("deletingOtherAccount", "You can't delete another user.");
                }
            }



            if (toDelete.privilege === PrivilegeLevel.ADMIN) {
                const count = await prismaClient.user.count({
                    where: { privilege: PrivilegeLevel.ADMIN }
                });

                if (count === 1) {
                    throw new ErrorResponse("deletingLastAdminAccount", "You tried to delete the last admin account. You cannot do this.");
                }
            }


            return await prismaClient.user.delete({
                select: userSelect,
                where: { id: req.id }
            });
        }
    )
};



const userAuthSchema: z.ZodType<LoginData> = z.object({
    username: z.string(),
    password: z.string()
});
export const userAuthPost: SimpleRequestHandler = async function (req, res) {
    const parseResult = userAuthSchema.safeParse(req.body);
    if (!parseResult.success) {
        throw ErrorResponse.fromParseErrors(parseResult.error);
    }

    const result = await authenticateUser(parseResult.data);

    res.cookie(cookieSessionKey, result.sessionInfo.sessionId, {
        maxAge: result.sessionInfo.expiresOn.getTime() - Date.now(),
        httpOnly: true,
        signed: true,
        secure: true
    });

    new SuccessResponse(
        {
            newTokenData: result.sessionInfo,
            user: result.user
        },
        `Successful login. Implement the session ID into your cookies with the "${cookieSessionKey}" key.`
    ).sendResponse(res);
};



export const userAuthDelete: SimpleRequestHandler = async function (req, res) {
    const token = getSessionIdFromCookie(req);
    await validateUser(token);

    const result = await logoutSession(token);

    res.clearCookie(cookieSessionKey);
    new SuccessResponse(result).sendResponse(res);
};


export async function ensureAdmin() {
    const adminCount = await prismaClient.user.count({
        where: { privilege: PrivilegeLevel.ADMIN }
    });
    if (adminCount !== 0) return;

    logger?.error("No admin accounts found. Creating a new one...");
    const data = {
        username: "admin",
        email: "admin@gmail.com",
        passwordHash: "adminadmin123",
        privilege: PrivilegeLevel.ADMIN
    };

    await prismaClient.user.create({
        data: data
    });
    logger?.warn(`Created new admin account. Username: "${data.username}", Password: "${data.passwordHash}"\nPLEASE CHANGE THE PASSWORD IMMEDIATELY.`);
}