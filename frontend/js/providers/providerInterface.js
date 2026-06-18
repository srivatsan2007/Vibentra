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
        return {
            id: trackData.id,
            title: trackData.title,
            artist: trackData.artist,
            album: trackData.album,
            cover: trackData.cover,
            duration: trackData.duration,
            streamUrl: trackData.streamUrl,
            provider: this.name,
            providerId: this.id
        };
    }
}
