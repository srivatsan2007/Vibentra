/**
 * Lyrics Service for Vibentra
 * Powered by LRCLIB (SimpMusic Provider) & Fallback Providers
 * Supports Real-time Synced Lyrics (.lrc) & Plain Text
 */
class LyricsService {
    constructor() {
        this.cache = new Map();
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
}

export const lyricsService = new LyricsService();
export default lyricsService;
