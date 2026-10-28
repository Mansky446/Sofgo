import { MAX_SURAH, type Surah, SurahRepo } from "./surah.ts";
import { type Ayat, AyatRepo } from "./ayat.ts";

const CACHE_DIR = Deno.env.get("CACHE_DIR") ?? "cache";
const SURAH_META_FILE = "surah.json";
const AYAT_META_FILE = "ayat.json";

async function fetchFromAPI(): Promise<void> {
    const req = await fetch("https://equran.id/api/v2/surat");

    if (req.status != 200) {
        throw new Error("Failed to fetch from api for cache");
    }

    const json = await req.json();

    if (!("code" in json) || !("data" in json) || json.code != 200 || !Array.isArray(json.data)) {
        throw new Error("Api send error response");
    }

    const data: object[] = json.data;
    let c = 0;

    for (const rawSurah of data) {
        if (
            !("nomor" in rawSurah) ||
            !("nama" in rawSurah) ||
            !("namaLatin" in rawSurah) ||
            !("jumlahAyat" in rawSurah) ||
            !("tempatTurun" in rawSurah) ||
            !("arti" in rawSurah) ||
            typeof rawSurah.nomor != "number" ||
            typeof rawSurah.nama != "string" ||
            typeof rawSurah.namaLatin != "string" ||
            typeof rawSurah.jumlahAyat != "number" ||
            typeof rawSurah.tempatTurun != "string" ||
            typeof rawSurah.arti != "string" ||
            rawSurah.nomor < 1 ||
            rawSurah.nomor > MAX_SURAH
        ) {
            throw new Error("Invalid format of surah");
        }
        
        const lastC = c;
        const req = await fetch(`https://equran.id/api/v2/surat/${rawSurah.nomor}`);

        if (req.status != 200) {
            throw new Error("Failed to fetch from api for cache");
        }

        const json = await req.json();

        if (!("code" in json) || !("data" in json) || !("ayat" in json.data) || json.code != 200 || !Array.isArray(json.data.ayat)) {
            throw new Error("Api send error response");
        }

        const rawAyats: object[] = json.data.ayat;

        for (const rawAyat of rawAyats) {
            if (
                !("nomorAyat" in rawAyat) ||
                !("teksArab" in rawAyat) ||
                !("teksLatin" in rawAyat) ||
                !("teksIndonesia" in rawAyat) ||
                !("audio" in rawAyat) ||
                typeof rawAyat.nomorAyat != "number" ||
                typeof rawAyat.teksArab != "string" ||
                typeof rawAyat.teksLatin != "string" ||
                typeof rawAyat.teksIndonesia != "string" ||
                typeof rawAyat.audio != "object" ||
                rawAyat.audio == null ||
                !("01" in rawAyat.audio) ||
                typeof rawAyat.audio["01"] != "string" ||
                rawAyat.nomorAyat < 1 ||
                rawAyat.nomorAyat > rawSurah.jumlahAyat
            ) {
                throw new Error("Invalid format of ayat");
            }

            AyatRepo.insert(
                c++,
                rawAyat.teksLatin,
                rawAyat.teksArab,
                rawAyat.teksIndonesia,
                rawAyat.audio["01"]
            );
        }

        SurahRepo.insert(
            rawSurah.nomor - 1, 
            rawSurah.namaLatin,
            rawSurah.nama,
            rawSurah.jumlahAyat,
            lastC,
            rawSurah.tempatTurun,
            rawSurah.arti
        );
        console.log(`Fetch surah ${rawSurah.namaLatin} done`);
    }
}

