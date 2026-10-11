'use strict';

const BLOCKS_PER_LETTER = 1000;
const TOTAL_BLOCKS = 10_000_000_000;

function groupToLetters(groupIndex) {
  let value = groupIndex + 1;
  let letters = '';
  while (value > 0) {
    value -= 1;
    letters = String.fromCharCode(65 + (value % 26)) + letters;
    value = Math.floor(value / 26);
  }
  return letters;
}

function lettersToGroup(letters) {
  let value = 0;
  for (const char of letters.toUpperCase()) value = value * 26 + char.charCodeAt(0) - 64;
  return value - 1;
}

function format(blockId) {
  if (!Number.isSafeInteger(blockId) || blockId < 0 || blockId >= TOTAL_BLOCKS) {
    throw new RangeError('Block number must be between 0 and 9,999,999,999.');
  }
  return String(blockId % BLOCKS_PER_LETTER).padStart(3, '0') + groupToLetters(Math.floor(blockId / BLOCKS_PER_LETTER));
}

function parse(inputValue) {
  const input = String(inputValue).trim();
  if (/^\d+$/.test(input)) {
    const numericId = Number(input);
    return Number.isSafeInteger(numericId) && numericId >= 0 && numericId < TOTAL_BLOCKS ? numericId : null;
  }
  const match = /^(\d{3})([A-Z]+)$/i.exec(input);
  if (!match || Number(match[1]) > 999) return null;
  const blockId = lettersToGroup(match[2]) * BLOCKS_PER_LETTER + Number(match[1]);
  return Number.isSafeInteger(blockId) && blockId >= 0 && blockId < TOTAL_BLOCKS ? blockId : null;
}

module.exports = Object.freeze({ format, parse, totalBlocks: TOTAL_BLOCKS });
