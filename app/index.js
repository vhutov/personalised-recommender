const knex = require('knex')
const redis = require('redis')
const express = require('express')
const bodyParser = require('body-parser')
const R = require('ramda')
const TrackService = require('./tracks')
const EnrichmentService = require('./enrichment')
const SimilarityService = require('./similar')
const RecommendationService = require('./recommendation')
const FuzzySearch = require('./fuzzy')

const { Client } = require('@elastic/elasticsearch')

const flow = require('./flow')

const config = require('./config')

async function main() {
    const db = knex(config.db)

    const redisClient = redis.createClient(config.redis)
    await redisClient.connect()

    const esClient = new Client({
        node: 'http://localhost:9200'
    })

    const tr = new TrackService(db)
    // const e = new EnrichmentService(db)
    const s = new SimilarityService(redisClient)
    const fs = new FuzzySearch(esClient)
    const recs = new RecommendationService(s, /*e,*/ tr, fs)

    const app = express()
    const port = 3000

    app.use(bodyParser.json())

    app.get('/recommendations', async (req, res) => {
        console.log(req.body)

        const { prefs } = req.body

        const start = new Date()

        const searchResult = await flow.fuzzySearchFlow(config, recs)(prefs)

        const took = new Date() - start

        const explain = ([key, vals]) => {
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

        const result = R.pipe(R.groupBy(R.props(['recommender', 'flow'])), R.toPairs, R.map(explain))(searchResult)

        console.log('Took: %d ms', took)

        res.send(result)

        res.end()
    })

    const server = app.listen(port, () => {
        console.log(`Recommendations app listening on port ${port}`)
    })

    process.on('SIGINT', async () => {
        console.log('Interrupt signal received. Closing connections...')
        // Close connections

        server.close(() => {
            console.log('Connections closed. Exiting process...')
            process.exit(0)
        })

        await db.destroy()
        await redisClient.disconnect()
        await esClient.close()
    })
}

main()
