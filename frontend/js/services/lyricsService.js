/**
 * Lyrics Service for Vibentra
 * Powered by LRCLIB (SimpMusic Provider) & Fallback Providers
 * Supports Real-time Synced Lyrics (.lrc), Plain Text, Romanization (Sing-Along), and Multilingual Translation
 */
class LyricsService {
    constructor() {
        this.cache = new Map();
        this.translationCache = new Map();
        this.activeSyncedLines = [];
        this.activeTrackId = null;
        this.lastActiveLineIndex = -1;
    }

    cleanTitle(title) {
        if (!title) return '';
        return title
            .replace(/\(Official Audio\)/gi, '')
            .replace(/\(Official Music Video\)/gi, '')
            .replace(/\(Official Video\)/gi, '')
            .replace(/\(Official Lyric Video\)/gi, '')
            .replace(/\(Lyric Video\)/gi, '')
            .replace(/\(Official\)/gi, '')
            .replace(/\(Lyrics\)/gi, '')
            .replace(/\[Lyric Video\]/gi, '')
            .replace(/\[Lyrics\]/gi, '')
            .replace(/\[4K HD\]/gi, '')
            .replace(/\[HD\]/gi, '')
            .replace(/\(from "[^"]+"\)/gi, '')
            .replace(/\(from '[^']+'\)/gi, '')
            .replace(/\s*-\s*Official.*$/gi, '')
            .replace(/\|.*$/g, '')
            .replace(/feat\..*$/gi, '')
            .replace(/ft\..*$/gi, '')
            .trim();
    }

    cleanArtist(artist) {
        if (!artist) return '';
        return artist
            .replace(/Vibentra/gi, '')
            .replace(/YouTube Music/gi, '')
            .replace(/ - Topic$/gi, '')
            .replace(/VEVO$/gi, '')
            .split(',')[0]
            .split('&')[0]
            .split('feat.')[0]
            .split('ft.')[0]
            .trim();
    }

    parseLrc(lrcText) {
        if (!lrcText) return [];
        const lines = lrcText.split('\n');
        const result = [];
        const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;

        for (const line of lines) {
            const match = timeRegex.exec(line);
            if (match) {
                const minutes = parseInt(match[1], 10);
                const seconds = parseInt(match[2], 10);
                const msStr = match[3].padEnd(3, '0').substring(0, 3);
                const ms = parseInt(msStr, 10);
                const timeInSeconds = minutes * 60 + seconds + (ms / 1000);
                const text = line.replace(timeRegex, '').trim();
                result.push({ time: timeInSeconds, text: text || '♪' });
            }
        }

        return result.sort((a, b) => a.time - b.time);
    }

    async fetchLyrics(track) {
        if (!track || (!track.title && !track.name)) return null;

        const rawTitle = track.title || track.name || '';
        const rawArtist = track.artist || track.primaryArtists || '';
        const cacheKey = track.id || `${rawTitle}_${rawArtist}`;

        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        const title = this.cleanTitle(rawTitle);
        const artist = this.cleanArtist(rawArtist);

        console.log(`[LyricsService] Fetching lyrics for "${title}" by "${artist}"...`);

        // 1. Direct LRCLIB Query
        try {
            let url = `https://lrclib.net/api/get?track_name=${encodeURIComponent(title)}&artist_name=${encodeURIComponent(artist)}`;
            if (track.duration) {
                const parts = String(track.duration).split(':');
                if (parts.length === 2) {
                    const secs = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
                    if (!isNaN(secs) && secs > 0) url += `&duration=${secs}`;
                }
            }

            const res = await fetch(url, {
                headers: { 'User-Agent': 'VibentraApp/1.2.0 (https://vibentra.vercel.app)' }
            });

            if (res.ok) {
                const data = await res.json();
                if (data && (data.syncedLyrics || data.plainLyrics)) {
                    const result = {
                        isSynced: !!(data.syncedLyrics && data.syncedLyrics.trim().length > 0),
                        syncedLines: data.syncedLyrics ? this.parseLrc(data.syncedLyrics) : [],
                        plainText: data.plainLyrics || (data.syncedLyrics ? data.syncedLyrics.replace(/\[\d{2}:\d{2}\.\d{2,3}\]/g, '').trim() : ''),
                        source: 'LRCLIB (SimpMusic Provider)'
                    };
                    this.cache.set(cacheKey, result);
                    return result;
                }
            }
        } catch (e) {
            console.warn('[LyricsService] LRCLIB direct get failed:', e.message || e);
        }

        // 2. Search LRCLIB Query
        try {
            const query = `${title} ${artist}`.trim();
            const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(query)}`;
            const res = await fetch(searchUrl, {
                headers: { 'User-Agent': 'VibentraApp/1.2.0 (https://vibentra.vercel.app)' }
            });

            if (res.ok) {
                const items = await res.json();
                if (Array.isArray(items) && items.length > 0) {
                    const best = items.find(i => i.syncedLyrics && i.syncedLyrics.length > 0) || items[0];
                    if (best && (best.syncedLyrics || best.plainLyrics)) {
                        const result = {
                            isSynced: !!(best.syncedLyrics && best.syncedLyrics.trim().length > 0),
                            syncedLines: best.syncedLyrics ? this.parseLrc(best.syncedLyrics) : [],
                            plainText: best.plainLyrics || (best.syncedLyrics ? best.syncedLyrics.replace(/\[\d{2}:\d{2}\.\d{2,3}\]/g, '').trim() : ''),
                            source: 'LRCLIB (SimpMusic Provider)'
                        };
                        this.cache.set(cacheKey, result);
                        return result;
                    }
                }
            }
        } catch (e) {
            console.warn('[LyricsService] LRCLIB search failed:', e.message || e);
        }

        // 3. Musixmatch Provider Query
        try {
            const mxmUrl = `https://apic-desktop.musixmatch.com/ws/1.1/macro.subtitles.get?format=json&q_track=${encodeURIComponent(title)}&q_artist=${encodeURIComponent(artist)}&user_token=200529729864210d7a0dbf038fdfebbf75c74230495f54316d8e0e&app_id=web-desktop-app-v1.0`;
            const res = await fetch(mxmUrl);
            if (res.ok) {
                const json = await res.json();
                const macroCalls = json?.message?.body?.macro_calls;
                if (macroCalls) {
                    const subtitleBody = macroCalls['track.subtitles.get']?.message?.body?.subtitle_list?.[0]?.subtitle?.subtitle_body;
                    const lyricsBody = macroCalls['track.lyrics.get']?.message?.body?.lyrics?.lyrics_body;

                    if (subtitleBody && subtitleBody.trim().length > 0) {
                        let lines = [];
                        try {
                            const parsedSub = JSON.parse(subtitleBody);
                            if (Array.isArray(parsedSub)) {
                                lines = parsedSub.map(item => ({
                                    time: item.time?.total || (item.time?.minutes * 60 + item.time?.seconds),
                                    text: item.text || '♪'
                                })).filter(item => typeof item.time === 'number' && !isNaN(item.time));
                            }
                        } catch (e) {
                            lines = this.parseLrc(subtitleBody);
                        }

                        if (lines.length > 0) {
                            const result = {
                                isSynced: true,
                                syncedLines: lines.sort((a, b) => a.time - b.time),
                                plainText: lines.map(l => l.text).join('\n'),
                                source: 'Musixmatch Provider'
                            };
                            this.cache.set(cacheKey, result);
                            return result;
                        }
                    }

                    if (lyricsBody && lyricsBody.trim().length > 0) {
                        const cleanLyrics = lyricsBody.replace(/\*\*\*\*\*\*\* This Lyrics is NOT for Commercial use \*\*\*\*\*\*\*/g, '').trim();
                        if (cleanLyrics.length > 0) {
                            const result = {
                                isSynced: false,
                                syncedLines: [],
                                plainText: cleanLyrics,
                                source: 'Musixmatch Provider'
                            };
                            this.cache.set(cacheKey, result);
                            return result;
                        }
                    }
                }
            }
        } catch (e) {
            console.warn('[LyricsService] Musixmatch query failed:', e.message || e);
        }

        // 4. Fallback to Provider getLyrics (e.g. JioSaavn)
        try {
            const providerManagerModule = await import('../providers/providerManager.js');
            const providerManager = providerManagerModule.default;
            const pId = track.providerId || (track.provider === 'YouTube Music' ? 'ytmusic' : 'jiosaavn');
            const jioLyrics = await providerManager.getLyrics(pId, track.id);
            if (jioLyrics && jioLyrics.trim().length > 0) {
                const result = {
                    isSynced: false,
                    syncedLines: [],
                    plainText: jioLyrics,
                    source: 'JioSaavn Provider'
                };
                this.cache.set(cacheKey, result);
                return result;
            }
        } catch (e) {
            console.warn('[LyricsService] Provider fallback lyrics failed:', e.message || e);
        }

        return null;
    }

    /**
     * Romanization Engine: Convert Indic Scripts (Tamil, Hindi/Devanagari, etc.) to Latin Phonetics
     */
    romanizeText(text) {
        if (!text) return '';

        // Tamil Maps
        const tamilConsonants = {
            '\u0B95': 'k', '\u0B99': 'ng', '\u0B9A': 'ch', '\u0B9E': 'ny', '\u0B9F': 't',
            '\u0BA3': 'n', '\u0BA4': 'th', '\u0BA8': 'n', '\u0BA9': 'n', '\u0BAA': 'p',
            '\u0BAE': 'm', '\u0BAF': 'y', '\u0BB0': 'r', '\u0BB1': 'r', '\u0BB2': 'l',
            '\u0BB3': 'l', '\u0BB4': 'zh', '\u0BB5': 'v', '\u0BB6': 'sh', '\u0BB7': 'sh',
            '\u0BB8': 's', '\u0BB9': 'h', '\u0B9C': 'j'
        };
        const tamilIndependentVowels = {
            '\u0B85': 'a', '\u0B86': 'aa', '\u0B87': 'i', '\u0B88': 'ee', '\u0B89': 'u', '\u0B8A': 'oo',
            '\u0B8E': 'e', '\u0B8F': 'ae', '\u0B90': 'ai', '\u0B92': 'o', '\u0B93': 'oa', '\u0B94': 'au'
        };
        const tamilVowelSigns = {
            '\u0BBE': 'aa', '\u0BBF': 'i', '\u0BC0': 'ee', '\u0BC1': 'u', '\u0BC2': 'oo',
            '\u0BC6': 'e', '\u0BC7': 'ae', '\u0BC8': 'ai', '\u0BCA': 'o', '\u0BCB': 'oa',
            '\u0BCC': 'au'
        };
        const tamilVirama = '\u0BCD';

        // Hindi / Devanagari Maps
        const hindiConsonants = {
            '\u0915': 'k', '\u0916': 'kh', '\u0917': 'g', '\u0918': 'gh', '\u0919': 'ng',
            '\u091A': 'ch', '\u091B': 'chh', '\u091C': 'j', '\u091D': 'jh', '\u091E': 'ny',
            '\u091F': 't', '\u0920': 'th', '\u0921': 'd', '\u0922': 'dh', '\u0923': 'n',
            '\u0924': 't', '\u0925': 'th', '\u0926': 'd', '\u0927': 'dh', '\u0928': 'n',
            '\u092A': 'p', '\u092B': 'ph', '\u092C': 'b', '\u092D': 'bh', '\u092E': 'm',
            '\u092F': 'y', '\u0930': 'r', '\u0932': 'l', '\u0935': 'v', '\u0936': 'sh',
            '\u0937': 'sh', '\u0938': 's', '\u0939': 'h'
        };
        const hindiIndependentVowels = {
            '\u0905': 'a', '\u0906': 'aa', '\u0907': 'i', '\u0908': 'ee', '\u0909': 'u', '\u090A': 'oo',
            '\u090F': 'e', '\u0910': 'ai', '\u0913': 'o', '\u0914': 'au'
        };
        const hindiVowelSigns = {
            '\u093E': 'aa', '\u093F': 'i', '\u0940': 'ee', '\u0941': 'u', '\u0942': 'oo',
            '\u0947': 'e', '\u0948': 'ai', '\u094B': 'o', '\u094C': 'au', '\u0902': 'n', '\u0901': 'n'
        };
        const hindiVirama = '\u094D';

        let result = '';
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const nextChar = i + 1 < text.length ? text[i + 1] : '';

            // Tamil
            if (tamilIndependentVowels[char]) {
                result += tamilIndependentVowels[char];
            } else if (tamilConsonants[char]) {
                const root = tamilConsonants[char];
                if (nextChar === tamilVirama) {
                    result += root;
                    i++;
                } else if (tamilVowelSigns[nextChar]) {
                    result += root + tamilVowelSigns[nextChar];
                    i++;
                } else {
                    result += root + 'a';
                }
            }
            // Hindi / Devanagari
            else if (hindiIndependentVowels[char]) {
                result += hindiIndependentVowels[char];
            } else if (hindiConsonants[char]) {
                const root = hindiConsonants[char];
                if (nextChar === hindiVirama) {
                    result += root;
                    i++;
                } else if (hindiVowelSigns[nextChar]) {
                    result += root + hindiVowelSigns[nextChar];
                    i++;
                } else {
                    result += root + 'a';
                }
            }
            // Other characters
            else {
                result += char;
            }
        }
        return result;
    }

