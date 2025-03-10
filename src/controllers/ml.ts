import { z } from "zod";
import * as base from "./base";
import { env, ErrorResponse, prismaClient, SuccessResponse } from "@src/global/apps";
import { Prisma } from "@prisma/client";
import { incidentInclude, incidentOrderBy } from "@dbm/incident";
import axios from "axios";



interface ClusteringSettings {
    componentCount: number;
    clusterCountStart: number;
    clusterCountEnd: number;
}

const clusteringSettingsSchema: z.ZodType<ClusteringSettings> = z.object({
    componentCount: z.number(),
    clusterCountStart: z.number(),
    clusterCountEnd: z.number()
});



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
    clusterResults: {
        clusterCount: number;
        labels: Prisma.IncidentGetPayload<{ include: typeof incidentInclude }>[][];
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

        const data = await prismaClient.incident.findMany({
            include: incidentInclude,
            orderBy: incidentOrderBy,
        });

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
            clusterResults: clusteringResult.clusterResults.map((clusterResult) => ({
                clusterCount: clusterResult.clusterCount,
                labels: clusterResult.labels.map(
                    cluster => cluster.map(
                        id => {
                            const found = data.find(incident => incident.id === id);
                            if (found === undefined) throw new Error("ID not found in list of data");
                            return found;
                        }
                    )
                ),
                score: clusterResult.score
            })),
            optimalClusterCount: clusteringResult.optimalClusterCount
        };

        new SuccessResponse(result).sendResponse(res);
    }
};