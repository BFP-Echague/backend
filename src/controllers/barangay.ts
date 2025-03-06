import { prismaClient } from "@src/global/apps";
import * as base from "./base";
import { searchAlg, barangayInclude, barangayOrderBy } from "@dbm";
import { BarangayUpsertUtils } from "@src/upsert";
import { createSearchNameQueryParam, SearchNameQueryParam } from "./base";


export const barangayControllerList: base.ControllerList<SearchNameQueryParam> = {
    queryParams: [createSearchNameQueryParam()],



    get: base.generalGet(
        async (req) => await prismaClient.barangay.findUnique({
            where: { id: req.id },
            include: barangayInclude
        })
    ),

    getMany: base.generalGetMany(
        async (req, validatedQuery) => await prismaClient.barangay.findMany({
            where: { name: validatedQuery.search ? searchAlg(validatedQuery.search) : undefined },
            include: barangayInclude,
            orderBy: barangayOrderBy
        })
    ),

    post: base.generalPost(
        BarangayUpsertUtils.inst,
        async (req, body) => await prismaClient.barangay.create({
            data: BarangayUpsertUtils.inst.getCreateQuery(req, body),
            include: barangayInclude
        })
    ),

    patch: base.generalPatch(
        BarangayUpsertUtils.inst,
        async (req, body) => await prismaClient.barangay.update({
            where: { id: req.id },
            data: BarangayUpsertUtils.inst.getUpdateQuery(req, body),
            include: barangayInclude
        })
    ),

    delete: base.generalDelete(
        async (req) => await prismaClient.barangay.delete({
            where: { id: req.id },
            include: barangayInclude
        })
    )
};