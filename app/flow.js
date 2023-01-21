const RecommendationService = require('./recommendation')

/**
 * @param {RecommendationService} recs
 */
const buildFuzzySearchFlow = (config, recs) => {

    const {
        fuzzySearchTracks,
        fuzzySearchArtists,
        similar,
        enrichTrack,
        artistTracks,
        dedupe,
        diversify,
        take,
        set,
        setVal,
        merge,
        compose
    } = recs


    const artistFlow = compose(
        dedupe('artist'),
        fuzzySearchArtists,
        dedupe('id'),
        set('id', 'recommender'),
        setVal('flow', 'artist-flow'),
        similar(config.recs.artist.mlp),
        dedupe('id'),
        artistTracks(config.artistTracks),
        diversify(['recommender', 'artist_id']),
        take(50)
    )

    const trackFlow = compose(
        fuzzySearchTracks,
        dedupe('id'),
        setVal('flow', 'track-flow'),
        set('id', 'recommender'),
        similar(config.recs.track),
        dedupe('id'),
        diversify('recommender'),
        take(50)
    )

    return compose(
        merge(artistFlow, trackFlow),
        dedupe('id'),
        diversify('flow'),
        take(config.limit),
        enrichTrack
    )
}

module.exports = {
    buildFuzzySearchFlow: buildFuzzySearchFlow
}
