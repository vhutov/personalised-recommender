const { Client } = require('@elastic/elasticsearch')

const searchTrackTerms = ({ track, artist = null }) => {
    const nameTerm = {
        match: {
            name: {
                query: track,
                operator: 'AND'
            }
        }
    }

    if (!artist) {
        return [nameTerm]
    }

    const artistTerm = {
        match: {
            artist: {
                query: artist,
                operator: 'AND'
            }
        }
    }

    return [nameTerm, artistTerm]
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
     * @typedef {Object.<string, any>} SearchResult containg uri of track and matching score
     * @param {Object[]} tracks array of objects, each containing either just track name or track and artist names
     * @returns {Promise<SearchResult[]>} track and artist ids
     */
    asyncSearchTrack = async (tracks) => {
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
     * @typedef {Object.<string, any>} SearchResult containg uri of track and matching score
     * @param {Object[]} tracks array of objects, each containing either just track name or track and artist names
     * @returns {Promise<SearchResult[]>} track and artist ids
     */
    asyncSearchArtist = async (artists) => {
        const { responses } = await this.#es.msearch({
            searches: artists.flatMap(({ artist }) => [
                { index: 'artists' },
                {
                    query: {
                        match: {
                            name: {
                                query: artist,
                                operator: 'AND'
                            }
                        }
                    }
                }
            ])
        })

        return maybeGetFirstFrom(responses)
    }
}

module.exports = FuzzySearch
