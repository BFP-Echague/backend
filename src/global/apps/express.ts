import express, { ErrorRequestHandler, Response } from "express";
import "express-async-errors";

import bodyParser from "body-parser";

import { StatusCodes } from "http-status-codes";
import { Prisma } from "@prisma/client";
import { ValidateFunction } from "ajv/dist/types";
import cookieParser from "cookie-parser";
import cors from "cors";

import { logger } from "./pino";
import { env } from "./env";



export const expressClient = express();
export const jsonParser = bodyParser.json();

expressClient.use(cors({
    origin: true,
    credentials: true
}));

expressClient.use(jsonParser);
expressClient.use(cookieParser(env.SESSION_SECRET));


export class ErrorResponse {
    public constructor(
        public code: string,
        public message: string,
        public moreInfo?: object | null | undefined,
        public statusCode: number = StatusCodes.BAD_REQUEST
    ) {}

    static fromValidatorErrors(validatorErrors: ValidateFunction["errors"]) {
        return new ErrorResponse(
            "invalidJSONFormat",
            "Your JSON is not formatted correctly.",
            validatorErrors
        );
    }

    public getResponse(): object {
        return {
            "code": this.code,
            "message": this.message,
            "moreInfo": this.moreInfo ?? undefined,
        };
    }
}


export class SuccessResponse {
    public constructor(
        public moreInfo?: object | null | undefined,
        public message: string = "Success",
        public statusCode: number = StatusCodes.OK
    ) {}

    public getResponse(): object {
        return {
            "message": this.message,
            "moreInfo": this.moreInfo ?? undefined,
        };
    }

    public sendResponse<ResBody, Locals extends Record<string, unknown>>(res: Response<ResBody, Locals>) {
        res.status(this.statusCode).send(this.getResponse() as ResBody);
    }
}


export const asyncErrorHandler: ErrorRequestHandler = function (err, req, res, next) {
    // bad json input
    if (err instanceof SyntaxError && 'body' in err) {
        err = new ErrorResponse(
            "invalidJson",
            "Your JSON is invalid.",
            {
                "syntaxMessage": err.message,
                "syntaxBody": err.body
            }
        );
    }

    if (err instanceof Prisma.PrismaClientKnownRequestError) {
        let message;

        if (err.code === "P2002") {
            message = "A duplicate of the values that you have sent already exists.";
        }
        else if (err.code === "P2003") {
            message =
            "Cannot satisfy the foreign key constraint. " +
            "This is usually caused by trying to connect to a value that doesn't exist.";
        }
        else if (err.code === "P2025") {
            message = 
                "Cannot find value in database. " +
                "This is usually caused by trying to find a value that doesn't exist. ";
        }
        else {
            message = "The server does not have an attached message to this error.";
        }

        err = new ErrorResponse(
            "dbError",
            message,
            {
                "prismaCode": err.code,
                "prismaMeta": err.meta
            }
        );
    }

    if (err instanceof ErrorResponse) {
        res.status(err.statusCode).send(err.getResponse());
        next();
        return;
    }



    logger?.error(err, err?.message ?? "Unknown message");
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).send(
        { "message": `The server encountered an error during your request. This error has been logged.` }
    );

    next();
};