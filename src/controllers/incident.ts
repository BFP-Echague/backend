import { env, ErrorResponse, logger, prismaClient } from "@src/global/apps";
import * as base from "./base";
import { searchAlg, incidentInclude, incidentOrderBy } from "@dbm";
import { IncidentUpsertUtils } from "@src/upsert";
import { createSearchNameQueryParam, SearchNameQueryParam, createPageQueryParams, PageQueryParams, createIncludeArchivedQueryParam, IncludeArchivedQueryParams, FindManyOptions } from "./base";
import { query } from "express-validator";
import { getSessionById, getSessionIdFromCookie } from "@src/middlewares";
import { Request } from "express";
import { Prisma } from "@prisma/client";
import _ from "underscore";



function createSortByQueryParam() {
    return query("sortBy").optional().isIn(["name", "reportTime", "barangay", "responseTime", "fireOutTime", "notes", "category", "archived", "createdBy", "updatedBy"]);
}
function createSortAscQueryParam() {
    return query("sortAsc").optional().isBoolean().toBoolean();
}
type SortBy = "name" | "reportTime" | "barangay" | "responseTime" | "fireOutTime" | "notes" | "category" | "archived" | "createdBy" | "updatedBy";
interface SortByQueryParams {
    sortBy?: SortBy;
    sortAsc?: boolean;
}

function toSortStr(sortAsc: boolean) {
    return sortAsc ? "asc" : "desc";
}


function createDateRangeQueryParams() {
    return query("dateMin", "dateMax").optional().isISO8601().toDate();
}
interface DateRangeQueryParams {
    dateMin?: Date;
    dateMax?: Date;
}

function createCategoryQueryParam() {
    return query("categoryId").optional().isInt().toInt();
}
interface CategoryQueryParams {
    categoryId?: number;
}

function createBarangayQueryParam() {
    return query("barangayId").optional().isInt().toInt();
}
interface BarangayQueryParams {
    barangayId?: number;
}


async function getUserFromRequest<Params, ResBody, ReqBody, QueryParams>(req: Request<Params, ResBody, ReqBody, QueryParams>) {
    const uploadingUser = await getSessionById(getSessionIdFromCookie(req));
    if (uploadingUser === null)
        throw new ErrorResponse("invalidSession", "The session ID in the cookie is invalid.");
    return uploadingUser;
}



async function getManyIncidents(arg: {
    paginationOptions: FindManyOptions;
    search?: string;
    includeArchived?: boolean;
    dateMin?: Date;
    dateMax?: Date;
    categoryId?: number;
    barangayId?: number;
    sortBy?: SortBy;
    sortAsc?: boolean;
}) {
    const parsedSortAsc = arg.sortAsc === undefined ? false : arg.sortAsc;

    const timeRange = { gte: arg.dateMin, lte: arg.dateMax };

    return await prismaClient.incident.findMany({
        ...arg.paginationOptions,

        where: {
            name: arg.search ? searchAlg(arg.search) : undefined,
            archived: arg.includeArchived === true ? undefined : false,
            categoryId: arg.categoryId,
            barangayId: arg.barangayId,
            OR: arg.dateMin !== undefined || arg.dateMax !== undefined ? [
                { reportTime: timeRange },
                { responseTime: timeRange },
                { fireOutTime: timeRange }
            ] : undefined
        },
        include: incidentInclude,
        orderBy: arg.sortBy === undefined ? incidentOrderBy : (
            arg.sortBy === "archived" ? { archived: toSortStr(parsedSortAsc) }
            : arg.sortBy === "name" ? { name: toSortStr(parsedSortAsc) }
            : arg.sortBy === "reportTime" ? { reportTime: toSortStr(parsedSortAsc) }
            : arg.sortBy === "responseTime" ? { responseTime: toSortStr(parsedSortAsc) }
            : arg.sortBy === "fireOutTime" ? { fireOutTime: toSortStr(parsedSortAsc) }
            : arg.sortBy === "barangay" ? { barangay: { name: toSortStr(parsedSortAsc) } }
            : arg.sortBy === "category" ? { category: { severity: toSortStr(parsedSortAsc) } }
            : arg.sortBy === "notes" ? { notes: toSortStr(parsedSortAsc) }
            : arg.sortBy === "createdBy" ? { createdBy: { username: toSortStr(parsedSortAsc) } }
            : arg.sortBy === "updatedBy" ? { updatedBy: { username: toSortStr(parsedSortAsc) } }
            : undefined
        ),
    });
}


export const incidentControllerList: base.ControllerList<
    SearchNameQueryParam &
    PageQueryParams &
    IncludeArchivedQueryParams & DateRangeQueryParams &
    CategoryQueryParams & BarangayQueryParams &
    SortByQueryParams
