// Bounded spatial memoization for deterministic world data. Adjacent cell lookups
// reuse one block instead of allocating a string/Map entry for every world tile.
export class SpatialCellCache {
  constructor(maxBlocks, blockSize = 16) {
    this.maxBlocks = maxBlocks;
    this.blockSize = blockSize;
    this.blocks = new Map();
    this.blockX = NaN;
    this.blockZ = NaN;
    this.lastBlock = null;
  }

  findBlock(x, z, create) {
    const blockX = Math.floor(x / this.blockSize);
    const blockZ = Math.floor(z / this.blockSize);
    if (blockX === this.blockX && blockZ === this.blockZ
      && (this.lastBlock || !create)) return this.lastBlock;

    const key = `${blockX}:${blockZ}`;
    let block = this.blocks.get(key);
    if (block) {
      // Touch at block boundaries, not on each individual cell lookup.
      this.blocks.delete(key);
      this.blocks.set(key, block);
    } else if (create) {
      block = new Array(this.blockSize * this.blockSize);
      this.blocks.set(key, block);
      if (this.blocks.size > this.maxBlocks) {
        this.blocks.delete(this.blocks.keys().next().value);
      }
    }
    this.blockX = blockX;
    this.blockZ = blockZ;
    this.lastBlock = block ?? null;
    return this.lastBlock;
  }

  get(x, z) {
    const block = this.findBlock(x, z, false);
    if (!block) return undefined;
    return block[(z - this.blockZ * this.blockSize) * this.blockSize
      + x - this.blockX * this.blockSize];
  }

  set(x, z, value) {
    const block = this.findBlock(x, z, true);
    block[(z - this.blockZ * this.blockSize) * this.blockSize
      + x - this.blockX * this.blockSize] = value;
  }
}

// Retain the overlapping depth samples when the water plane moves. Copy order
// matters: each source row must survive until it has been shifted in-place.
export class ScrollingDepthField {
  constructor(size) {
    this.size = size;
    this.data = new Uint8Array(size * size);
    this.originX = NaN;
    this.originZ = NaN;
  }

  update(originX, originZ, sample) {
    const { size, data } = this;
    const dx = originX - this.originX;
    const dz = originZ - this.originZ;
    if (dx === 0 && dz === 0) return false;

    const hasOverlap = Number.isInteger(dx) && Number.isInteger(dz)
      && Math.abs(dx) < size && Math.abs(dz) < size;
    const xStart = hasOverlap ? Math.max(0, -dx) : 0;
    const xEnd = hasOverlap ? Math.min(size, size - dx) : 0;
    const zStart = hasOverlap ? Math.max(0, -dz) : 0;
    const zEnd = hasOverlap ? Math.min(size, size - dz) : 0;
    if (hasOverlap) {
      const step = dz >= 0 ? 1 : -1;
      for (let z = step > 0 ? zStart : zEnd - 1; z >= zStart && z < zEnd; z += step) {
        data.copyWithin(z * size + xStart,
          (z + dz) * size + xStart + dx, (z + dz) * size + xEnd + dx);
      }
    }
    for (let z = 0; z < size; z += 1) {
      const retainedRow = z >= zStart && z < zEnd;
      const leftEnd = retainedRow ? xStart : size;
      for (let x = 0; x < leftEnd; x += 1) {
        data[z * size + x] = sample(originX + x, originZ + z);
      }
      if (retainedRow) {
        for (let x = xEnd; x < size; x += 1) {
          data[z * size + x] = sample(originX + x, originZ + z);
        }
      }
    }
    this.originX = originX;
    this.originZ = originZ;
    return true;
  }
}
