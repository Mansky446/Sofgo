import { initCache } from "./models/cache.ts";
import { createServer, type NDB, openDB, openHTTP, shutdown  } from "./server.ts";
import { compileRoute } from "./routes/route.ts";

// function printMemoryUsage() {
//     const mem = Deno.memoryUsage();
//     const toMB = (bytes: number) => (bytes / 1024 / 1024).toFixed(2);

//     console.log(`=== MEMORY MONITOR [${new Date().toLocaleTimeString()}] ===`);
//     console.log(`Total RAM USage (RSS)               : ${toMB(mem.rss)} MB`);
//     console.log(`Max Heap Allocation V8 (Total)      : ${toMB(mem.heapTotal)} MB`);
//     console.log(`Heap Used (Used)                    : ${toMB(mem.heapUsed)} MB`);
//     console.log(`External Memory (C++ / Rust)        : ${toMB(mem.external)} MB`);
//     console.log("================================================");
// }

async function main() {
    const server = createServer();
    let ndb: NDB | null = null;

    try {
        ndb = await openDB(server);
    } catch (e) {
        if (e instanceof Error) {
            console.log(`Failed to open db connection: ${e.message}`);
        }
        return;
    }

    try {
        await initCache();
    } catch (e) {
        if (e instanceof Error) {
            console.log(`Failed to initialize cache: ${e.message}`);
        }
        await shutdown(server, ndb);
        return;
    }

    openHTTP(server, ndb, compileRoute(server, ndb));
}

main();