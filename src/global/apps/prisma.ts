import { Prisma, PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import crypto from "crypto";



export function hashPassword(password: string) {
    return bcrypt.hashSync(password, 10);
}

export function hashSession(sessionId: string) {
    return crypto.createHash('sha256')
        .update(sessionId)
        .digest('hex');
}


export const prismaClient = new PrismaClient().$extends({
    query: {
        user: {
            $allOperations({ operation, args, query }) {
                if (!["create", "update"].includes(operation)) return query(args);

                type Args = Prisma.UserCreateArgs | Prisma.UserUpdateArgs;
                const retypedArgs: Args = (args as Args);

                const password = retypedArgs.data.passwordHash;
                if (password === undefined) return query(args);
                if (typeof password !== "string") return query(args);

                retypedArgs.data.passwordHash = hashPassword(password);
                return query(retypedArgs);
            }
        },

        session: {
            $allOperations({ operation, args, query }) {
                if (["create"].includes(operation)) {
                    const retypedArgs = (args as Prisma.SessionCreateArgs);

                    const uuid = retypedArgs.data.uuidHash;
                    if (uuid === undefined) return query(args);
                    if (typeof uuid !== "string") return query(args);

                    retypedArgs.data.uuidHash = hashSession(uuid);
                    return query(retypedArgs);
                }

                else if (["update", "findUnique"].includes(operation)) {
                    const retypedArgs = (args as Prisma.SessionUpdateArgs | Prisma.SessionFindUniqueArgs);

                    const uuid = retypedArgs.where.uuidHash;
                    if (uuid === undefined) return query(args);
                    if (typeof uuid !== "string") return query(args);

                    retypedArgs.where.uuidHash = hashSession(uuid);
                    return query(retypedArgs);
                }

                else return query(args);
            }
        }
    }
});