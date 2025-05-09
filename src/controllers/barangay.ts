import { prismaClient } from "@src/global/apps";
import * as base from "./base";
import { logger } from "@src/global/apps";
import { searchAlg, barangayInclude, barangayOrderBy } from "@dbm";
import { BarangayUpsertUtils } from "@src/upsert";
import { createSearchNameQueryParam, SearchNameQueryParam } from "./base";


export const barangayControllerList: base.ControllerList<SearchNameQueryParam> = {
    queryParams: [createSearchNameQueryParam()],



    get: base.generalGet(
        async (req) => await prismaClient.barangay.findUnique({
            where: { id: req.id },
            include: barangayInclude
        })
    ),

    getMany: base.generalGetMany(
        async (req, validatedQuery) => await prismaClient.barangay.findMany({
            where: { name: validatedQuery.search ? searchAlg(validatedQuery.search) : undefined },
            include: barangayInclude,
            orderBy: barangayOrderBy
        })
    ),

    post: base.generalPost(
        BarangayUpsertUtils.inst,
        async (req, body) => await prismaClient.barangay.create({
            data: BarangayUpsertUtils.inst.getCreateQuery(req, body),
            include: barangayInclude
        })
    ),

    patch: base.generalPatch(
        BarangayUpsertUtils.inst,
        async (req, body) => await prismaClient.barangay.update({
            where: { id: req.id },
            data: BarangayUpsertUtils.inst.getUpdateQuery(req, body),
            include: barangayInclude
        })
    ),

    delete: base.generalDelete(
        async (req) => await prismaClient.barangay.delete({
            where: { id: req.id },
            include: barangayInclude
        })
    )
};



export async function ensureBarangays() {
    const barangayCount = await prismaClient.barangay.count();
    if (barangayCount !== 0) return;

    logger?.error("No barangays found. Populating barangays with default Echague barangays...");

    const barangays = [
        "Cabugao",
        "San Fabian",
        "Silauan Norte",
        "Silauan Sur",
        "Taggappan",
        "Soyung",
        "Angoluan",
        "Annafunan",
        "Arabiat",
        "Aromin",
        "Babaran",
        "Bacradal",
        "Benguet",
        "Buneg",
        "Busilelao",
        "Caniguing",
        "Carulay",
        "Castillo",
        "Dammang East",
        "Dammang West",
        "Diasan",
        "Dicaraoyan",
        "Dugayong",
        "Fugu",
        "Garit Norte",
        "Garit Sur",
        "Gucab",
        "Gumbaoan",
        "Ipil",
        "Libertad",
        "Mabbayad",
        "Mabuhay",
        "Madadamian",
        "Magleticia",
        "Malibago",
        "Maligaya",
        "Malitao",
        "Narra",
        "Nilumisu",
        "Pag-asa",
        "Pangal Norte",
        "Pangal Sur",
        "Rumang-ay",
        "Salay",
        "Salvacion",
        "San Antonio Ugad",
        "San Antonio Minit",
        "San Carlos",
        "San Felipe",
        "San Juan",
        "San Manuel",
        "San Miguel",
        "San Salvador",
        "Sta. Ana",
        "Santa Cruz",
        "Sta. Maria",
        "Santa Monica",
        "Santo Domingo",
        "Sinabbaran",
        "Tuguegarao",
        "Villa Campo",
        "Villa Fermin",
        "Villa Rey",
        "Villa Victoria"
    ];

    await prismaClient.barangay.createMany({
        data: barangays.map(barangay => ({
            name: barangay
        }))
    });
    logger?.warn(`Populated. Added barangays: ${barangays}`);
}