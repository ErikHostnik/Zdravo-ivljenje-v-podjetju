

function bufferToBits(buf, totalBits){
  const bits = new Array(totalBits);
  for (let i = 0; i < totalBits; i++){
    const byteIdx = i >> 3;
    const bitIdx = 7 - (i & 7);
    const b = buf[byteIdx] || 0;
    bits[i] = (b >> bitIdx) & 1;
  }
  return bits;
}
function bitsToBuffer(bits){
  const len = Math.ceil(bits.length / 8);
  const bytes = new Uint8Array(len);
  for (let i = 0; i < bits.length; i++){
    const byteIdx = i >> 3;
    const bitIdx = 7 - (i & 7);
    if (bits[i]) bytes[byteIdx] |= (1 << bitIdx);
  }
  return Buffer.from(bytes);
}
module.exports = { bufferToBits, bitsToBuffer };
