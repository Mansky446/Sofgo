import { router } from "./routes/holder.ts";
import "./routes/surah.ts";
import "./routes/ayat.ts";
import "./routes/user.ts";

async function main() {
    try {
        await router.writeInto("src/routes/route.ts", `
            import { MAX_SURAH, SurahRepo } from "../models/surah.ts";
            import { MAX_AYAT, AyatRepo } from "../models/ayat.ts";
            import { getCachePath } from "../models/cache.ts";
            import { UserRepo } from "../models/user.ts";
        `);
    } catch (e) {
        if (e instanceof Error) {
            console.error(`Rerouting error: ${e.message}`);
        }
        return;
    }
    console.log("Rerouting success");
}

main();