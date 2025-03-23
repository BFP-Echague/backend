import { ErrorResponse, prismaClient } from "@src/global/apps";
import * as base from "./base";
import { searchAlg, incidentInclude, incidentOrderBy } from "@dbm";
import { IncidentUpsertUtils } from "@src/upsert";
import { createSearchNameQueryParam, SearchNameQueryParam, createPageQueryParams, PageQueryParams, createIncludeArchivedQueryParam, IncludeArchivedQueryParams } from "./base";
import { query } from "express-validator";
import { getSessionById, getSessionIdFromCookie } from "@src/middlewares";
import { Request } from "express";



function createSortByQueryParam() {
    return query("sortBy").optional().isIn(["name", "reportTime", "barangay", "responseTime", "fireOutTime", "notes", "category", "archived"]);
}
function createSortAscQueryParam() {
    return query("sortAsc").optional().isBoolean().toBoolean();
}
interface SortByQueryParams {
    sortBy?: "name" | "reportTime" | "barangay" | "responseTime" | "fireOutTime" | "notes" | "category" | "archived";
    sortAsc?: boolean;
}

function toSortStr(sortAsc: boolean) {
    return sortAsc ? "asc" : "desc";
}


async function getUserFromRequest<Params, ResBody, ReqBody, QueryParams>(req: Request<Params, ResBody, ReqBody, QueryParams>) {
    const uploadingUser = await getSessionById(getSessionIdFromCookie(req));
    if (uploadingUser === null)
        throw new ErrorResponse("invalidSession", "The session ID in the cookie is invalid.");
    return uploadingUser;
}


export const incidentControllerList: base.ControllerList<
    SearchNameQueryParam &
    PageQueryParams &
    IncludeArchivedQueryParams & SortByQueryParams
> = {
    queryParams: [
        createSearchNameQueryParam(),
        createPageQueryParams(),
        createIncludeArchivedQueryParam(), createSortByQueryParam(), createSortAscQueryParam()
    ],



    get: base.generalGet(
        async (req) => await prismaClient.incident.findUnique({
            where: { id: req.id },
            include: incidentInclude
        })
    ),

    getMany: base.generalGetMany(
        async (req, validatedQuery) => {
            const take = validatedQuery.pageSize ?? 10;


            const sortAsc = validatedQuery.sortAsc === undefined ? false : validatedQuery.sortAsc;

            const result = await prismaClient.incident.findMany({
                cursor: validatedQuery.cursorId ? { id: validatedQuery.cursorId } : undefined,
                skip: validatedQuery.cursorId ? 1 : 0,
                take: take,

                where: {
                    name: validatedQuery.search ? searchAlg(validatedQuery.search) : undefined,
                    archived: validatedQuery.includeArchived === true ? undefined : false
                },
                include: incidentInclude,
                orderBy: validatedQuery.sortBy === undefined ? incidentOrderBy : (
                    validatedQuery.sortBy === "archived" ? { archived: toSortStr(sortAsc) }
                    : validatedQuery.sortBy === "name" ? { name: toSortStr(sortAsc) }
                    : validatedQuery.sortBy === "reportTime" ? { reportTime: toSortStr(sortAsc) }
                    : validatedQuery.sortBy === "responseTime" ? { responseTime: toSortStr(sortAsc) }
                    : validatedQuery.sortBy === "fireOutTime" ? { fireOutTime: toSortStr(sortAsc) }
                    : validatedQuery.sortBy === "barangay" ? { barangay: { name: toSortStr(sortAsc) } }
                    : validatedQuery.sortBy === "category" ? { category: { severity: toSortStr(sortAsc) } }
                    : validatedQuery.sortBy === "notes" ? { notes: toSortStr(sortAsc) }
                    : undefined
                ),
            });

            return {
                data: result,
                pageInfo: {
                    cursorNext: result.length === take ? result[result.length - 1].id : null
                }
            };
        },

        true
    ),

    post: base.generalPost(
        IncidentUpsertUtils.inst,
        async (req, body) => {
            const uploadingUser = await getUserFromRequest(req);

            return await prismaClient.incident.create({
                data: {
                    ...IncidentUpsertUtils.inst.getCreateQuery(req, body),
                    createdBy: { connect: { id: uploadingUser.user.id } },
                    updatedBy: { connect: { id: uploadingUser.user.id } }
                },
                include: incidentInclude
            });
        }
    ),

    patch: base.generalPatch(
        IncidentUpsertUtils.inst,
        async (req, body) => {
            const uploadingUser = await getUserFromRequest(req);

            return await prismaClient.incident.update({
                where: { id: req.id },
                data: {
                    ...IncidentUpsertUtils.inst.getUpdateQuery(req, body),
                    updatedBy: { connect: { id: uploadingUser.user.id } }
                },
                include: incidentInclude
            });
        }
    ),

    delete: async () => {
        throw new ErrorResponse(
            "cannotDeleteIncident",
            "You cannot delete incidents, only archive them. You can instead send a PATCH request with {'archived': true}."
        );
    }
};