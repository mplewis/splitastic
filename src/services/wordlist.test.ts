import { parseWords } from './wordlist'

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
  })
})
