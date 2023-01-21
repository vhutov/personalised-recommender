const R = require('ramda')

const flowBuilder = require('./flow')

const config = require('./config')

class RecommendationsHandler {
    #recs

    constructor(recs) {
        this.#recs = recs
    }

    asyncGetRecommendations = async (preferences, limit) => {
        const start = new Date()

        const userConfig = { ...config, limit: limit }

        const searchResult = await flowBuilder.buildFuzzySearchFlow(userConfig, this.#recs)(preferences)

        const queryTime = new Date() - start

        const renderExplain = ([key, vals]) => {
            const [rec, flow] = key.split(',')

            const explanation =
                flow === 'artist-flow'
                    ? `Because you liked artist https://open.spotify.com/artist/${rec}`
                    : `Because you liked track https://open.spotify.com/track/${rec}`

            const recommendations = vals.map(({ id, name }) => ({
                song: name,
                uri: `https://open.spotify.com/track/${id}`
            }))

            return {
                explanation,
                recommendations
            }
        }

        const result = R.pipe(
            R.groupBy(R.props(['recommender', 'flow'])),
            R.toPairs,
            R.map(renderExplain)
        )(searchResult)

        return {
            took: queryTime,
            recommendations: result
        }
    }
}

module.exports = RecommendationsHandler
