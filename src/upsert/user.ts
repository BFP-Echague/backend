import { DeepPartial } from "@dbm/base";
import { IdParams, BlankObject } from "@dbm/interfaces";
import { UserUpsert } from "@dbm/user";
import { Prisma } from "@prisma/client";
import { JTDSchemaType } from "ajv/dist/core";
import { UpsertUtils } from "./base";
import { Request } from "express";

export class UserUpsertUtils extends UpsertUtils<
    UserUpsert, Prisma.UserCreateInput, Prisma.UserUpdateInput,
    IdParams
> {
    public static inst = new UserUpsertUtils();

    public constructor() {
        const createJTD: JTDSchemaType<UserUpsert> = {
            properties: {
                "username": { type: "string" },
                "email": { type: "string" },
                "password": { type: "string" },
                "privilege": { enum: ["ADMIN", "BASIC"] }
            }
        };

        const updateJTD: JTDSchemaType<DeepPartial<UserUpsert>> = {
            optionalProperties: {
                "username": { type: "string" },
                "email": { type: "string" },
                "password": { type: "string" },
                "privilege": { enum: ["ADMIN", "BASIC"] }
            }
        };

        super(createJTD, updateJTD);
    }



    public override getCreateQuery(req: Request<BlankObject, BlankObject, BlankObject, BlankObject>, data: UserUpsert): Prisma.UserCreateInput {
        return {
            username: data.username,
            email: data.email,
            passwordHash: data.password,
            privilege: data.privilege
        };
    }


    public override getUpdateQuery(req: Request<IdParams, BlankObject, BlankObject, BlankObject>, data: DeepPartial<UserUpsert>): Prisma.UserUpdateInput {
        return {
            username: data.username,
            email: data.email,
            passwordHash: data.password,
            privilege: data.privilege
        };
    }
}