import { z } from "zod";
import * as base from "./base";
import { env, ErrorResponse, prismaClient, SuccessResponse } from "@src/global/apps";
import { Prisma } from "@prisma/client";
import { incidentInclude, incidentOrderBy } from "@dbm/incident";
import axios from "axios";



interface ClusteringSettings {
    componentCount: number | null;
    clusterCountStart: number;
    clusterCountEnd: number | null;
}

const clusteringSettingsSchema: z.ZodType<ClusteringSettings> = z.object({
    componentCount: z.number().nullable(),
    clusterCountStart: z.number(),
    clusterCountEnd: z.number()
});



const feature_count = 2;
interface IncidentClusteringData {
    id: number;
    locationLatitude: number;
    locationLongitude: number;
}

interface ClusteringRequest {
    settings: ClusteringSettings;
    data: IncidentClusteringData[];
}



interface ClusterResult {
    clusterCount: number;
    labels: number[][];
    score: number;
}

const clusterResultSchema: z.ZodType<ClusterResult> = z.object({
    clusterCount: z.number(),
    labels: z.array(z.array(z.number())),
    score: z.number()
});

interface ClusteringResponse {
    clusterResults: ClusterResult[];
    optimalClusterCount: number;
}

const clusteringResponseSchema: z.ZodType<ClusteringResponse> = z.object({
    clusterResults: z.array(clusterResultSchema),
    optimalClusterCount: z.number()
});


interface FinalResult {
    incidents: Prisma.IncidentGetPayload<{ include: typeof incidentInclude }>[];
    clusterResults: {
        clusterCount: number;
        labels: number[][];
        score: number;
    }[];
    optimalClusterCount: number;
}


export const clusteringControllerList: base.ControllerList = {
    queryParams: [],

    post: async (req, res) => {
        const schemaParseResult = await clusteringSettingsSchema.safeParseAsync(req.body);
        if (!schemaParseResult.success) {
            throw ErrorResponse.fromParseErrors(schemaParseResult.error);
        }

        const settings = schemaParseResult.data;

        if (settings.componentCount === null) {
            settings.componentCount = feature_count;
        }
        if (settings.clusterCountEnd === null) {
            settings.clusterCountEnd = settings.clusterCountStart;
        }

        if (settings.clusterCountEnd > 100) {
            throw new ErrorResponse("clusterCountEndTooLarge", "clusterCountEnd must be less than or equal to 100.");
        }

        if (settings.componentCount > feature_count) {
            throw new ErrorResponse("largeComponentCount", "componentCount must be less than or equal to amount of features.");
        }
        if (settings.clusterCountStart > settings.clusterCountEnd) {
            throw new ErrorResponse("invalidClusterCountRange", "clusterCountStart must be less than or equal to clusterCountEnd.");
        }


        const data = await prismaClient.incident.findMany({
            include: incidentInclude,
            orderBy: incidentOrderBy,
        });

        if (settings.clusterCountEnd > data.length) {
            throw new ErrorResponse("clusterCountEndLargerThanIncidentCount", "clusterCountEnd must be less than or equal to the amount of incidents.");
        }

        const clusteringRequest: ClusteringRequest = {
            settings,
            data: data.map((incident) => ({
                id: incident.id,
                locationLatitude: incident.location.latitude.toNumber(),
                locationLongitude: incident.location.longitude.toNumber()
            }))
        };


        const clusteringResultResponse = await axios.post(`${env.ML_SERVER_URL}/cluster`, clusteringRequest);
        const clusteringResult = await clusteringResponseSchema.parseAsync(clusteringResultResponse.data);

        const result: FinalResult = {
            incidents: data,
            clusterResults: clusteringResult.clusterResults.map((clusterResult) => ({
                clusterCount: clusterResult.clusterCount,
                labels: clusterResult.labels,
                score: clusterResult.score
            })),
            optimalClusterCount: clusteringResult.optimalClusterCount
        };

        new SuccessResponse(result).sendResponse(res);
    }
};