import { range } from 'ramda'
import { decodeWords, encodeBytes } from './wordlist'

describe('encodeBytes', () => {
  it('encodes bytes including the proper checkword', () => {
    const toEncode = new Uint8Array([0xc0, 0xff, 0xee, 0xca, 0xfe])
    // as integers: 192, 255, 238, 202, 254 (, 0, 0, 0)
    // as 33-bit blobs: 11000000 11111111 11101110 11001010 (0)
    //                  11111110 00000000 00000000 00000000 (0)
    // as 11-bit chunks: 11000000111 11111111011 10110010100
    //                   11111110000 00000000000 00000000000
    // as numbers: 1543, 2043, 1428, 2032, 0, 0
    // as words: science, youth, raw, wrap, abandon, abandon

    // A word represents 11 bits of data
    // The first 2 bits of the checkword represent the drop byte count
    // Bytes are encoded in groups of 4
    // To encode 5 bytes, we pad the end with 0x00 bytes and drop 3 bytes later => 0b11
    // The last 9 bits of the checkword are reserved for the checksum (mod 512)
    // Sum: 1141, % 512 = 117, checksum => 001110101
    // Expected checkword: 11001110101 => 1653 => "solid"

    // Checkword is appended to the data word array
    // Expected final output: science, youth, raw, wrap, abandon, abandon, solid
    expect(encodeBytes(toEncode)).toEqual([
      'science',
      'youth',
      'raw',
      'wrap',
      'abandon',
      'abandon',
      'solid'
    ])
  })
})

describe('decodeWords', () => {
  const subject = (checkWord: string) =>
    decodeWords(dataWords.concat([checkWord]))

  const dataWords = ['science', 'youth', 'raw', 'wrap', 'abandon', 'abandon']
  // as words: science, youth, raw, wrap, abandon, abandon
  // as numbers: 1543, 2043, 1428, 2032, 0, 0
  // as 11-bit chunks: 11000000111 11111111011 10110010100
  //                   11111110000 00000000000 00000000000
  // as 33-bit blobs: 11000000 11111111 11101110 11001010 (0)
  //                  11111110 00000000 00000000 00000000 (0)
  // as integers: 192, 255, 238, 202, 254, 0, 0, 0
  // sum: 1141, % 512 = 117
  // output: 192, 255, 238, 202, 254, 0, 0, 0, drop 3
  //       = 192, 255, 238, 202, 254
  //       = 0xc0, 0xff, 0xee, 0xca, 0xfe

  describe('when the checkword is correct', () => {
    const checkWord = 'solid'
    // checkword: solid => 1653 => 11001110101
    // first 2 bits: drop byte count = 11 => drop 3 bytes
    // last 9 bits: checksum = 001110101 => 117: matches expected checksum!

    it('decodes as expected', () => {
      expect(subject(checkWord)).toEqual(
        new Uint8Array([0xc0, 0xff, 0xee, 0xca, 0xfe])
      )
    })
  })

  describe('when the checkword is incorrect', () => {
    const checkWord = 'solution'
    // checkword: solution => 1654 => 11001110110
    // last 9 bits: checksum = 001110110 => 118: checksum mismatch

    it('raises the expected error', () => {
      expect(() => subject(checkWord)).toThrowError(/Checksum mismatch/)
    })
  })
})

describe('symmetry stress test', () => {
  // https://gist.github.com/jfairbank/8d36e4bde9c16dc0bac7#gistcomment-2639687
  function* fibonacci (n: number, current = 0, next = 1): any {
    if (n === 0) {
      return current
    }
    yield current
    yield* fibonacci(n - 1, next, current + next)
  }

  function randByte () {
    return Math.floor(Math.random() * 256)
  }

  [...fibonacci(20)].map((len) => {
    const data = new Uint8Array(range(0, len).map(randByte))
    it(`symmetrically encodes/decodes an array of length ${len}`, () => {
      const encoded = encodeBytes(data)
      const decoded = decodeWords(encoded)
      expect(decoded).toEqual(data)
    })
  })
})
