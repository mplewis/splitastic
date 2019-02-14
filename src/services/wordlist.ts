import wordlist from '@/vendor/wordlists/english.ts'

function to11Bit (word: string) {
  const index = wordlist.indexOf(word)
  if (index === -1) {
    throw new Error(`Could not find ${word}`)
  }
  return index
}

function toBin (i: number) {
  // tslint:disable no-bitwise
  return (i >>> 0).toString(2)
}

function leftPad (filler: string, len: number, item: string) {
  let result = item
  while (result.length < len) {
    result = filler + result
  }
  return result
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
  const asBin = words
    .map(to11Bit)
    .map(toBin)
    .map((b) => leftPad('0', 11, b))
  const byteNums = inGroupsOf(3, asBin)
    .map((g) => g.join(''))
    .map((b33) => b33.slice(0, 32))
    .map((b32) => splitEvery(8, b32))
    .map((b8s) => b8s.map((b8) => parseInt(b8, 2)))
    .reduce((all, nums) => all.concat(nums), [])
  return new Uint8Array(byteNums)
}
