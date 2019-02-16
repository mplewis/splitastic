import wordlist from '@/vendor/wordlists/english.ts'

import {
  all,
  curry,
  dropLast,
  join,
  map,
  pipe,
  reduce,
  split,
  splitEvery,
  sum,
  unnest
} from 'ramda'

const CHECKSUM_BITS = 9
const DROP_BITS = 2

const toBin = curry((binLen: number, i: number) => {
  // tslint:disable no-bitwise
  const result = leftPad('0', binLen, (i >>> 0).toString(2))
  if (result.length !== binLen) {
    throw new Error(
      `Error converting "${i}" to binary of length "${binLen}": got "${result}"`
    )
  }
  return result
})

function toWord (num: number) {
  const word = wordlist[num]
  if (!word) throw new Error(`Invalid word number: ${num}`)
  return word
}

function toNum (word: string) {
  const index = wordlist.indexOf(word)
  if (index === -1) {
    throw new Error(`Could not find "${word}"`)
  }
  return index
}

const leftPad = curry((filler: string, len: number, item: string) => {
  let result = item
  while (result.length < len) result = filler + result
  return result
})

function parseBin (str: string) {
  return parseInt(str, 2)
}

function ensureLength4 (nums: number[]): number[] {
  while (nums.length < 4) nums.push(0x00)
  return nums
}

function genCheckWord (bytes: Uint8Array): string {
  const dropNum = 2 ** DROP_BITS
  const toDrop = (dropNum - (bytes.length % dropNum)) % dropNum
  const mod = 2 ** CHECKSUM_BITS
  const checksum = sum(Array.from(bytes)) % mod
  const dropBits = toBin(2, toDrop)
  const csBits = toBin(9, checksum)
  const checkBits = dropBits + csBits
  const checkNum = parseBin(checkBits)
  return toWord(checkNum)
}

export function encodeBytes (bytes: Uint8Array): string[] {
  const cw = genCheckWord(bytes)
  const nums = Array.from(bytes)
  const bin33s = pipe(
    splitEvery(4),
    map(ensureLength4),
    map(map(toBin(8))),
    map(reduce((b32, b8) => b32 + b8, '')),
    map((b32) => b32 + '0')
  )(nums)
  if (!all((bin33) => bin33.length === 33, bin33s)) {
    throw new Error(
      `Expected all 3-word binary chunks to have length 33, got: ${bin33s}`
    )
  }
  const bin11s = pipe(
    map(split('')),
    map(splitEvery(11)),
    map(map(join(''))),
    unnest
  )(bin33s)
  const words = bin11s.map(parseBin).map(toWord)
  if (words.length % 3 !== 0) {
    throw new Error(
      `Expected data word count to be a multiple of 3, got ${
        words.length
      } words`
    )
  }

  return words.concat(cw)
}

function checkVals (checkWord: string) {
  const bits = pipe(
    toNum,
    toBin(11)
  )(checkWord)
  const dropBits = bits.slice(0, 2)
  const checkBits = bits.slice(2, 11)
  const dropBytes = parseBin(dropBits)
  const checksum = parseBin(checkBits)
  return { checksum, dropBytes }
}

export function decodeWords (words: string[]): Uint8Array {
  const dataWords = words.slice(0, words.length - 1)
  const checkWord = words[words.length - 1]
  const { checksum, dropBytes } = checkVals(checkWord)

  const bin32s = pipe(
    map(toNum),
    map(toBin(11)),
    join(''),
    split(''),
    splitEvery(33),
    map(join('')),
    map(dropLast(1))
  )(dataWords)
  if (!all((bin32) => bin32.length === 32, bin32s)) {
    throw new Error(
      `Expected binary chunks for 3-word groups to eventually have length 32, got: ${bin32s}`
    )
  }

  const data = pipe(
    join(''),
    split(''),
    splitEvery(8),
    map(join('')),
    map(parseBin),
    (b) => dropLast<number>(dropBytes)(b)
  )(bin32s)

  const actualSum = sum(data) % 2 ** CHECKSUM_BITS
  if (actualSum !== checksum) {
    throw new Error(
      `Checksum mismatch: expected ${checksum}, got ${actualSum}`
    )
  }

  return new Uint8Array(data)
}
