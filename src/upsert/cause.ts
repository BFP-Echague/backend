import { DeepPartial } from "@dbm/base";
import { CauseUpsert } from "@dbm/cause";
import { IdParams, BlankObject } from "@dbm/interfaces";
import { Prisma } from "@prisma/client";
import { JTDSchemaType } from "ajv/dist/core";
import { UpsertUtils } from "./base";
import { Request } from "express";



export class CauseUpsertUtils extends UpsertUtils<
    CauseUpsert, Prisma.CauseCreateInput, Prisma.CauseUpdateInput,
    IdParams
> {
    public static inst = new CauseUpsertUtils();

    public constructor() {
        const createJTD: JTDSchemaType<CauseUpsert> = {
            properties: {
                "name": { type: "string" }
            }
        };

        const updateJTD: JTDSchemaType<DeepPartial<CauseUpsert>> = {
            optionalProperties: {
                "name": { type: "string" }
            }
        };

        super(createJTD, updateJTD);
    }


    public override getCreateQuery(req: Request<BlankObject, BlankObject, BlankObject, BlankObject>, data: CauseUpsert): Prisma.CauseCreateInput {
        return { name: data.name };
    }

    public override getUpdateQuery(req: Request<IdParams, BlankObject, BlankObject, BlankObject>, data: DeepPartial<CauseUpsert>): Prisma.CauseUpdateInput {
        return { name: data.name };
    }
}