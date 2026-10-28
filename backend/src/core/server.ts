import * as router from "../router.ts";

type Server = {
    host: string,
    port: number,
    dbName: string,
    dbPort: number,
    dbUser: string,
    dbPass: string,
    reqs: router.RequestData[],
    workers: Worker[]
};

function newServer(): Server {
    const host = Deno.env.get("HOST") ?? "127.0.0.1";
    const port = Deno.env.get("PORT") ?? "Unknown";
    const dbName = Deno.env.get("DB_NAME") ?? "Umknown";
    const dbPort = Deno.env.get("DB_PORT") ?? "Umknown";
    const dbUser = Deno.env.get("DB_USER") ?? "Umknown";
    const dbPass = Deno.env.get("DB_PASS") ?? "";

    const cport = Number(port);
    const cDbPort = Number(dbPort);

    return {
        host,
        port: Number.isNaN(cport) ? 4020 : cport,
        dbName,
        dbPort: Number.isNaN(cDbPort) ? 3306 : cDbPort,
        dbUser,
        dbPass,
        reqs: [],
        workers: []
    };
}

function listen(s: Server, r: router.Route) {
    const workersCount = Math.max(navigator.hardwareConcurrency, 3) >>> 1;
    const fnString = router.compile(r);
    
    for (let i = 0; i < workersCount; i++) {
        const worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });

        worker.postMessage({
            fnString, fnString,
            dbName: s.dbName,
            dbPort: s.dbPort,
            dbUser: s.dbUser,
            dbPass: s.dbPass
        });


    }

    Deno.serve(
        {
            port: s.port,
            hostname: s.host,
            onListen: () => {
                console.log(`Server listen on http://${s.host}:${s.port}`);
            }
        },
        ()
    );
}

export type { Server };
export { newServer, listen };