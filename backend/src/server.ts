import { MysqlClientPool } from "@db/mysql";

type Nserver = {
    host: string,
    port: number,
    client: Deno.HttpServer<Deno.NetAddr> | null,
};

type NDB = {
    name: string,
    port: number,
    user: string,
    pass: string,
    clientPool: MysqlClientPool
};

function createServer(): Nserver {
    const host = Deno.env.get("HOST") ?? "127.0.0.1";
    const port = Deno.env.get("PORT") ?? "Unknown";
    const cport = parseInt(port);
    
    return {
        host,
        port: Number.isNaN(cport) ? 4020 : cport,
        client: null
    };
}

async function shutdown(server: Nserver, db: NDB) {
    if (server.client) {
        try {
            await server.client.shutdown();
        } catch (e) {
            if (e instanceof Error) {
                console.error(`Failed to open db connection: ${e.message}`);
            } else {
                console.error(`Failed to open db connection ${e}`);
            }
        }
    }
    await db.clientPool.close();
}

async function openDB(server: Nserver): Promise<NDB> {
    const name = Deno.env.get("DB_NAME") ?? "Umknown";
    const port = Deno.env.get("DB_PORT") ?? "Umknown";
    const user = Deno.env.get("DB_USER") ?? "Umknown";
    const pass = Deno.env.get("DB_PASS") ?? "";
    const cport = parseInt(port);
    const aport = Number.isNaN(cport) ? 3306 : cport;

    const db: NDB = {
        name,
        port: aport,
        user,
        pass,
        clientPool: new MysqlClientPool(`mysql://${user}:${pass}@${server.host}:${aport}/${name}`, { maxSize: 10 })
    };

    try {
        await db.clientPool.connect();
    } catch (e) {
        throw e;
    }
    return db;
}

function openHTTP(server: Nserver, db: NDB, handler: (req: Request) => Promise<Response>) {
    server.client = Deno.serve({
        port: server.port,
        hostname: server.host,
        onListen: () => { console.log(`Server listen on http://${server.host}:${server.port}`); }
    }, handler);

    server.client.finished.then(async () => {
        await db.clientPool.close();
    });

    Deno.addSignalListener("SIGINT", async () => {
        await shutdown(server, db);
    });
}

export {
    type Nserver,
    type NDB,
    createServer,
    openDB,
    openHTTP,
    shutdown
};