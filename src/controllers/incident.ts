import { ErrorResponse, prismaClient } from "@src/global/apps";
import * as base from "./base";
import { searchAlg, incidentInclude, incidentOrderBy } from "@dbm";
import { IncidentUpsertUtils } from "@src/upsert";
import { createSearchNameQueryParam, SearchNameQueryParam, createPageQueryParams, PageQueryParams, createIncludeArchivedQueryParam, IncludeArchivedQueryParams, FindManyOptions } from "./base";
import { query } from "express-validator";
import { getSessionById, getSessionIdFromCookie } from "@src/middlewares";
import { Request } from "express";



function createSortByQueryParam() {
    return query("sortBy").optional().isIn(["name", "reportTime", "barangay", "responseTime", "fireOutTime", "notes", "category", "archived", "createdBy", "updatedBy"]);
}
function createSortAscQueryParam() {
    return query("sortAsc").optional().isBoolean().toBoolean();
}
type SortBy = "name" | "reportTime" | "barangay" | "responseTime" | "fireOutTime" | "notes" | "category" | "archived" | "createdBy" | "updatedBy";
interface SortByQueryParams {
    sortBy?: SortBy;
    sortAsc?: boolean;
}

function toSortStr(sortAsc: boolean) {
    return sortAsc ? "asc" : "desc";
}


function createDateRangeQueryParams() {
    return query("dateMin", "dateMax").optional().isISO8601().toDate();
}
interface DateRangeQueryParams {
    dateMin?: Date;
    dateMax?: Date;
}

function createCategoryQueryParam() {
    return query("categoryId").optional().isInt().toInt();
}
interface CategoryQueryParams {
    categoryId?: number;
}

function createBarangayQueryParam() {
    return query("barangayId").optional().isInt().toInt();
}
interface BarangayQueryParams {
    barangayId?: number;
}


async function getUserFromRequest<Params, ResBody, ReqBody, QueryParams>(req: Request<Params, ResBody, ReqBody, QueryParams>) {
    const uploadingUser = await getSessionById(getSessionIdFromCookie(req));
    if (uploadingUser === null)
        throw new ErrorResponse("invalidSession", "The session ID in the cookie is invalid.");
    return uploadingUser;
}



async function getManyIncidents(arg: {
    paginationOptions: FindManyOptions;
    search?: string;
    includeArchived?: boolean;
    dateMin?: Date;
    dateMax?: Date;
    categoryId?: number;
    barangayId?: number;
    sortBy?: SortBy;
    sortAsc?: boolean;
}) {
    const parsedSortAsc = arg.sortAsc === undefined ? false : arg.sortAsc;

    const timeRange = { gte: arg.dateMin, lte: arg.dateMax };

    return await prismaClient.incident.findMany({
        ...arg.paginationOptions,

        where: {
            name: arg.search ? searchAlg(arg.search) : undefined,
            archived: arg.includeArchived === true ? undefined : false,
            categoryId: arg.categoryId,
            barangayId: arg.barangayId,
            OR: arg.dateMin !== undefined || arg.dateMax !== undefined ? [
                { reportTime: timeRange },
                { responseTime: timeRange },
                { fireOutTime: timeRange }
            ] : undefined
        },
        include: incidentInclude,
        orderBy: arg.sortBy === undefined ? incidentOrderBy : (
            arg.sortBy === "archived" ? { archived: toSortStr(parsedSortAsc) }
            : arg.sortBy === "name" ? { name: toSortStr(parsedSortAsc) }
            : arg.sortBy === "reportTime" ? { reportTime: toSortStr(parsedSortAsc) }
            : arg.sortBy === "responseTime" ? { responseTime: toSortStr(parsedSortAsc) }
            : arg.sortBy === "fireOutTime" ? { fireOutTime: toSortStr(parsedSortAsc) }
            : arg.sortBy === "barangay" ? { barangay: { name: toSortStr(parsedSortAsc) } }
            : arg.sortBy === "category" ? { category: { severity: toSortStr(parsedSortAsc) } }
            : arg.sortBy === "notes" ? { notes: toSortStr(parsedSortAsc) }
            : arg.sortBy === "createdBy" ? { createdBy: { username: toSortStr(parsedSortAsc) } }
            : arg.sortBy === "updatedBy" ? { updatedBy: { username: toSortStr(parsedSortAsc) } }
            : undefined
        ),
    });
}


export const incidentControllerList: base.ControllerList<
    SearchNameQueryParam &
    PageQueryParams &
    IncludeArchivedQueryParams & DateRangeQueryParams &
    CategoryQueryParams & BarangayQueryParams &
    SortByQueryParams
> = {
    queryParams: [
        createSearchNameQueryParam(),
        createPageQueryParams(),
        createIncludeArchivedQueryParam(), createDateRangeQueryParams(),
        createCategoryQueryParam(), createBarangayQueryParam(),
        createSortByQueryParam(), createSortAscQueryParam()
    ],



    get: base.generalGet(
        async (req) => await prismaClient.incident.findUnique({
            where: { id: req.id },
            include: incidentInclude
        })
    ),

    getMany: base.generalGetMany(
        async (req, validatedQuery) => {
            const pagination = base.paginate(validatedQuery.pageSize, validatedQuery.cursorId);

            const result = await getManyIncidents({
                paginationOptions: pagination.findManyOptions,
                search: validatedQuery.search,
                includeArchived: validatedQuery.includeArchived,
                dateMin: validatedQuery.dateMin,
                dateMax: validatedQuery.dateMax,
                categoryId: validatedQuery.categoryId,
                barangayId: validatedQuery.barangayId,
                sortBy: validatedQuery.sortBy,
                sortAsc: validatedQuery.sortAsc
            });

            return {
                data: result,
                pageInfo: pagination.getPageInfo(result)
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