import { MysqlClient } from "@db/mysql";
import { createServer } from "./server.ts";
import { UserRepo } from "./models/user.ts";
import { FavoriteRepo } from "./models/favorite.ts";

async function main() {
    const server = createServer();

    let db: MysqlClient;

    {
        const name = Deno.env.get("DB_NAME") ?? "Umknown";
        const port = Deno.env.get("DB_PORT") ?? "Umknown";
        const user = Deno.env.get("DB_USER") ?? "Umknown";
        const pass = Deno.env.get("DB_PASS") ?? "";
        const cport = parseInt(port);
        const aport = Number.isNaN(cport) ? 3306 : cport;

        db = new MysqlClient(`mysql://${user}:${pass}@${server.host}:${aport}/${name}`);
    }

    try {
        await db.connect();
    } catch (e) {
        if (e instanceof Error) {
            console.log(`Migration failed: ${e.message}`);
        }
        return;
    }

    try {
        console.log("Dropping favorites table");
        await FavoriteRepo.drop(db);
        console.log("Dropping users table");
        await UserRepo.drop(db);

        console.log("Creating users table");
        await UserRepo.create(db);
        console.log("Creating favorites table");
        await FavoriteRepo.create(db);

        console.log("Migration success");
    } catch (e) {
        if (e instanceof Error) {
            console.log(`Migration failed: ${e.message}`);
        }
    }

    await db.close();
}

main();