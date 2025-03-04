import { DeepPartial } from "@dbm/base";
import { IncidentUpsert, validateLocationAxis } from "@dbm/incident";
import { IdParams, BlankObject } from "@dbm/interfaces";
import { Prisma } from "@prisma/client";
import { JTDSchemaType } from "ajv/dist/core";
import { UpsertUtils } from "./base";
import { Request } from "express";



export class IncidentUpsertUtils extends UpsertUtils<
    IncidentUpsert, Prisma.IncidentCreateInput, Prisma.IncidentUpdateInput,
    IdParams
> {
    public static inst = new IncidentUpsertUtils();

    public constructor() {
        const createJTD: JTDSchemaType<IncidentUpsert> = {
            properties: {
                "name": { type: "string" },
                "location": {
                    properties: {
                        "longitude": { type: "string" },
                        "latitude": { type: "string" }
                    }
                },
                "barangayId": { type: "int32" },
                "causeIds": { elements: { type: "int32" } },
                "structuresInvolved": { elements: { type: "string" } },
                "categoryId": { type: "int32" }
            }, 
            optionalProperties: {
                "reportTime": { type: "timestamp" },
                "responseTime": { type: "timestamp" },
                "fireOutTime": { type: "timestamp" },
                "notes": { type: "string" }
            }
        };

        const updateJTD: JTDSchemaType<DeepPartial<IncidentUpsert>> = {
            optionalProperties: {
                "name": { type: "string" },
                "location": {
                    optionalProperties: {
                        "longitude": { type: "string" },
                        "latitude": { type: "string" }
                    }
                },
                "barangayId": { type: "int32" },
                "causeIds": { elements: { type: "int32" } },
                "structuresInvolved": { elements: { type: "string" } },
                "categoryId": { type: "int32" },
                "reportTime": { type: "timestamp" },
                "responseTime": { type: "timestamp" },
                "fireOutTime": { type: "timestamp" },
                "notes": { type: "string" }
            }
        };

        super(createJTD, updateJTD);
    }


    public override getCreateQuery(req: Request<BlankObject, BlankObject, BlankObject, BlankObject>, data: IncidentUpsert): Prisma.IncidentCreateInput {       
        return {
            name: data.name,
            reportTime: data.reportTime,
            location: { create: {
                latitude: validateLocationAxis(data.location.latitude),
                longitude: validateLocationAxis(data.location.longitude)
            } },
            barangay: { connect: { id: data.barangayId } },
            causeIncidentJunc: { create: data.causeIds.map((causeId) => ({
                cause: { connect: { id: causeId } }
            })) },
            responseTime: data.responseTime,
            fireOutTime: data.fireOutTime,
            structuresInvolved: data.structuresInvolved,
            notes: data.notes,
            category: { connect: { id: data.categoryId } }
        };
    }

    public override getUpdateQuery(req: Request<IdParams, BlankObject, BlankObject, BlankObject>, data: DeepPartial<IncidentUpsert>): Prisma.IncidentUpdateInput {
        return {
            name: data.name,
            reportTime: data.reportTime,
            location: data.location ? ({ update: {
                latitude: data.location.latitude ? validateLocationAxis(data.location.latitude) : undefined,
                longitude: data.location.longitude ? validateLocationAxis(data.location.longitude) : undefined
            } }) : undefined,
            barangay: { update: { id: data.barangayId } },
            causeIncidentJunc: data.causeIds ? {
                deleteMany: {},
                createMany: {
                    data: data.causeIds.map((causeId) => ({ causeId: causeId  }))
                }
            } : undefined,
            responseTime: data.responseTime,
            fireOutTime: data.fireOutTime,
            structuresInvolved: data.structuresInvolved,
            notes: data.notes,
            category: data.categoryId ? { connect: { id: data.categoryId } } : undefined
        };
    }
}