import wordlist from '@/vendor/wordlists/english.ts'

import {
  all,
  curry,
  join,
  map,
  pipe,
  reduce,
  split,
  splitEvery,
  sum,
  tap,
  unnest
} from 'ramda'

const CHECKSUM_BITS = 9
const DROP_BITS = 2

// function toNum (word: string) {
//   const index = wordlist.indexOf(word)
//   if (index === -1) {
//     throw new Error(`Could not find "${word}"`)
//   }
//   return index
// }

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

const leftPad = curry((filler: string, len: number, item: string) => {
  let result = item
  while (result.length < len) result = filler + result
  return result
})

// const zeroPad = leftPad('0')

// const truncate = curry((len: number, str: string) => {
//   return str.slice(0, len)
// })

function parseBin (str: string) {
  return parseInt(str, 2)
}

// export function parseWords (words: string[]): Uint8Array {
//   const asBin = words
//     .map(toNum)
//     .map(toBin)
//     .map(zeroPad(11))
//   const byteNums = inGroupsOf(3, asBin)
//     .map((g) => g.join(''))
//     .map(truncate(32))
//     .map(splitEvery(8))
//     .map((b8s) => b8s.map(parseBin))
//     .reduce((all, nums) => all.concat(nums), [])
//   return new Uint8Array(byteNums)
// }

// export function parseWordsChecksum (words: string[]): Uint8Array {
//   const checksumWord = words[words.length - 1]
//   const toParse = words.slice(0, words.length - 1)
//   const bytes = parseWords(toParse)
//   const checksum = bytes.reduce((a, n) => a + n, 0) % 2048
//   if (checksum !== toNum(checksumWord)) {
//     throw new Error(`Checksum mismatch: "${checksumWord}"`)
//   }
//   return bytes
// }

// export function encodeBytes (bytes: Uint8Array): string[] {
//   return inGroupsOf(4, Array.from(bytes))
//     .map((g) => g.map(zeroPad(8)).join(''))
//     .map((b32) => b32 + '0')
//     .map(splitEvery(11))
//     .map((b11s) => b11s.map(parseBin))
//     .reduce((all, group) => all.concat(group), [])
//     .map((wordNum) => wordlist[wordNum])
// }

function ensureLength4 (nums: number[]): number[] {
  while (nums.length < 4) nums.push(0x00)
  return nums
}

function checkWord (bytes: Uint8Array): string {
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
  const cw = checkWord(bytes)
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
