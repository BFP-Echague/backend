import { DeepPartial, IncidentUpsert, IdParams, BlankObject, zodDecimal, zodId, zodDate } from "@dbm";
import { Prisma } from "@prisma/client";
import { CreateSchema, UpsertUtils } from "./base";
import { Request } from "express";
import Decimal from "decimal.js";
import { z } from "zod";



export class IncidentUpsertUtils extends UpsertUtils<
    IncidentUpsert, Prisma.IncidentCreateInput, Prisma.IncidentUpdateInput,
    IdParams
> {
    public static inst = new IncidentUpsertUtils();

    public constructor() {
        super(z.object({
            name: z.string(),
            location: z.object({
                latitude: zodDecimal,
                longitude: zodDecimal
            }),
            barangayId: zodId,
            causes: z.string().array(),
            structuresInvolved: z.string().array(),
            categoryId: zodId,
            reportTime: zodDate.optional(),
            responseTime: zodDate.optional(),
            fireOutTime: zodDate.optional(),
            notes: z.string().optional(),
            archived: z.boolean().optional()
        }) satisfies CreateSchema<IncidentUpsert>);
    }


    public override getCreateQuery(req: Request<BlankObject, BlankObject, BlankObject, BlankObject>, data: IncidentUpsert): Prisma.IncidentCreateInput {       
        return {
            name: data.name,
            reportTime: data.reportTime,
            location: { create: {
                latitude: data.location.latitude,
                longitude: data.location.longitude
            } },
            barangay: { connect: { id: data.barangayId } },
            causes: data.causes,
            responseTime: data.responseTime,
            fireOutTime: data.fireOutTime,
            structuresInvolved: data.structuresInvolved,
            notes: data.notes,
            category: { connect: { id: data.categoryId } },
            archived: data.archived
        };
    }

    public override getUpdateQuery(req: Request<IdParams, BlankObject, BlankObject, BlankObject>, data: DeepPartial<IncidentUpsert>): Prisma.IncidentUpdateInput {
        return {
            name: data.name,
            reportTime: data.reportTime,
            location: data.location ? ({ update: {
                latitude: data.location.latitude as Decimal | undefined,
                longitude: data.location.longitude as Decimal | undefined
            } }) : undefined,
            barangay: { update: { id: data.barangayId } },
            causes: data.causes,
            responseTime: data.responseTime,
            fireOutTime: data.fireOutTime,
            structuresInvolved: data.structuresInvolved,
            notes: data.notes,
            category: data.categoryId ? { connect: { id: data.categoryId } } : undefined,
            archived: data.archived
        };
    }
}