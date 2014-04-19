self.DynamicArray = function DynamicArray(type) {
    this.type = type;
    this.chunkSize = 16;
    this.chunks = [];
    this.totalSize = 0;
    this.currentChunk = null;
    this.currentIndex = 0;
}

DynamicArray.prototype.push = function (item) {
    if (!this.currentChunk || this.currentIndex >= this.chunkSize) {
        this.chunkSize *= 2;
        this.currentChunk = new this.type(this.chunkSize);
        this.currentIndex = 0;
        this.chunks.push(this.currentChunk);
    }
    this.currentChunk[this.currentIndex++] = item;
    return this.totalSize++;
};

DynamicArray.prototype.concat = function () {
    if (this.totalSize === 0) {
        return new this.type(0);
    }
    var whole = new this.type(this.totalSize);
    var offset = 0,
        i;
    for (i = 0; i < this.chunks.length - 1; i++) {
        whole.set(this.chunks[i], offset);
        offset += this.chunks[i].length;
    }
    whole.set(this.chunks[i].subarray(0, this.currentIndex), offset);
    return whole;
};
