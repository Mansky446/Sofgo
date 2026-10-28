type Ayat = {
    text: string,
    arabText: string,
    indoText: string,
    audio: string,
    cache: string | null | Promise<string>
};

const MAX_AYAT = 6236;
const ayatCache: Ayat[] = new Array(MAX_AYAT);

class AyatRepo {
    constructor() {}

    static get(id: number): Ayat {
        return ayatCache[id];
    }
    
    static gets(): Ayat[] {
        return ayatCache;
    }

    static insert(id: number, text: string, arabText: string, indoText: string, audio: string) {
        ayatCache[id] = {
            text,
            arabText,
            indoText,
            audio,
            cache: null
        };
    }

    static updateCache(id: number, cache: string | null | Promise<string>) {
        ayatCache[id].cache = cache;
    }
}

export { type Ayat, MAX_AYAT, AyatRepo };