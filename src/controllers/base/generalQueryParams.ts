import { query } from "express-validator";




export function createSearchNameQueryParam() {
    return query("search").optional().isString();
}

export interface SearchNameQueryParam {
    search?: string;
}


export function createPageQueryParams() {
    return query(["cursorId", "pageSize"]).optional().isInt().toInt();
}
export interface PageQueryParams {
    cursorId?: number;
    pageSize?: number;
}