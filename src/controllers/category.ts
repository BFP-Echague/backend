import { logger, prismaClient } from "@src/global/apps";
import * as base from "./base";
import { searchAlg, categoryInclude, categoryOrderBy } from "@dbm";
import { CategoryUpsertUtils } from "@src/upsert";
import { createSearchNameQueryParam, SearchNameQueryParam } from "./base";


export const categoryControllerList: base.ControllerList<SearchNameQueryParam> = {
    queryParams: [createSearchNameQueryParam()],



    get: base.generalGet(
        async (req) => await prismaClient.category.findUnique({
            where: { id: req.id },
            include: categoryInclude
        })
    ),

    getMany: base.generalGetMany(
        async (req, validatedQuery) => await prismaClient.category.findMany({
            where: { name: validatedQuery.search ? searchAlg(validatedQuery.search) : undefined },
            include: categoryInclude,
            orderBy: categoryOrderBy
        })
    ),

    post: base.generalPost(
        CategoryUpsertUtils.inst,
        async (req, body) => await prismaClient.category.create({
            data: CategoryUpsertUtils.inst.getCreateQuery(req, body),
            include: categoryInclude
        })
    ),

    patch: base.generalPatch(
        CategoryUpsertUtils.inst,
        async (req, body) => await prismaClient.category.update({
            where: { id: req.id },
            data: CategoryUpsertUtils.inst.getUpdateQuery(req, body),
            include: categoryInclude
        })
    ),

    delete: base.generalDelete(
        async (req) => await prismaClient.category.delete({
            where: { id: req.id },
            include: categoryInclude
        })
    )
};



export async function ensureCategory() {
    const categoryCount = await prismaClient.category.count();
    if (categoryCount !== 0) return;

    logger?.error("No categories found. Populating categories ...");

    await prismaClient.category.createMany({
        data: [
            {
                name: "Low",
                severity: 0
            },
            {
                name: "Moderate",
                severity: 1
            },
            {
                name: "High",
                severity: 2
            },
            {
                name: "Severe",
                severity: 3
            },
        ]
    });
    logger?.warn(`Added categories.`);
}