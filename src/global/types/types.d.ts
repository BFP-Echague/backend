import { userInclude } from "@dbm";
import { Prisma } from "@prisma/client";

declare global {
    namespace Express {
        export interface Request {
            id: number;
            schoolYearId: number;
            user: Prisma.UserGetPayload<{ include: typeof userInclude }> | undefined;
        }
    }
}

export {};