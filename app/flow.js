const RecommendationService = require('./recommendation')
const R = require('ramda')

/**
 * @param {RecommendationService} recs
 */
const fuzzySearchFlow = (config, recs) => {
    const flow = (...f) => R.pipeWith(R.andThen)(f)
    const merge = (...f) => R.converge(recs.merge, f)

    const artistFlow = flow(
        recs.dedupe('artist'),
        recs.fuzzySearchArtists,
        recs.dedupe('id'),
        recs.set('id', 'recommender'),
        recs.setVal('flow', 'artist-flow'),
        recs.similar(config.recs.artist.mlp),
        recs.dedupe('id'),
        recs.artistTracks(config.artistTracks),
        recs.diversify(['recommender', 'artist_id']),
        recs.take(50)
    )

    const trackFlow = flow(
        recs.fuzzySearchTracks,
        recs.dedupe('id'),
        recs.setVal('flow', 'track-flow'),
        recs.set('id', 'recommender'),
        recs.similar(config.recs.track),
        recs.dedupe('id'),
        recs.diversify('recommender'),
        recs.take(50)
    )

    return flow(
        merge(artistFlow, trackFlow),
        recs.dedupe('id'),
        recs.diversify('flow'),
        recs.take(10),
        recs.enrichTrack
    )
}

module.exports = {
    fuzzySearchFlow: fuzzySearchFlow
}
