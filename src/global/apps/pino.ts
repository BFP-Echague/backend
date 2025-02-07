import pino from "pino";
import pp from "pino-pretty";



function createFileStream(destWithoutFileExt: string) {
    return pino.multistream([
        {
            stream: pino.destination({
                dest: `${destWithoutFileExt}.log`,
                sync: true
            })
        },
        {
            stream: pp({
                colorize: false,
                destination: pino.destination({
                    dest: `${destWithoutFileExt}.pretty.log`,
                    sync: true
                })
            })
        }
    ]);
}


export const streams = pino.multistream([
    {
        stream: createFileStream("./logs/all")
    },
    {
        level: "warn",
        stream: pino.multistream([
            {
                stream: createFileStream("./logs/warn")
            },
            {
                stream: pp({
                    colorize: true,
                    destination: pino.destination({
                        dest: null,
                        sync: true
                    })
                })
            }
        ])
    },
    {
        level: "info",
        stream: createFileStream("./logs/info")
    }
]);



export let logger: pino.Logger | null = null;
export function setLogger(newLogger: pino.Logger) {
    logger = newLogger;
}