    /**
     * Get Romanized (Sing-Along) version of lyrics
     */
    getRomanizedLyrics(lyricsData) {
        if (!lyricsData) return null;
        if (lyricsData.isSynced && lyricsData.syncedLines) {
            return {
                ...lyricsData,
                syncedLines: lyricsData.syncedLines.map(line => ({
                    time: line.time,
                    text: this.romanizeText(line.text)
                })),
                plainText: this.romanizeText(lyricsData.plainText)
            };
        } else {
            return {
                ...lyricsData,
                plainText: this.romanizeText(lyricsData.plainText)
            };
        }
    }

    /**
     * Translate lyrics to a target language (en, ta, hi, te, es, fr)
     */
    async translateLyrics(lyricsData, targetLang = 'en') {
        if (!lyricsData) return null;
        const cacheKey = `${lyricsData.plainText?.substring(0, 40)}_${targetLang}`;
        if (this.translationCache.has(cacheKey)) {
            return this.translationCache.get(cacheKey);
        }

        try {
            if (lyricsData.isSynced && lyricsData.syncedLines && lyricsData.syncedLines.length > 0) {
                // Batch translate synced lines (up to 30 main lines)
                const translatedLines = [];
                const sampleLines = lyricsData.syncedLines;

                // Concurrently translate chunks
                const chunkSize = 10;
                for (let i = 0; i < sampleLines.length; i += chunkSize) {
                    const chunk = sampleLines.slice(i, i + chunkSize);
                    const chunkText = chunk.map(l => l.text).join('\n');

                    try {
                        const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunkText)}&langpair=autodetect|${targetLang}`);
                        if (res.ok) {
                            const json = await res.json();
                            const translatedChunk = (json?.responseData?.translatedText || chunkText).split('\n');
                            chunk.forEach((line, idx) => {
                                translatedLines.push({
                                    time: line.time,
                                    text: translatedChunk[idx] || line.text
                                });
                            });
                        } else {
                            chunk.forEach(l => translatedLines.push({ ...l }));
                        }
                    } catch {
                        chunk.forEach(l => translatedLines.push({ ...l }));
                    }
                }

                const result = {
                    ...lyricsData,
                    syncedLines: translatedLines,
                    plainText: translatedLines.map(l => l.text).join('\n')
                };
                this.translationCache.set(cacheKey, result);
                return result;
            } else if (lyricsData.plainText) {
                const sampleText = lyricsData.plainText.substring(0, 1500);
                const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(sampleText)}&langpair=autodetect|${targetLang}`);
                if (res.ok) {
                    const json = await res.json();
                    const translatedText = json?.responseData?.translatedText || lyricsData.plainText;
                    const result = {
                        ...lyricsData,
                        plainText: translatedText
                    };
                    this.translationCache.set(cacheKey, result);
                    return result;
                }
            }
        } catch (e) {
            console.warn('[LyricsService] Translation failed:', e);
        }

        return lyricsData;
    }
}

export const lyricsService = new LyricsService();
export default lyricsService;
