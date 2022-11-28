export const getStreamUrl =  async (pipedInstances, youtubeUrl) => {
    const id = toVideoID(youtubeUrl)
    const info = await getInfo(pipedInstances, id)

    const audioStream = info.audioStreams.find((stream) => !stream.videoOnly)

    return audioStream.url
}

/**
 * Get a video ID (the part after watch?v=) from a youtube url
 * 
 * @param {String} youtubeUrl 
 * @returns {String} the video ID
 */
export const toVideoID = (youtubeUrl) => {
    const parts = youtubeUrl.split("watch?v=")
    if (parts.length < 2) { throw Error(`Invalid Youtube URL: ${youtubeUrl}`) }
    
    return parts[1]
}

/**
 * Get info object from videoId using piped api
 * 
 * @param {Array} pipedInstances Array of URL strings of Piped instances
 * @param {String} videoId ID of the Youtube video
 * @returns {Object} the info object
 * 
 * @throws If no info can be fetched using any of the instances specified in pipedInstances
 */
export const getInfo = async (pipedInstances, videoId) => {
    let info = null
    for(let i = 0; i < pipedInstances.length; i++) {
        try {
            const response = await fetch(`${pipedInstances[i]}/streams/${videoId}`)
            return await response.json()
        }
        catch(e) {
            continue
        }
    }

    throw Error(`Could not get info for video ${videoId} using piped instances ${pipedInstances}`)
}