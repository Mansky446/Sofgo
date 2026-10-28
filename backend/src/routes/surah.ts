import { MAX_SURAH, SurahRepo } from "../models/surah.ts";
import { RESPONSE_404, RESPONSE_INIT_200, router } from "./holder.ts";

router.get("/init-surah", (): Response => {
    const surahs = SurahRepo.gets();
    const data = new Array(20);

    for (let i = 0; i < 20; i++) {
        const surah = surahs[i];
        data[i] = { id: i, no: i + 1, name: surah.name, arabName: surah.arabName, ayatCount: surah.ayatCount };
    }

    return new Response(
        JSON.stringify({
            surahCount: MAX_SURAH,
            fetchedCount: 20,
            data
        }),
        RESPONSE_INIT_200
    );
});

router.get("/surah", (search: URLSearchParams): Response => {
    const rawFrom = search.get("from");
    const rawLimit = search.get("limit");

    let from = 0;
    if (rawFrom != null) {
        const cfrom = parseInt(rawFrom);
        from = Number.isNaN(cfrom) ? from : cfrom;
        if (from >= MAX_SURAH) {
            new Response(
                JSON.stringify({
                    fetchedCount: 0,
                    data: []
                }),
                RESPONSE_INIT_200
            );
        }
    }

    let limit = 30;
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

    const fetchedCount = Math.min(MAX_SURAH - from, limit);
    const surahs = SurahRepo.gets();
    const data = new Array(fetchedCount);

    for (let i = 0, j = from; i < fetchedCount; i++, j++) {
        const surah = surahs[j];
        data[i] = { id: j, no: j + 1, name: surah.name, arabName: surah.arabName, ayatCount: surah.ayatCount };
    }

    return new Response(
        JSON.stringify({
            fetchedCount,
            data
        }),
        RESPONSE_INIT_200
    );
});

router.get("/surah/:id", (id: string): Response => {
    const cid = parseInt(id);
    if (Number.isNaN(cid) || cid < 0 || cid >= MAX_SURAH) {
        return RESPONSE_404();
    }

    const surah = SurahRepo.get(cid);
    return new Response(
        JSON.stringify({
            no: cid + 1,
            name: surah.name,
            arabName: surah.arabName,
            ayatCount: surah.ayatCount,
            from: surah.from,
            meaning: surah.meaning
        }),
        RESPONSE_INIT_200
    );
});