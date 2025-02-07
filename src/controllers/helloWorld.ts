import * as base from "./base";
import { SuccessResponse } from "@src/global/apps";



export const baseControllerList: base.ControllerList = {
    getMany: async function (req, validatedQuery, res) {
        new SuccessResponse(
            undefined,
            "Hello there, welcome to the API! Are you lost? Check the wiki!"
        ).sendResponse(res);
    }
};