> = {
    queryParams: [
        createSearchNameQueryParam(),
        createPageQueryParams(),
        createIncludeArchivedQueryParam(), createDateRangeQueryParams(),
        createCategoryQueryParam(), createBarangayQueryParam(),
        createSortByQueryParam(), createSortAscQueryParam()
    ],



    get: base.generalGet(
        async (req) => await prismaClient.incident.findUnique({
            where: { id: req.id },
            include: incidentInclude
        })
    ),

    getMany: base.generalGetMany(
        async (req, validatedQuery) => {
            const pagination = base.paginate(validatedQuery.pageSize, validatedQuery.cursorId);

            const result = await getManyIncidents({
                paginationOptions: pagination.findManyOptions,
                search: validatedQuery.search,
                includeArchived: validatedQuery.includeArchived,
                dateMin: validatedQuery.dateMin,
                dateMax: validatedQuery.dateMax,
                categoryId: validatedQuery.categoryId,
                barangayId: validatedQuery.barangayId,
                sortBy: validatedQuery.sortBy,
                sortAsc: validatedQuery.sortAsc
            });

            return {
                data: result,
                pageInfo: pagination.getPageInfo(result)
            };
        },

        true
    ),

    post: base.generalPost(
        IncidentUpsertUtils.inst,
        async (req, body) => {
            const uploadingUser = await getUserFromRequest(req);

            return await prismaClient.incident.create({
                data: {
                    ...IncidentUpsertUtils.inst.getCreateQuery(req, body),
                    createdBy: { connect: { id: uploadingUser.user.id } },
                    updatedBy: { connect: { id: uploadingUser.user.id } }
                },
                include: incidentInclude
            });
        }
    ),

    patch: base.generalPatch(
        IncidentUpsertUtils.inst,
        async (req, body) => {
            const uploadingUser = await getUserFromRequest(req);

            return await prismaClient.incident.update({
                where: { id: req.id },
                data: {
                    ...IncidentUpsertUtils.inst.getUpdateQuery(req, body),
                    updatedBy: { connect: { id: uploadingUser.user.id } }
                },
                include: incidentInclude
            });
        }
    ),

    delete: async () => {
        throw new ErrorResponse(
            "cannotDeleteIncident",
            "You cannot delete incidents, only archive them. You can instead send a PATCH request with {'archived': true}."
        );
    }
};


export async function populateRandomIncidents() {
    if (!env.DEVELOPMENT_MODE) return;

    const incidentCount = await prismaClient.incident.count();
    if (incidentCount !== 0) return;

    logger?.error("USING DEVELOPMENT MODE, populating empty incidents..");

    const barangays = await prismaClient.barangay.findMany();
    const possibleCauses = [
        "Arson",
        "Electrical malfunction",
        "Unattended cooking",
        "Cigarette left burning",
        "Overloaded electrical circuit",
        "Heater left too close to flammable material",
        "Lightning strike",
        "Spontaneous combustion",
        "Combustible materials near heat source",
        "Improper disposal of ashes",
        "Children playing with fire",
        "Candle left unattended",
        "Gas leak ignition",
        "Chimney fire",
        "Vehicle accident",
        "Industrial equipment failure",
        "Flammable liquid spill",
        "Fireworks misuse",
        "Barbecue grill malfunction",
        "Clothes dryer lint build-up",
        "Malfunctioning battery",
        "Chemical reaction",
        "Sunlight magnified through glass",
        "Space heater tipped over",
        "Improper welding or cutting",
        "Portable generator mishap",
        "Uncontrolled burn or bonfire",
        "Improperly stored chemicals",
        "Sparks from power tools",
        "Electrical arcing",
        "Overheated appliance",
        "Negligence with incense",
        "Electrical storm surge",
        "Careless smoking in bed",
        "Wood stove misuse"
    ];
    const possibleStructures = [
        "Single-family home",
        "Apartment building",
        "High-rise residential building",
        "Mobile home",
        "Garage",
        "Barn",
        "Warehouse",
        "Factory",
        "Retail store",
        "Supermarket",
        "Restaurant",
        "Hotel",
        "Hospital",
        "School",
        "University building",
        "Church",
        "Mosque",
        "Temple",
        "Office building",
        "Bank",
        "Fire station",
        "Police station",
        "Library",
        "Theater",
        "Gas station",
        "Power plant",
        "Parking garage",
        "Airport terminal",
        "Train station",
        "Subway station",
        "Stadium",
        "Convention center",
        "Greenhouse",
        "Construction site",
        "Boathouse"
    ];
    const users = await prismaClient.user.findMany();
    const categories = await prismaClient.category.findMany();

    const startTime = new Date("2024-12-25");
    const endTime = new Date("2025-08-25");
    function randomDate() {
        return new Date(startTime.getTime() + Math.random() * (endTime.getTime() - startTime.getTime()));
    }


    const locationLatStart = 16.631909898187242;
    const locationLongStart = 121.66548029513474;
    const locationLatEnd = 16.689797981187866;
    const locationLongEnd = 121.78152337708087;


    function randomItem<T>(array: T[]) {
        return array[_.random(array.length - 1)];
    }

    const incidents: Prisma.IncidentCreateInput[] = [];

    for (let i = 0; i < 30; i++) {
        incidents.push({
            archived: Math.random() < 0.2,
            name: `Incident ${i}`,
            reportTime: randomDate(),
            location: { create: {
                latitude: Math.random() * (locationLatEnd - locationLatStart) + locationLatStart,
                longitude: Math.random() * (locationLongEnd - locationLongStart) + locationLongStart,
            } },
            barangay: { connect: { id: randomItem(barangays).id } },
            causes: (() => {
                const amount = _.random(10);
                const causes = [];
                for (let i = 0; i < amount; i++) causes.push(randomItem(possibleCauses));
                return causes;
            })(),
            responseTime: randomDate(),
            fireOutTime: randomDate(),
            structuresInvolved: (() => {
                const amount = _.random(10);
                const structures = [];
                for (let i = 0; i < amount; i++) structures.push(randomItem(possibleStructures));
                return structures;
            })(),
            notes: "Automatically generated as test.",
            category: { connect: { id: randomItem(categories).id } },
            createdBy: { connect: { id: randomItem(users).id } },
            updatedBy: { connect: { id: randomItem(users).id } },
        });
    }

    await prismaClient.$transaction(
        incidents.map(incident => prismaClient.incident.create({
            data: incident
        })
    ));
    
    logger?.warn("Populated incidents.");
}