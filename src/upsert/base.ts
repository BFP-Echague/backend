import { DeepPartial } from "@dbm/base";
import { BlankObject } from "@dbm/interfaces";
import { JTDSchemaType } from "ajv/dist/core";
import { Request, RequestHandler } from "express";


export type SimpleRequestHandler = RequestHandler<unknown, unknown, unknown, unknown>
export type PassedRequest = Parameters<SimpleRequestHandler>[0]

export abstract class UpsertUtils<
    Interface extends object,
    PrismaCreateInputType, PrismaUpdateInputType,
    UpdateParams = BlankObject, PostParams = BlankObject
> {
    public putManyJTD: JTDSchemaType<Interface[]>;

    public constructor(
        public createJTD: JTDSchemaType<Interface>,
        public updateJTD: JTDSchemaType<DeepPartial<Interface>>
    ) {
        this.putManyJTD = {
            elements: createJTD
        } as JTDSchemaType<Interface[]>;
    }

    public abstract getCreateQuery(req: Request<PostParams, BlankObject, BlankObject, BlankObject>, data: Interface): PrismaCreateInputType;
    public abstract getUpdateQuery(req: Request<UpdateParams, BlankObject, BlankObject, BlankObject>, data: DeepPartial<Interface>): PrismaUpdateInputType;

    public getCreateManyQuery(req: Request<PostParams, BlankObject, BlankObject, BlankObject>, data: Interface[]) {
        return data.map(item => this.getCreateQuery(req, item));
    }
}