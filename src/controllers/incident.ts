import { prismaClient } from "@src/global/apps";
import * as base from "./base";
import { incidentInclude, incidentOrderBy, IncidentUpsertUtils } from "@dbm/incident";
import { searchAlg } from "@dbm/base";
import { createSearchNameQueryParam, SearchNameQueryParam, createPageQueryParams, PageQueryParams } from "./base";


export const incidentControllerList: base.ControllerList<
    SearchNameQueryParam &
    PageQueryParams
> = {
    queryParams: [
        createSearchNameQueryParam(),
        createPageQueryParams()
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

                where: { name: validatedQuery.search ? searchAlg(validatedQuery.search) : undefined },
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

    delete: base.generalDelete(
        async (req) => await prismaClient.incident.delete({
            where: { id: req.id },
            include: incidentInclude
        })
    )
};