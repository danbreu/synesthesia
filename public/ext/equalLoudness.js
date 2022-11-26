/**
 * Get percieved loudness for sound pressure level
 * 
 * @param {*} spl Sound pressure level in dB (L_p)
 * @param {*} frequency Tone frequency in Hz (f)
 */
export const getLoudness = (spl, frequency) => {
  const [a_f, L_U, T_f] = getConstants(frequency)

  return (
    Math.log10(
      (Math.pow(10, ((spl + L_U - 94) * a_f) / 10) -
        Math.pow(0.4 * Math.pow(10, (T_f + L_U) / 10 - 9), a_f)) /
        0.00447 +
        1.15
    ) / 0.025
  )
}

/**
 * Get sound pressure level in decibel for a percieved loudness and frequency
 *
 * @param {Number} loudness Percieved loudness in Phon (L_n)
 * @param {Number} frequency Tone frequency in Hz (f)
 *
 * @returns {Number} SPL in dB (L_p)
 */
export const getSpl = (loudness, frequency) => {
  const [a_f, L_U, T_f] = getConstants(frequency)

  const A_f = (0.00447 * (Math.pow(10, 0.025 * loudness) - 1.15) +
    Math.pow(0.4 * Math.pow(10, (T_f + L_U) / 10 - 9), a_f))

  return (10 / a_f) * Math.log10(A_f) - L_U + 94
};

/**
 * Get ISO 226 constants for frequency.
 * If frequency is between two frequencies in the lookup table, interpolate linearly.
 *
 * @param {Number} frequency Frequency between 0 and 125006 Hz
 *
 * @returns {Array} ISO 226 constants [a_f, L_U, T_f]
 */
const getConstants = (frequency) => {
  let index = 0
  for (; index < iso226Frequencies.length; index++) {
    if (iso226Frequencies[index] > frequency) {
      break
    }
  }

  const upperFrequency = iso226Frequencies[index]
  const upper = iso226Constants[index]
  const lowerFrequency = iso226Frequencies[index - 1]
  const lower = iso226Constants[index - 1]

  const t = (frequency - lowerFrequency) / (upperFrequency - lowerFrequency)
  return [
    lerp(t, lower[0], upper[0]),
    lerp(t, lower[1], upper[1]),
    lerp(t, lower[2], upper[2]),
  ]
}

/**
 * Linear interpolation
 */
const lerp = (t, a, b) => a + (b - a) * t

/**
 * Frequencies for iso226_constants.
 */
const iso226Frequencies = [
  20, 25, 31.5, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630,
  800, 1000, 1250, 1600, 2000, 2500, 3150, 4000, 5000, 6300, 8000, 10000, 12500,
]

/**
 * Frequency-dependant constants from ISO 226.
 *
 * [a_f, L_U, T_f]
 */
const iso226Constants = [
  [0.532, -31.6, 78.5],
  [0.506, -27.2, 68.7],
  [0.48, -23, 59.5],
  [0.455, -19.1, 51.1],
  [0.432, -15.9, 44],
  [0.409, -13, 37.5],
  [0.387, -10.3, 31.5],
  [0.367, -8.1, 26.5],
  [0.349, -6.2, 22.1],
  [0.33, -4.5, 17.9],
  [0.315, -3.1, 14.4],
  [0.301, -2, 11.4],
  [0.288, -1.1, 8.6],
  [0.276, -0.4, 6.2],
  [0.267, 0, 4.4],
  [0.259, 0.3, 3],
  [0.253, 0.5, 2.2],
  [0.25, 0, 2.4],
  [0.246, -2.7, 3.5],
  [0.244, -4.1, 1.7],
  [0.243, -1, -1.3],
  [0.243, 1.7, -4.2],
  [0.243, 2.5, -6],
  [0.242, 1.2, -5.4],
  [0.242, -2.1, -1.5],
  [0.245, -7.1, 6],
  [0.254, -11.2, 12.6],
  [0.271, -10.7, 13.9],
  [0.301, -3.1, 12.3],
]

export const FREQUENCY_MIN = iso226Frequencies[0]
export const FREQUENCY_MAX = iso226Frequencies[iso226Frequencies.length-1]
