import { BarangayUpsert, DeepPartial, IdParams, BlankObject } from "@dbm";
import { CreateSchema, UpsertUtils } from "./base";
import { Prisma } from "@prisma/client";
import { Request } from "express";
import { z } from "zod";


export class BarangayUpsertUtils extends UpsertUtils<
    BarangayUpsert, Prisma.BarangayCreateInput, Prisma.BarangayUpdateInput,
    IdParams
> {
    public static inst = new BarangayUpsertUtils();

    public constructor() {
        super(z.object({
            name: z.string()
        }) satisfies CreateSchema<BarangayUpsert>);
    }


    public override getCreateQuery(req: Request<BlankObject, BlankObject, BlankObject, BlankObject>, data: BarangayUpsert): Prisma.BarangayCreateInput {
        return { name: data.name };
    }

    public override getUpdateQuery(req: Request<IdParams, BlankObject, BlankObject, BlankObject>, data: DeepPartial<BarangayUpsert>): Prisma.BarangayUpdateInput {
        return { name: data.name };
    }
}