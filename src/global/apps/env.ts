import "dotenv/config";
import { parseEnvironmentVariables } from "@absxn/process-env-parser";

const result = parseEnvironmentVariables({
    PORT: {
        parser: parseInt,
        default: 7510
    },
    HOST: { default: "localhost" },
    ML_SERVER_URL: {},
    DATABASE_URL: {},
    SESSION_SECRET: {},
    SESSION_LENGTH_HOURS: { 
        parser: (x) => {
            const hours = Number(x);
            return hours * 60 * 60 * 1000;
        },
        default: 3.6e+6
    },
    DEVELOPMENT_MODE: { parser: x => x === "true", default: false }
});

if (!result.success) throw new Error("Invalid .env file, or you didn't make one yet.");

export const env = result.env;