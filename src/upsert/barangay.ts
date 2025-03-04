import { BarangayUpsert } from "@dbm/barangay";
import { UpsertUtils } from "./base";
import { IdParams, BlankObject } from "@dbm/interfaces";
import { Prisma } from "@prisma/client";
import { JTDSchemaType } from "ajv/dist/core";
import { Request } from "express";
import { DeepPartial } from "@dbm/base";


export class BarangayUpsertUtils extends UpsertUtils<
    BarangayUpsert, Prisma.BarangayCreateInput, Prisma.BarangayUpdateInput,
    IdParams
> {
    public static inst = new BarangayUpsertUtils();

    public constructor() {
        const createJTD: JTDSchemaType<BarangayUpsert> = {
            properties: {
                "name": { type: "string" }
            }
        };

        const updateJTD: JTDSchemaType<DeepPartial<BarangayUpsert>> = {
            optionalProperties: {
                "name": { type: "string" }
            }
        };

        super(createJTD, updateJTD);
    }


    public override getCreateQuery(req: Request<BlankObject, BlankObject, BlankObject, BlankObject>, data: BarangayUpsert): Prisma.BarangayCreateInput {
        return { name: data.name };
    }

    public override getUpdateQuery(req: Request<IdParams, BlankObject, BlankObject, BlankObject>, data: DeepPartial<BarangayUpsert>): Prisma.BarangayUpdateInput {
        return { name: data.name };
    }
}