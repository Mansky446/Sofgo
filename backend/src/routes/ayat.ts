import { MAX_SURAH, SurahRepo } from "../models/surah.ts";
import { MAX_AYAT, AyatRepo } from "../models/ayat.ts";
import { RESPONSE_404, RESPONSE_500, RESPONSE_INIT_200, router } from "./holder.ts";
import { getCachePath } from "../models/cache.ts";

router.get("/surah/:surahId/init-ayat", (surahId: string): Response => {
    const csurahId = parseInt(surahId);
    if (Number.isNaN(csurahId) || csurahId < 0 || csurahId >= MAX_SURAH) {
        return RESPONSE_404();
    }

    const surah = SurahRepo.get(csurahId);
    const ayats = AyatRepo.gets();
    const fetchedCount = Math.min(10, surah.ayatCount);
    const data = new Array(fetchedCount);

    for (let i = 0, j = surah.ayatStart; i < fetchedCount; i++, j++) {
        const ayat = ayats[j];
        data[i] = { id: j, no: i + 1, text: ayat.text, arabText: ayat.arabText, indoText: ayat.indoText, isFavorite: false, bookmarks: [] };
    }

    return new Response(
        JSON.stringify({
            ayatCount: surah.ayatCount,
            fetchedCount,
            data
        }),
        RESPONSE_INIT_200
    );
});

router.get("/surah/:surahId/ayat", (search: URLSearchParams, surahId: string): Response => {
    const csurahId = parseInt(surahId);
    if (Number.isNaN(csurahId) || csurahId < 0 || csurahId >= MAX_SURAH) {
        return RESPONSE_404();
    }

    const rawFrom = search.get("from");
    const rawLimit = search.get("limit");
    const surah = SurahRepo.get(csurahId);

    let from = 0;
    if (rawFrom != null) {
        const cfrom = parseInt(rawFrom);
        from = Number.isNaN(cfrom) ? from : cfrom;
        if (from >= surah.ayatCount) {
            new Response(
                JSON.stringify({
                    fetchedCount: 0,
                    data: []
                }),
                RESPONSE_INIT_200
            );
        }
    }

    let limit = 15;
    if (rawLimit != null) {
        const climit = parseInt(rawLimit);
        limit = Number.isNaN(climit) || limit < climit ? limit : climit; 
        if (limit <= 0) {
            new Response(
                JSON.stringify({
                    fetchedCount: 0,
                    data: []
                }),
                RESPONSE_INIT_200
            );
        }
    }

    const ayats = AyatRepo.gets();
    const fetchedCount = Math.min(limit, surah.ayatCount - from);
    const data = new Array(fetchedCount);

    for (let i = 0, j = surah.ayatStart + from; i < fetchedCount; i++, j++) {
        const ayat = ayats[j];
        data[i] = { id: j, no: i + from + 1, text: ayat.text, arabText: ayat.arabText, indoText: ayat.indoText, isFavorite: false, bookmarks: [] };
    }

    return new Response(
        JSON.stringify({
            fetchedCount,
            data
        }),
        RESPONSE_INIT_200
    );
});

router.get("/stream-ayat/:id", async (id: string): Promise<Response> => {
    const cid = parseInt(id);
    if (Number.isNaN(cid) || cid < 0 || cid >= MAX_AYAT) {
        return RESPONSE_404();
    }

    const ayat = AyatRepo.get(cid);
    const cache = ayat.cache;
    let path: string;

    if (cache == null) {
        const promise = new Promise<string>((resolve, reject) => {
            const path = getCachePath(`${id}.mp3`);
            
            // deno-lint-ignore no-explicit-any
            (async (resolve: (value: string) => void, reject: (reason: any) => void, path: string, rawPath: string, id: number) => {
                try {
                    const info = await Deno.stat(path);
                    if (info.isFile) {
                        AyatRepo.updateCache(id, path);
                        resolve(path);
                        return;
                    }
                } catch (e) {
                    if (!(e instanceof Deno.errors.NotFound)) {
                        reject(e);
                        return;
                    }
                }
                
                try {
                    using file = await Deno.open(path, { write: true, create: true });
                    const res = await fetch(rawPath);
                    if (!res.ok || !res.body) {
                        reject(new Error(`Failed to fetch '${rawPath}' from API`));
                        return;
                    }
                    await res.body.pipeTo(file.writable, { preventClose: true });
                } catch (e) {
                    reject(e);
                    return;
                }
                
                AyatRepo.updateCache(id, path);
                resolve(path);
            })(resolve, reject, path, ayat.audio, cid);
        });

        AyatRepo.updateCache(cid, promise);
        try {
            path = await promise;
        } catch (e) {
            if (e instanceof Error) {
                console.error(`Error: ${e.message}`);
            }
            return RESPONSE_500();
        }
    } else if (typeof cache == "string") {
        path = cache;
    } else {
        try {
            path = await cache;
        } catch (e) {
            if (e instanceof Error) {
                console.error(`Error: ${e.message}`);
            }
            return RESPONSE_500();
        }
    }

    try {
        const file = await Deno.open(path, { read: true });
        return new Response(file.readable, {
            status: 200,
            statusText: "OK",
            headers: {
                "Content-Type": "audio/mpeg"
            }
        });
    } catch (_e) {
        return RESPONSE_500();
    }
});