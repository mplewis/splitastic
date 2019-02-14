import wordlist from '@/vendor/wordlists/english.ts'

function to11Bit (word: string) {
  const index = wordlist.indexOf(word)
  if (index === -1) {
    throw new Error(`Could not find "${word}"`)
  }
  return index
}

function toBin (i: number) {
  // tslint:disable no-bitwise
  return (i >>> 0).toString(2)
}

function to8BitBin (i: number) {
  return leftPad('0', 8, toBin(i))
}

function to11BitBin (i: number) {
  return leftPad('0', 11, toBin(i))
}

function leftPad (filler: string, len: number, item: string) {
  let result = item
  while (result.length < len) {
    result = filler + result
  }
  return result
}

function padTo (len: number, item: string) {
  return leftPad('0', len, item)
}

function truncate (len: number, str: string) {
  return str.slice(0, len)
}

function truncate32 (str: string) {
  return truncate(32, str)
}

function parseBin (str: string) {
  return parseInt(str, 2)
}

function inGroupsOf (n: number, items: any[]) {
  const groups: any[][] = []
  let count = 0
  let group: any[] = []
  items.forEach((item) => {
    group.push(item)
    count += 1
    if (count >= n) {
      groups.push(group)
      group = []
      count = 0
    }
  })
  return groups
}

function splitEvery (n: number, str: string) {
  let pos = 0
  const chunks = []
  while (pos < str.length) {
    chunks.push(str.slice(pos, n + pos))
    pos += n
  }
  return chunks
}

export function parseWords (words: string[]): Uint8Array {
  const asBin = words.map(to11Bit).map(to11BitBin)
  const byteNums = inGroupsOf(3, asBin)
    .map((g) => g.join(''))
    .map(truncate32)
    .map((b32) => splitEvery(8, b32))
    .map((b8s) => b8s.map(parseBin))
    .reduce((all, nums) => all.concat(nums), [])
  return new Uint8Array(byteNums)
}

export function parseWordsChecksum (words: string[]): Uint8Array {
  const checksumWord = words[words.length - 1]
  const toParse = words.slice(0, words.length - 1)
  const bytes = parseWords(toParse)
  const checksum = bytes.reduce((a, n) => a + n, 0) % 2048
  if (checksum !== to11Bit(checksumWord)) {
    throw new Error(`Checksum mismatch: "${checksumWord}"`)
  }
  return bytes
}

export function encodeBytes (bytes: Uint8Array): string[] {
  return inGroupsOf(4, Array.from(bytes))
    .map((g) => g.map(to8BitBin).join(''))
    .map((b32) => b32 + '0')
    .map((b33) => splitEvery(11, b33))
    .map((b11s) => b11s.map(parseBin))
    .reduce((all, group) => all.concat(group), [])
    .map((wordNum) => wordlist[wordNum])
}
