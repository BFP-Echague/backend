import { DeepPartial } from "@dbm/base";
import { IdParams, BlankObject } from "@dbm/interfaces";
import { UserUpsert } from "@dbm/user";
import { Prisma, PrivilegeLevel } from "@prisma/client";
import { CreateSchema, UpsertUtils } from "./base";
import { Request } from "express";
import { z } from "zod";

export class UserUpsertUtils extends UpsertUtils<
    UserUpsert, Prisma.UserCreateInput, Prisma.UserUpdateInput,
    IdParams
> {
    public static inst = new UserUpsertUtils();

    public constructor() {
        super(z.object({
            username: z.string(),
            email: z.string(),
            password: z.string(),
            privilege: z.nativeEnum(PrivilegeLevel)
        }) satisfies CreateSchema<UserUpsert>);
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