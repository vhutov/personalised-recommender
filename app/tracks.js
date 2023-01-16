const knex = require('knex')
const R = require('ramda')
const _ = require('lodash')

const renameToId = (keyName, list) => list.map(({ [keyName]: id, ...rest }) => ({ id, ...rest }))

class TrackService {
    /** @type {knex.Knex} */
    #db

    /**
     * @param {knex.Knex} db
     */
    constructor(db) {
        this.#db = db
    }

    /**
     * Get list of tracks per artist.
     *
     * @param {string[]} artistIds list of artist ids
     * @param {Object} options configuration:
     * @param {number} [options.fanOut] max number tracks per artist
     * @param {boolean} [options.randomize = false] when fan_out specified - if true, will randomly shuffle tracks before limiting
     *
     * @returns {Promise<Object.<string, string[]>>} list of tracks per artist
     */
    asyncGetTracksByArtist = async (artistIds, { fanOut = null, randomize = false } = {}) => {
        const rows = await this.#db
            .select({
                track_id: 'uri',
                artist_id: 'artist_uri'
            })
            .from('tracks')
            .whereIn('artist_uri', artistIds)

        const fanOutFun = randomize ? (v) => _.sampleSize(v, fanOut) : (v) => _.slice(v, 0, fanOut)

        const group = R.groupBy(R.prop('artist_id'))

        const limitPerArtist = fanOut
            ? R.pipe(
                  R.toPairs,
                  R.map(([k, v]) => [k, fanOutFun(v)]),
                  R.fromPairs
              )
            : R.identity

        const project = R.mapObjIndexed(R.pluck('track_id'))

        return R.pipe(group, limitPerArtist, project)(rows)
    }

     /**
     * Gets track data from db
     *
     * @param {string[]} trackIds
     *
     * @returns {Promise<Object.<string, any>[]>} tracks data
     */
     asyncTrackData = async (trackIds) => {
        const rows = await this.#db
            .select()
            .from('tracks')
            .whereIn('uri', trackIds)

        return renameToId('uri', rows)
    }

    // /**
    //  * Get list of artists based on their songs.
    //  *
    //  * @param {string[]} songIds list of song ids
    //  * @returns {Promise<string[]>} list of artist ids
    //  */
    // asyncGetArtistsByTracks = async (songIds) => {
    //     const rows = await this.#db
    //         .select('artist_uri', 'uri')
    //         .from('tracks')
    //         .whereIn('uri', songIds)

    //     return R.project(['artist_uri', 'uri'])(rows)
    // }
}

module.exports = TrackService
