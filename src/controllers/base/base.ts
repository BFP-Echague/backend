import { UpsertUtils } from "@src/upsert/base";
import { DeepPartial, BlankObject, IdParams, PagedResult } from "@dbm";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { ErrorResponse, SuccessResponse } from "@src/global/apps";
import { Request, RequestHandler, Response } from "express";
import { ValidationChain } from "express-validator";
import { StatusCodes } from "http-status-codes";



export type QPController<Params, ResBody, ReqBody, Query, ValidatedQs> = (
    req: Request<Params, ResBody, ReqBody, Query>,
    validatedQuery: ValidatedQs,
    res: Response<ResBody>
) => Promise<void>



export interface ControllerList<
    ValidatedQs = BlankObject,
    Params = BlankObject,
    ResBody = BlankObject,
    ReqBody = BlankObject,
    Query = BlankObject
> {
    queryParams?: ValidationChain[];

    get?: RequestHandler<Params & IdParams, ResBody, ReqBody, Query>;
    getMany?: QPController<Params, ResBody, ReqBody, Query, ValidatedQs>;

    post?: RequestHandler<Params, ResBody, ReqBody, Query>;

    putMany?: QPController<Params, ResBody, ReqBody, Query, ValidatedQs>;

    patch?: RequestHandler<Params & IdParams, ResBody, ReqBody, Query>;

    delete?: RequestHandler<Params & IdParams, ResBody, ReqBody, Query>;
}



export function generalGet<
    Params, ResBody, ReqBody, QueryParams,
    Result extends object | null
>(
    getByIdFunc: (req: Request<Params, ResBody, ReqBody, QueryParams>) => Promise<Result>
): RequestHandler<Params, ResBody, ReqBody, QueryParams> {
    return async function (req, res) {
        const result = await getByIdFunc(req);
        if (result === null) {
            throw new ErrorResponse("notFoundId", "ID not found.", undefined, StatusCodes.NOT_FOUND);
        }

        new SuccessResponse(result).sendResponse(res);
    };
}



export function generalGetMany<
    Params, ResBody, ReqBody, QueryParams,
    Result extends object,
    ValidatedQs
>(
    getManyFunc: (req: Request<Params, ResBody, ReqBody, QueryParams>, validatedQuery: ValidatedQs)
        => Promise<Result[]>,
    isPaged: false
): QPController<Params, ResBody, ReqBody, QueryParams, ValidatedQs>
export function generalGetMany<
    Params, ResBody, ReqBody, QueryParams,
    Result extends object,
    ValidatedQs
>(
    getManyFunc: (req: Request<Params, ResBody, ReqBody, QueryParams>, validatedQuery: ValidatedQs)
        => Promise<Result[]>
): QPController<Params, ResBody, ReqBody, QueryParams, ValidatedQs>
export function generalGetMany<
    Params, ResBody, ReqBody, QueryParams,
    Result extends object,
    ValidatedQs
>(
    getManyFunc: (req: Request<Params, ResBody, ReqBody, QueryParams>, validatedQuery: ValidatedQs)
        => Promise<PagedResult<Result[]>>,
    isPaged: true
): QPController<Params, ResBody, ReqBody, QueryParams, ValidatedQs>

export function generalGetMany<
    Params, ResBody, ReqBody, QueryParams,
    Result extends object,
    ValidatedQs
>(
    getManyFunc: (req: Request<Params, ResBody, ReqBody, QueryParams>, validatedQuery: ValidatedQs)
        => Promise<Result[] | PagedResult<Result[]>>,
    isPaged: boolean = false
): QPController<Params, ResBody, ReqBody, QueryParams, ValidatedQs> {
    const noneFound = "No results found, but here's an empty list anyway";

    return async function (req, validatedQuery, res) {
        const result = await getManyFunc(req, validatedQuery);

        if (isPaged) {
            const pagedResult = result as PagedResult<Result[]>;
            if (pagedResult.data.length === 0) {
                new SuccessResponse({
                    data: [],
                    pageInfo: { cursorNext: null }
                } as PagedResult<unknown>, noneFound).sendResponse(res);
                return;
            }
        }
        else {
            const basicResult = result as Result[];
            if (basicResult.length === 0) {
                new SuccessResponse([], noneFound).sendResponse(res);
                return;
            }
        }

        new SuccessResponse(result).sendResponse(res);
    };
}



