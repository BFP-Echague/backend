import { BlankObject, RawJSON, DeepPartial } from "@dbm";
import { z } from "zod";
import { Request, RequestHandler } from "express";


export type SimpleRequestHandler = RequestHandler<unknown, unknown, unknown, unknown>
export type PassedRequest = Parameters<SimpleRequestHandler>[0]

export type CreateSchema<Upsert extends object> = z.ZodType<Upsert, z.ZodTypeDef, RawJSON<Upsert>>;
export type UpdateSchema<Upsert extends object> = z.ZodType<DeepPartial<Upsert>, z.ZodTypeDef, DeepPartial<RawJSON<Upsert>>>;
export type PutManySchema<Upsert extends object> = z.ZodType<Upsert[], z.ZodTypeDef, RawJSON<Upsert[]>>;

export abstract class UpsertUtils<
    Upsert extends object,
    PrismaCreateInputType, PrismaUpdateInputType,
    UpdateParams = BlankObject, PostParams = BlankObject
> {
    public putManySchema: PutManySchema<Upsert>;
    public updateSchema: UpdateSchema<Upsert>;

    public constructor(
        public createSchema: CreateSchema<Upsert>,
    ) {
        this.putManySchema = createSchema.array();
        this.updateSchema = (createSchema as unknown as z.ZodObject<z.ZodRawShape>).partial() as unknown as UpdateSchema<Upsert>;
    }

    public abstract getCreateQuery(req: Request<PostParams, BlankObject, BlankObject, BlankObject>, data: Upsert): PrismaCreateInputType;
    public abstract getUpdateQuery(req: Request<UpdateParams, BlankObject, BlankObject, BlankObject>, data: DeepPartial<Upsert>): PrismaUpdateInputType;

    public getCreateManyQuery(req: Request<PostParams, BlankObject, BlankObject, BlankObject>, data: Upsert[]) {
        return data.map(item => this.getCreateQuery(req, item));
    }
}