/**
 * Base Provider Interface
 * All music providers must extend this class and implement its methods.
 */
export default class ProviderInterface {
    constructor(id, name) {
        this.id = id;
        this.name = name;
        this.enabled = true; // Managed by ProviderManager
    }

    async searchSongs(query) { throw new Error('Method not implemented.'); }
    async searchArtists(query) { throw new Error('Method not implemented.'); }
    async searchAlbums(query) { throw new Error('Method not implemented.'); }
    async getTrack(trackId) { throw new Error('Method not implemented.'); }
    async getArtist(artistId) { throw new Error('Method not implemented.'); }
    async getAlbum(albumId) { throw new Error('Method not implemented.'); }
    async getPlaylist(playlistId) { throw new Error('Method not implemented.'); }
    
    /**
     * Standardizes track data returned from any provider
     */
    standardizeTrack(trackData) {
        if (!trackData) return null;
        const rawTitle = trackData.title || trackData.song || trackData.name || 'Untitled Track';
        const rawArtist = trackData.artist || trackData.primary_artists || trackData.primaryArtists || trackData.singers || trackData.subtitle || 'Unknown Artist';
        const rawAlbum = (trackData.album && typeof trackData.album === 'string') ? trackData.album : (trackData.album?.name || trackData.album_name || trackData.albumName || '');
        
        let cover = 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&q=80';
        if (trackData.cover) {
            cover = trackData.cover;
        } else if (trackData.image) {
            if (typeof trackData.image === 'string') {
                cover = trackData.image.replace('150x150', '500x500');
            } else if (Array.isArray(trackData.image) && trackData.image.length > 0) {
                cover = trackData.image[trackData.image.length - 1]?.url || trackData.image[trackData.image.length - 1]?.link || cover;
            }
        }

        let duration = '3:30';
        if (typeof trackData.duration === 'number') {
            const mins = Math.floor(trackData.duration / 60);
            const secs = trackData.duration % 60;
            duration = `${mins}:${secs.toString().padStart(2, '0')}`;
        } else if (trackData.duration) {
            duration = String(trackData.duration);
        }

        let streamUrl = trackData.streamUrl || trackData.media_url || null;
        if (!streamUrl && trackData.downloadUrl) {
            if (typeof trackData.downloadUrl === 'string') {
                streamUrl = trackData.downloadUrl;
            } else if (Array.isArray(trackData.downloadUrl) && trackData.downloadUrl.length > 0) {
                streamUrl = trackData.downloadUrl[trackData.downloadUrl.length - 1]?.url || trackData.downloadUrl[trackData.downloadUrl.length - 1]?.link || null;
            }
        }

        return {
            id: trackData.id ? String(trackData.id) : `track_${Math.random().toString(36).substring(7)}`,
            title: String(rawTitle).replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, '&'),
            artist: String(rawArtist).replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, '&'),
            album: String(rawAlbum).replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, '&'),
            cover: cover,
            duration: duration,
            streamUrl: streamUrl,
            provider: trackData.provider || this.name,
            providerId: trackData.providerId || this.id
        };
    }
}

