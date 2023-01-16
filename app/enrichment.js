// const knex = require('knex')

// const renameToId = (keyName, list) => list.map(({ [keyName]: id, ...rest }) => ({ id, ...rest }))

// class EnrichmentService {
//     /** @type {knex.Knex} */
//     #db

//     /**
//      * @param {knex.Knex} db
//      */
//     constructor(db) {
//         this.#db = db
//     }

//     /**
//      * Gets track data from db
//      *
//      * @param {string[]} trackIds
//      *
//      * @returns {Promise<Object.<string, any>[]>} tracks data
//      */
//     asyncTrackData = async (trackIds) => {
//         const rows = await this.#db
//             .select()
//             .from('tracks')
//             .whereIn('uri', trackIds)

//         return renameToId('uri', rows)
//     }

//     /**
//      * Gets artist data from db
//      *
//      * @param {string[]} artistIds artist ids
//      *
//      * @returns {Promise<Object.<string, any>[]>} artist data
//      */
//     asyncArtistData = async (artistIds) => {
//         const rows = await this.#db
//             .select()
//             .from('artists')
//             .whereIn('uri', artistIds)

//         return renameToId('uri', rows)
//     }
// }

// module.exports = EnrichmentService
