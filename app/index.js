const knex = require('knex')
const redis = require('redis')
const express = require('express')
const bodyParser = require('body-parser')

const TrackService = require('./tracks')
const SimilarityService = require('./similar')
const RecommendationService = require('./recommendation')
const FuzzySearch = require('./fuzzy')
const RecommendationsHandler = require('./handler')

const { Client } = require('@elastic/elasticsearch')


const config = require('./config')

async function main() {
    const db = knex(config.db)

    const redisClient = redis.createClient(config.redis)
    await redisClient.connect()

    const esClient = new Client({
        node: 'http://localhost:9200'
    })

    const tr = new TrackService(db)
    const s = new SimilarityService(redisClient)
    const fs = new FuzzySearch(esClient)
    const recs = new RecommendationService(s, tr, fs)
    const handler = new RecommendationsHandler(recs)

    const app = express()
    const port = 3000

    app.use(bodyParser.json())

    app.get('/recommendations', async (req, res) => {

        const { prefs, limit } = req.body
        
        const result = await handler.asyncGetRecommendations(prefs, limit)

        res.send(result)

        res.end()
    })

    const server = app.listen(port, () => {
        console.log(`Recommendations app listening on port ${port}`)
    })

    process.on('SIGINT', async () => {
        console.log('Interrupt signal received. Closing connections...')

        await db.destroy()
        await redisClient.disconnect()
        await esClient.close()

        server.close(() => {
            console.log('Connections closed. Exiting process...')
            process.exit(0)
        })
    })
}

main()
