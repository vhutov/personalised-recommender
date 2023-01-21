const { Client } = require('@elastic/elasticsearch')

/**
 * @param {string} fieldName as name suggests
 * @param {string} value matching value
 * @returns elasticsearch query for matching field
 */
const matchField = (fieldName, value) => ({
    match: {
        [fieldName]: {
            query: value,
            operator: 'AND'
        }
    }
})

/**
 * @param {{track: string, artist: ?string}} value matching value 
 * @returns {{match: Object}[]} array of matching clauses in elastic query dsl
 */
const searchTrackTerms = ({ track, artist = null }) => {
    const trackTerm = matchField('name', track)

    if (!artist) {
        return [trackTerm]
    }

    const artistTerm = matchField('artist', artist)

    return [trackTerm, artistTerm]
}

const maybeGetFirstFrom = (responses) =>
    responses.flatMap((r) => {
        if (!r.hits.hits) return []

        const { _id } = r.hits.hits[0]

        return [
            {
                id: _id
            }
        ]
    })

class FuzzySearch {
    /**
     * @type {Client}
     */
    #es

    constructor(es) {
        this.#es = es
    }

    /**
     * @param {{track: string, artist: ?string}[]} tracks 
     *        array of query strings for matching tracks 
     *        each object must contain either track name or track and artist names
     *        having artist name present increases likelyhood of finding the right track
     * @returns {Promise<{id: string}[]>} track ids for matched queries
     */
    asyncSearchTracks = async (tracks) => {
        const { responses } = await this.#es.msearch({
            searches: tracks.flatMap((track) => [
                { index: 'tracks' },
                {
                    query: {
                        bool: {
                            must: searchTrackTerms(track)
                        }
                    }
                }
            ])
        })

        return maybeGetFirstFrom(responses)
    }

    /**
     * @param {{artist: string}[]} artists 
     *        array of query strings for matching artists 
     *        each object must contain artist names
     * @returns {Promise<SearchResult[]>} track and artist ids
     */
    asyncSearchArtists = async (artists) => {
        const { responses } = await this.#es.msearch({
            searches: artists.flatMap(({ artist }) => [
                { index: 'artists' },
                {
                    query: matchField('name', artist)
                }
            ])
        })

        return maybeGetFirstFrom(responses)
    }
}

module.exports = FuzzySearch
