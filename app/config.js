module.exports = {
    db: {
        client: 'mysql',
        connection: {
            host: '127.0.0.1',
            port: 3306,
            user: 'user',
            password: 'user123',
            database: 'music'
        }
    },
    redis: {
        socket: {
            host: 'localhost'
        }
    },
    recs: {
        artist: {
            matrixFactorisation: {
                indexName: 'matrix_factorisation',
                fanOut: 10
            },
            mlp: {
                indexName: 'mlp',
                fanOut: 10
            },
            coco: {
                indexName: 'coco',
                fanOut: 10
            }
        },
        track: {
            indexName: 'tracks',
            fanOut: 20
        }
    },
    artistTracks: {
        fanOut: 5,
        randomize: true
    },
    limit: 20
}
