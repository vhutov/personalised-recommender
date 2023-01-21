const redis = require('redis')

class SimilarityService {
    /** @type {redis.RedisClientType} */
    #redis

    /**
     *
     * @param {redis.RedisClientType} redis
     */
    constructor(redis) {
        this.#redis = redis
    }

    /**
     * For provided entity ids fetches similar entities
     *
     * @param {string[]} ids
     * @param {Object} options
     * @param {string} options.indexName redis index name
     * @param {number} [options.fanOut = 10] limit number of similar entities per entity
     *
     * @returns {Promise<Object.<string, string[]>>} dict of similar entities
     */
    asyncGetSimilar = async (ids, { indexName, fanOut = 10 }) => {
        const key = (id) => `${indexName}:${id}`

        const pendingSimilarities = ids.map(async (id) => {
            const similarIds = await this.#redis.lRange(key(id), 0, fanOut)

            if (similarIds.length == 0) return null
            return [id, similarIds]
        })

        const similarities = (await Promise.allSettled(pendingSimilarities)).filter((r) => r.value).map((r) => r.value)

        return Object.fromEntries(similarities)
    }
}

module.exports = SimilarityService
