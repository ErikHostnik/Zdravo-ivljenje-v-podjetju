

function writeBits(bits, value, length) {
  for (let b = length - 1; b >= 0; b--) {
    bits.push((value >> b) & 1);
  }
}

function readBits(code, state, length) {
  let value = 0;
  for (let i = 0; i < length; i++) {
    value = (value << 1) | code[state.pos++];
  }
  return value;
}

function compress(array) {
  if (!array.length) return [];

  const bits = [];
  writeBits(bits, array[0], 8);

  let i = 1;
  while (i < array.length) {
    const diff = array[i] - array[i - 1];

    if (diff === 0) {
      bits.push(0, 1);
      let count = 0;
      let j = i;

      while (j < array.length && array[j] - array[j - 1] === 0 && count < 8) {
        count++;
        j++;
      }

      writeBits(bits, count - 1, 3);
      i += count;
      continue;
    }

    if (Math.abs(diff) <= 2) {
      bits.push(0, 0, 0, 0);
      writeBits(bits, diff < 0 ? diff + 2 : diff + 1, 2);
    } else if (Math.abs(diff) <= 6) {
      bits.push(0, 0, 0, 1);
      writeBits(bits, diff < 0 ? diff + 6 : diff + 1, 3);
    } else if (Math.abs(diff) <= 14) {
      bits.push(0, 0, 1, 0);
      writeBits(bits, diff < 0 ? diff + 14 : diff + 1, 4);
    } else if (Math.abs(diff) <= 30) {
      bits.push(0, 0, 1, 1);
      writeBits(bits, diff < 0 ? diff + 30 : diff + 1, 5);
    } else {
      bits.push(1, 0);
      bits.push(diff < 0 ? 1 : 0);
      writeBits(bits, Math.abs(diff), 8);
    }

    i++;
  }

  bits.push(1, 1);
  return bits;
}

function decompress(code) {
  const diffs = [];
  const state = { pos: 0 };

  const first = readBits(code, state, 8);
  diffs.push(first);

  while (state.pos + 1 < code.length) {
    const prefix = readBits(code, state, 2);

    if (prefix === 0) {
      const sub = readBits(code, state, 2);
      let v;

      if (sub === 0) {
        v = readBits(code, state, 2);
        v = v <= 1 ? v - 2 : v - 1;
      } else if (sub === 1) {
        v = readBits(code, state, 3);
        v = v <= 3 ? v - 6 : v - 1;
      } else if (sub === 2) {
        v = readBits(code, state, 4);
        v = v <= 7 ? v - 14 : v - 1;
      } else {
        v = readBits(code, state, 5);
        v = v <= 15 ? v - 30 : v - 1;
      }

      diffs.push(v);
    }
    else if (prefix === 1) {
      const cnt = readBits(code, state, 3) + 1;
      for (let k = 0; k < cnt; k++) diffs.push(0);
    }
    else if (prefix === 2) {
      const sign = readBits(code, state, 1);
      let v = readBits(code, state, 8);
      if (sign) v = -v;
      diffs.push(v);
    }
    else break;
  }

  const out = [];
  for (let i = 0; i < diffs.length; i++) {
    out.push(i === 0 ? diffs[i] : out[i - 1] + diffs[i]);
  }

  return out;
}

module.exports = { compress, decompress };
