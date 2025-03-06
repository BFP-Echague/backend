import { DeepPartial } from "@dbm/base";
import { CategoryUpsert } from "@dbm/category";
import { IdParams, BlankObject } from "@dbm/interfaces";
import { Prisma } from "@prisma/client";
import { CreateSchema, UpsertUtils } from "./base";
import { Request } from "express";
import { z } from "zod";



export class CategoryUpsertUtils extends UpsertUtils<
    CategoryUpsert, Prisma.CategoryCreateInput, Prisma.CategoryUpdateInput,
    IdParams
> {
    public static inst = new CategoryUpsertUtils();

    public constructor() {
        super(z.object({
            name: z.string(),
            severity: z.number().int()
        }) satisfies CreateSchema<CategoryUpsert>);
    }


    public override getCreateQuery(req: Request<BlankObject, BlankObject, BlankObject, BlankObject>, data: CategoryUpsert): Prisma.CategoryCreateInput {
        return {
            name: data.name,
            severity: data.severity
        };
    }

    public override getUpdateQuery(req: Request<IdParams, BlankObject, BlankObject, BlankObject>, data: DeepPartial<CategoryUpsert>): Prisma.CategoryUpdateInput {
        return {
            name: data.name,
            severity: data.severity
        };
    }
}