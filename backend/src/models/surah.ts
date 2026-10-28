type Surah = {
    name: string,
    arabName: string,
    ayatCount: number,
    ayatStart: number,
    from: string,
    meaning: string
};

const MAX_SURAH = 114;
const surahCache: Surah[] = new Array(MAX_SURAH);

class SurahRepo {
    constructor() {}

    static get(id: number): Surah {
        return surahCache[id];
    }
    
    static gets(): Surah[] {
        return surahCache;
    }

    static insert(id: number, name: string, arabName: string, ayatCount: number, ayatStart: number, from: string, meaning: string) {
        surahCache[id] = {
            name,
            arabName,
            ayatCount,
            ayatStart,
            from,
            meaning
        };
    }
}

export { type Surah, MAX_SURAH, SurahRepo };