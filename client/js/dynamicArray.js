self.DynamicArray = function DynamicArray(type, chunkSize) {
    this.type = type;
    this.chunkSize = chunkSize;
    this.chunks = [];
    this.totalSize = 0;
    this.currentChunk = null;
    this.currentIndex = 0;
}

DynamicArray.prototype.push = function(item) {
    if (!this.currentChunk || this.currentIndex >= this.chunkSize) {
        this.currentChunk = new this.type(this.chunkSize);
        this.currentIndex = 0;
        this.chunks.push(this.currentChunk);
    }
    this.totalSize++;
    this.currentChunk[this.currentIndex++] = item;
};

DynamicArray.prototype.concat = function() {
    if (this.totalSize === 0) {
        return new this.type(0);
    }
    var whole = new this.type(this.totalSize);
    var offset = 0,
        i;
    for (i = 0; i < this.chunks.length - 1; i++) {
        whole.set(this.chunks[i], offset);
        offset += this.chunkSize;
    }
    whole.set(this.chunks[i].subarray(0, this.currentIndex), offset);
    return whole;
};