async function catchUpsertPromise<T>(promise: Promise<T>) {
    try {
        return await promise;
    } catch (err: unknown) {
        if (err instanceof Error) {
            if (err instanceof PrismaClientKnownRequestError) {
                throw err;
            }
            else {
                throw new ErrorResponse("otherError", err.message);
            }
        }
        else {
            throw err;
        }
    }
}



export function generalPutMany<
    Interface extends object,
    PrismaCreateInputType, PrismaUpdateInputType,
    UpdateParams, PostParams,
    Params, ResBody, ReqBody, QueryParams,
    ValidatedQs,
    Result extends object
>(
    schemaUpsertUtils: UpsertUtils<Interface, PrismaCreateInputType, PrismaUpdateInputType, UpdateParams, PostParams>,
    putManyFunc: (req: Request<Params, ResBody, ReqBody, QueryParams>, validatedQuery: ValidatedQs, body: Interface[]) => Promise<Result[]>
): QPController<Params, ResBody, ReqBody, QueryParams, ValidatedQs> {
    return async function (req, validatedQuery, res) {
        const parseResult = await schemaUpsertUtils.putManySchema.safeParseAsync(req.body);
        if (!parseResult.success) {
            throw ErrorResponse.fromParseErrors(parseResult.error);
        }

        const result = await catchUpsertPromise(putManyFunc(req, validatedQuery, parseResult.data));
        new SuccessResponse(result).sendResponse(res);
    };
}



export function generalPost<
    Interface extends object,
    PrismaCreateInputType, PrismaUpdateInputType,
    UpdateParams, PostParams,
    Params, ResBody, ReqBody, QueryParams,
    Result extends object
>(
    schemaUpsertUtils: UpsertUtils<Interface, PrismaCreateInputType, PrismaUpdateInputType, UpdateParams, PostParams>,
    createFunc: (req: Request<Params, ResBody, ReqBody, QueryParams>, body: Interface) => Promise<Result>
): RequestHandler<Params, ResBody, ReqBody, QueryParams> {
    return async function (req, res) {
        const parseResult = await schemaUpsertUtils.createSchema.safeParseAsync(req.body);
        if (!parseResult.success) {
            throw ErrorResponse.fromParseErrors(parseResult.error);
        }

        const result = await catchUpsertPromise(createFunc(req, parseResult.data));
        new SuccessResponse(result).sendResponse(res);
    };
}



export function generalPatch<
    Interface extends object,
    PrismaCreateInputType, PrismaUpdateInputType,
    UpdateParams, PostParams,
    Params, ResBody, ReqBody, QueryParams,
    Result extends object
>(
    schemaUpsertUtils: UpsertUtils<Interface, PrismaCreateInputType, PrismaUpdateInputType, UpdateParams, PostParams>,
    patchFunc: (req: Request<Params, ResBody, ReqBody, QueryParams>, body: DeepPartial<Interface>) => Promise<Result>
): RequestHandler<Params, ResBody, ReqBody, QueryParams> {
    return async function (req, res) {
        const parseResult = await schemaUpsertUtils.updateSchema.safeParseAsync(req.body);
        if (!parseResult.success) {
            throw ErrorResponse.fromParseErrors(parseResult.error);
        }

        const result = await catchUpsertPromise(patchFunc(req, parseResult.data));
        new SuccessResponse(result).sendResponse(res);
    };
}



export function generalDelete<
    Params, ResBody, ReqBody, QueryParams,
    Result extends object | null
>(
    deleteFunc: (req: Request<Params, ResBody, ReqBody, QueryParams>) => Promise<Result>
): RequestHandler<Params, ResBody, ReqBody, QueryParams> {
    return async function (req, res) {
        const result = await deleteFunc(req);
        if (result === null) {
            throw new ErrorResponse("notFoundId", "ID not found.", undefined, StatusCodes.NOT_FOUND);
        }

        new SuccessResponse(result).sendResponse(res);
    };
}



export interface FindManyOptions {
    cursor?: { id: number};
    skip: number;
    take: number;
}

export function paginate(pageSize: number | undefined, cursorId: number | undefined) {
    const take = pageSize ?? 10;

    return {
        getPageInfo: (result: { id: number }[]) => ({
            cursorNext: result.length === take ? result[result.length - 1].id : null
        }),

        findManyOptions: {
            cursor: cursorId ? { id: cursorId } : undefined,
            skip: cursorId ? 1 : 0,
            take: take,
        } as FindManyOptions
    };
}