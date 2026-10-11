(function (root) {
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
    for (const char of letters.toUpperCase()) {
      value = value * 26 + (char.charCodeAt(0) - 64);
    }
    return value - 1;
  }

  function format(blockId) {
    if (!Number.isSafeInteger(blockId) || blockId < 0 || blockId >= TOTAL_BLOCKS) {
      throw new RangeError('Block number must be between 0 and 9,999,999,999.');
    }
    const group = Math.floor(blockId / BLOCKS_PER_LETTER);
    const sequence = blockId % BLOCKS_PER_LETTER;
    return String(sequence).padStart(3, '0') + groupToLetters(group);
  }

  function parse(value) {
    const input = String(value).trim();
    if (/^\d+$/.test(input)) {
      const numericId = Number(input);
      return Number.isSafeInteger(numericId) && numericId >= 0 && numericId < TOTAL_BLOCKS
        ? numericId
        : null;
    }

    const match = /^(\d{3})([A-Z]+)$/i.exec(input);
    if (!match) return null;
    const sequence = Number(match[1]);
    if (sequence > 999) return null;
    const blockId = lettersToGroup(match[2]) * BLOCKS_PER_LETTER + sequence;
    return Number.isSafeInteger(blockId) && blockId >= 0 && blockId < TOTAL_BLOCKS
      ? blockId
      : null;
  }

  const api = Object.freeze({ format, parse, totalBlocks: TOTAL_BLOCKS });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.BlockId = api;
})(typeof window !== 'undefined' ? window : globalThis);
