import { ErrorResponse, prismaClient } from "@src/global/apps";
import * as base from "./base";
import { searchAlg, incidentInclude, incidentOrderBy } from "@dbm";
import { IncidentUpsertUtils } from "@src/upsert";
import { createSearchNameQueryParam, SearchNameQueryParam, createPageQueryParams, PageQueryParams, createIncludeArchivedQueryParam, IncludeArchivedQueryParams } from "./base";


export const incidentControllerList: base.ControllerList<
    SearchNameQueryParam &
    PageQueryParams &
    IncludeArchivedQueryParams
> = {
    queryParams: [
        createSearchNameQueryParam(),
        createPageQueryParams(),
        createIncludeArchivedQueryParam()
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

            const result = await prismaClient.incident.findMany({
                cursor: validatedQuery.cursorId ? { id: validatedQuery.cursorId } : undefined,
                skip: validatedQuery.cursorId ? 1 : 0,
                take: take,

                where: {
                    name: validatedQuery.search ? searchAlg(validatedQuery.search) : undefined,
                    archived: validatedQuery.includeArchived === true ? undefined : false
                },
                include: incidentInclude,
                orderBy: incidentOrderBy,
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
        async (req, body) => await prismaClient.incident.create({
            data: IncidentUpsertUtils.inst.getCreateQuery(req, body),
            include: incidentInclude
        })
    ),

    patch: base.generalPatch(
        IncidentUpsertUtils.inst,
        async (req, body) => await prismaClient.incident.update({
            where: { id: req.id },
            data: IncidentUpsertUtils.inst.getUpdateQuery(req, body),
            include: incidentInclude
        })
    ),

    delete: async () => {
        throw new ErrorResponse(
            "cannotDeleteIncident",
            "You cannot delete incidents, only archive them. You can instead send a PATCH request with {'archived': true}."
        );
    }
};