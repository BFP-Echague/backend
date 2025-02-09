import { prismaClient } from "@src/global/apps";
import * as base from "./base";
import { causeInclude, causeOrderBy, CauseUpsertUtils } from "@dbm/cause";
import { searchAlg } from "@dbm/base";
import { createSearchNameQueryParam, SearchNameQueryParam } from "./base";


export const causeControllerList: base.ControllerList<SearchNameQueryParam> = {
    queryParams: [createSearchNameQueryParam()],



    get: base.generalGet(
        async (req) => await prismaClient.cause.findUnique({
            where: { id: req.id },
            include: causeInclude
        })
    ),

    getMany: base.generalGetMany(
        async (req, validatedQuery) => await prismaClient.cause.findMany({
            where: { name: validatedQuery.search ? searchAlg(validatedQuery.search) : undefined },
            include: causeInclude,
            orderBy: causeOrderBy
        })
    ),

    post: base.generalPost(
        CauseUpsertUtils.inst,
        async (req, body) => await prismaClient.cause.create({
            data: CauseUpsertUtils.inst.getCreateQuery(req, body),
            include: causeInclude
        })
    ),

    patch: base.generalPatch(
        CauseUpsertUtils.inst,
        async (req, body) => await prismaClient.cause.update({
            where: { id: req.id },
            data: CauseUpsertUtils.inst.getUpdateQuery(req, body),
            include: causeInclude
        })
    ),

    delete: base.generalDelete(
        async (req) => await prismaClient.cause.delete({
            where: { id: req.id },
            include: causeInclude
        })
    )
};