import { DeepPartial } from "@dbm/base";
import { CategoryUpsert } from "@dbm/category";
import { IdParams, BlankObject } from "@dbm/interfaces";
import { Prisma } from "@prisma/client";
import { JTDSchemaType } from "ajv/dist/core";
import { UpsertUtils } from "./base";
import { Request } from "express";



export class CategoryUpsertUtils extends UpsertUtils<
    CategoryUpsert, Prisma.CategoryCreateInput, Prisma.CategoryUpdateInput,
    IdParams
> {
    public static inst = new CategoryUpsertUtils();

    public constructor() {
        const createJTD: JTDSchemaType<CategoryUpsert> = {
            properties: {
                "name": { type: "string" },
                "severity": { type: "int32" }
            }
        };

        const updateJTD: JTDSchemaType<DeepPartial<CategoryUpsert>> = {
            optionalProperties: {
                "name": { type: "string" },
                "severity": { type: "int32" }
            }
        };

        super(createJTD, updateJTD);
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