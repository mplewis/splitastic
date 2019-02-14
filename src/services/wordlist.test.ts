import { encodeBytes, parseWords, parseWordsChecksum } from './wordlist'

describe('parseWords', () => {
  it('parses English words to the expected bytes', () => {
    /**
     * light    1036 10000001100
     * glad      788 01100010100
     * oblige   1217 10011000001
     * announce   74 00001001010
     * embark    578 01001000010
     * wish     2020 11111100100
     *
     * => 10000001100011000101001001100000 00001001010010010000101111110010
     *  =  2173456992   155782130
     *  = 81 8C 52 60 09 49 0B F2
     */
    expect(
      parseWords(['light', 'glad', 'oblige', 'announce', 'embark', 'wish'])
    ).toEqual(new Uint8Array([0x81, 0x8c, 0x52, 0x60, 0x09, 0x49, 0x0b, 0xf2]))

    // The last word in every 4-byte group loses its LSB, so it could be one of two words
    expect(
      parseWords(['light', 'glad', 'object', 'announce', 'embark', 'witness'])
    ).toEqual(new Uint8Array([0x81, 0x8c, 0x52, 0x60, 0x09, 0x49, 0x0b, 0xf2]))
  })
})

describe('parseWordsChecksum', () => {
  /**
   * 252 252 232 229 0 65 48 162 248 225 230 208 65 135 56 77 212 21 210 94 68
   *   198 157 79 58 42 242 111 240 176 250 12
   * sum: 4764
   * mod 2048: 668
   * checksum: "fatal"
   */
  const words = [
    'woman',
    'trap',
    'defense',
    'able',
    'another',
    'chunk',
    'wedding',
    'august',
    'reflect',
    'dose',
    'degree',
    'beach',
    'staff',
    'purse',
    'nut',
    'dynamic',
    'crunch',
    'fault',
    'demand',
    'fiscal',
    'orbit',
    'vague',
    'march',
    'pact'
  ]
  const subject = (checksum: string) =>
    parseWordsChecksum([...words, checksum])

  describe('when the checksum is correct', () => {
    const checksum = 'fatal'

    it('parses properly', () => {
      const bytes = subject(checksum)
      const sum = bytes.reduce((a: number, n: number) => a + n, 0)
      expect(sum).toEqual(4764)
    })
  })

  describe('when the checksum is incorrect', () => {
    const checksum = 'fatigue'

    it('throws the expected error', () => {
      expect(() => subject(checksum)).toThrowError(/Checksum mismatch/)
    })
  })
})

describe('encodeBytes', () => {
  it('encodes bytes as words', () => {
    expect(
      encodeBytes(
        new Uint8Array([0x81, 0x8c, 0x52, 0x60, 0x09, 0x49, 0x0b, 0xf2])
      )
    ).toEqual(['light', 'glad', 'object', 'announce', 'embark', 'wish'])
  })
})

describe('encodeBytesCheckdropsum', () => {
  it('encodes bytes including the proper checksum and drop byte count', () => {
    // A word represents 11 bits of data
    // The first 9 bits of the checkdropsum are reserved for the checksum (mod 512)
    // Sum: 1141, % 512 = 117 checksum => 001110101
    // The last 2 bits represent the drop byte count
    // Bytes are encoded in groups of 4
    // To encode 5 bytes, we pad the end with 0x00 bytes and drop 3 bytes later (11)
    // Expected checksum: 00111010111 => 471 => "depart"
    const toEncode = [0xc0, 0xff, 0xee, 0xca, 0xfe]
    // expect(encodeBytesCheckdropsum(toEncode)).toEqual([])
  })
})