async function fetchFromLocal(): Promise<void> {
    const surahMetaPath = `${CACHE_DIR}/${SURAH_META_FILE}`;
    const ayatMetaPath = `${CACHE_DIR}/${AYAT_META_FILE}`;

    try {
        const surahMetaFileText = await Deno.readTextFile(surahMetaPath);
        const ayatMetaFileText = await Deno.readTextFile(ayatMetaPath);

        const surahMetaFileJson: object[] = JSON.parse(surahMetaFileText);
        const ayatMetaFileJson: object[] = JSON.parse(ayatMetaFileText);
        
        if (!Array.isArray(surahMetaFileJson) || !Array.isArray(ayatMetaFileJson)) {
            throw new Error("Invalid format from local");
        }

        let i = 0;
        let k = 0;

        for (const rawSurah of surahMetaFileJson) {
            if (
                typeof rawSurah != "object" ||
                rawSurah == null ||
                !("name" in rawSurah) ||
                !("arabName" in rawSurah) ||
                !("ayatCount" in rawSurah) ||
                !("ayatStart" in rawSurah) ||
                !("from" in rawSurah) ||
                !("meaning" in rawSurah) ||
                typeof rawSurah.name != "string" ||
                typeof rawSurah.arabName != "string" ||
                typeof rawSurah.ayatCount != "number" ||
                typeof rawSurah.ayatStart != "number" ||
                typeof rawSurah.from != "string" ||
                typeof rawSurah.meaning != "string"
            ) {
                throw new Error("Invalid format of surah");
            }

            let j = 0;

            for (; j < rawSurah.ayatCount; j++) {
                const rawAyat = ayatMetaFileJson[rawSurah.ayatStart + j];

                if (
                    !("text" in rawAyat) ||
                    !("arabText" in rawAyat) ||
                    !("indoText" in rawAyat) ||
                    !("audio" in rawAyat) ||
                    typeof rawAyat.text != "string" ||
                    typeof rawAyat.arabText != "string" ||
                    typeof rawAyat.indoText != "string" ||
                    typeof rawAyat.audio != "string"
                ) {
                    throw new Error("Invalid format of ayat");
                }

                AyatRepo.insert(
                    rawSurah.ayatStart + j,
                    rawAyat.text,
                    rawAyat.arabText,
                    rawAyat.indoText,
                    rawAyat.audio
                );
            }

            SurahRepo.insert(
                i++,
                rawSurah.name,
                rawSurah.arabName,
                rawSurah.ayatCount,
                rawSurah.ayatStart,
                rawSurah.from,
                rawSurah.meaning
            );
            k += j;
        }
    } catch (e) {
        throw e;
    }
}

async function initCache(): Promise<void> {
    try {
        const info = await Deno.stat(CACHE_DIR);
        if (!info.isDirectory) {
            throw new Error(`Cache folder ${CACHE_DIR} is not directory`);
        }
    } catch (e) {
        if (e instanceof Deno.errors.NotFound) {
            await Deno.mkdir(CACHE_DIR, { recursive: true });
        } else {
            throw new Error(`Failed to initialize cache folder ${e}`);
        }
    }

    const surahMetaPath = `${CACHE_DIR}/${SURAH_META_FILE}`;
    const ayatMetaPath = `${CACHE_DIR}/${AYAT_META_FILE}`;

    let foundData = true;

    try {
        const surahMetaFile = await Deno.open(surahMetaPath, { read: true, write: true, create: true });
        const surahMetaFileInfo = await surahMetaFile.stat();

        if (surahMetaFileInfo.size == 0) {
            foundData = false;
        }

        surahMetaFile.close();

        const ayatMetaFile = await Deno.open(ayatMetaPath, { read: true, write: true, create: true });
        const ayatMetaFileInfo = await ayatMetaFile.stat();

        if (ayatMetaFileInfo.size == 0) {
            foundData = false;
        }

        ayatMetaFile.close();
    } catch (e) {
        throw e;
    }

    if (foundData) {
        try {
            await fetchFromLocal();
            return;
        } catch (e) {
            if (e instanceof Error) {
                console.log(`Fail to fetch from local: ${e.message}`);
            }
        }
    }
    
    try {
        await fetchFromAPI()
    } catch (e) {
        throw e;
    }
    
    try {
        await Deno.writeTextFile(surahMetaPath, JSON.stringify(SurahRepo.gets()));
        await Deno.writeTextFile(ayatMetaPath, JSON.stringify(AyatRepo.gets()));
    } catch (e) {
        throw e;
    }

    console.log("Cache stored to local");
}

function getCachePath(path: string): string {
    return `${CACHE_DIR}/${path}`;
}

export { type Surah, type Ayat, initCache, getCachePath }