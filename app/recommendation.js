const R = require('ramda')
const _ = require('lodash')

const TrackService = require('./tracks')
const SimilarityService = require('./similar')
const FuzzySearch = require('./fuzzy')

/**
 * @template A
 * @param {A|A[]} input
 * @returns {A[]}
 */
const toArray = (input) => (Array.isArray(input) ? input : [input])

class RecommendationService {
    /** @type {SimilarityService} */
    #similarityService
    /** @type {TrackService} */
    #trackService
    /** @type {FuzzySearch} */
    #fuzzyService

    /**
     * @param {SimilarityService} similarityService
    //  * @param {EnrichmentService} enrichmentService
     * @param {TrackService} trackService
     * @param {FuzzySearch} fuzzyService
     */
    constructor(similarityService, /*enrichmentService,*/ trackService, fuzzyService) {
        this.#similarityService = similarityService
        // this.#enrichmentService = enrichmentService
        this.#trackService = trackService
        this.#fuzzyService = fuzzyService
    }

    /**
     * @typedef {Object.<string, any>} Entity
     * @param {Entity|Entity[]} input user search requests. Each entity must contain track name and optionally artist name
     * @returns {Promise.<Entity[]>} output holding found track ids
     */
    fuzzySearchTracks = async (input) => {
        input = toArray(input)

        const trackInputs = input.filter((v) => v.track)

        const searchResults = await this.#fuzzyService.asyncSearchTracks(trackInputs)

        return searchResults
    }

    /**
     * @typedef {Object.<string, any>} Entity
     * @param {Entity[]} input
     * @returns
     */
    fuzzySearchArtists = async (input) => {
        input = toArray(input)

        const artistInput = input.filter((v) => v.artist)

        const searchResults = await this.#fuzzyService.asyncSearchArtists(artistInput)

        return searchResults
    }

    /**
     * Copies property value to another property
     * @typedef {Object.<string, any>} Entity
     * @param {string} from param name
     * @param {string} to param name
     * @param {Entity|Entity[]} input
     * @returns {Promise<Entity[]>} entities with new property set
     */
    set = (from, to) => async (input) => {
        input = toArray(input)

        return input.map((entity) => ({ ...entity, [to]: entity[from] }))
    }

    /**
     * Sets property with specified key-value
     * @typedef {Object.<string, any>} Entity
     * @param {string} key
     * @param {any} value
     * @param {Entity|Entity[]} input
     * @returns {Promise<Entity[]>} entities with new property set
     */
    setVal = (key, value) => async (input) => {
        input = toArray(input)

        return R.map(R.assoc(key, value))(input)
    }

    /**
     * Finds similar entities. Copies properties from parent to children.
     * @typedef {Object.<string, any>} Entity
     * @param {Object|Function} options see SimilarityService#getSimilar options
     * @param {Entity|Entity[]} input
     * @returns {Promise<Entity[]>} similar entities for every entity from input
     */
    similar = (options) => async (input) => {
        input = toArray(input)

        options = _.isFunction(options) ? options() : options

        const ids = input.map(R.prop('id'))

        const similarMap = await this.#similarityService.asyncGetSimilar(ids, options)

        return input.flatMap((entity) => {
            const similar = similarMap[entity.id] || []

            return similar.map((id) => ({
                ...entity,
                id
            }))
        })
    }

    /**
     * Enriches Track Entities with track data
     * @typedef {Object.<string, any>} Entity
     * @param {Entity|Entity[]} input
     * @returns {Promise<Entity[]>} input entities, enriched with track data
     */
    enrichTrack = async (input) => {
        input = toArray(input)

        const ids = input.map(R.prop('id'))

        const trackData = await this.#trackService.asyncTrackData(ids)

        const dataMap = R.indexBy(R.prop('id'))(trackData)

        return input.map((entity) => ({ ...entity, ...dataMap[entity.id] }))
    }

    artistTracks = (options = {}) => async (input) => {
        input = toArray(input)
        options = _.isFunction(options) ? options() : options

        const artistIds = input.map(({ id }) => id)

        const artistTracks = await this.#trackService.asyncGetTracksByArtist(artistIds, options)

        return input.flatMap((entity) => {
            return (
                artistTracks[entity.id]?.map((s) => {
                    return { ...entity, artist_id: entity.id, id: s }
                }) || []
            )
        })
    }

    /**
     * Takes specified amount from input.
     * @typedef {Object.<string, any>} Entity
     * @param {number} limit
     * @param {Entity|Entity[]} input
     * @returns {Promise<Entity[]>} same as input but only [limit] elements
     */
    take = (limit) => async (input) => {
        input = toArray(input)

        return input.slice(0, limit)
    }

    /**
     * Merges few flows into single flow
     * @typedef {Object.<string, any>} Entity
     * @param  {...(Entity[] => Promise<Entity[]>)} flows
     * @returns high level pipe
     */
    merge = (...pipes) => async (input) => {
        const convergingF = async (...flows) =>
            (await Promise.allSettled(flows))
                .filter((v) => v.value)
                .map((v) => v.value)
                .flat()

        return R.converge(convergingF, pipes)(input)
    }

    /**
     * Creates sequential composition of flows
     * @typedef {Object.<string, any>} Entity
     * @param  {...(Entity[] => Promise<Entity[]>)} pipes
     * @returns high level pipe
     */
    compose = (...pipes) => async (input) => {
        return R.pipeWith(R.andThen, pipes)(input)
    }

    /**
     * Deduplicates entities by specified property
     * @typedef {Object.<string, any>} Entity
     * @param {string} by property name
     * @param {Entity|Entity[]} input
     * @returns {Promise<Entity[]>} same as input but deduplicated
     */
    dedupe = (by) => async (input) => {
        input = toArray(input)

        return R.uniqBy(R.prop(by))(input)
    }

    /**
     * Tries to sort values in a way that puts similar items further away from
     * each other
     * @typedef {Object.<string, any>} Entity
     * @param {string|string[]} by param name
     * @param {Entity|Entity[]} input
     * @returns {Promise<Entity[]>} same as input
     */
    diversify2 = (by) => async (input) => _.shuffle(toArray(input))

    diversify = (by) => async (input) => {
        const keyF = R.pipe(R.props(toArray(by)), R.join(','))

        const groups = {}
        const order = []

        for (const entity of input) {
            const key = keyF(entity)
            
            if (!_.has(groups, key)) {
                order.push(key)
            }

            _.update(groups, key, arr => arr ? arr.concat([entity]) : [entity])
        }

        const output = []

        while (!_.isEmpty(order)) {
            const key = order.shift()

            const entity = groups[key].shift()

            output.push(entity)

            if (!_.isEmpty(groups[key]))
                order.push(key)
        }

        return output
    }

    /**
     * Sorts input by specified field
     * @typedef {Object.<string, any>} Entity
     * @param {string} by sorting column
     * @param {Entity|Entity[]} input
     * @returns {Promise<Entity[]>}
     */
    sort = (by) => async (input) => R.sortBy(R.prop(by))(toArray(input))
}

module.exports = RecommendationService
