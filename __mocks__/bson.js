// Mock for bson module to prevent ES module parsing errors in Jest

// Mock ObjectId
class ObjectId {
    constructor(id) {
        this.id = id || 'mock-object-id';
    }
    toString() {
        return this.id;
    }
}

// Mock common BSON types
class Binary {
    constructor(data, subType) {
        this.data = data;
        this.subType = subType;
    }
}

class Code {
    constructor(code, scope) {
        this.code = code;
        this.scope = scope;
    }
}

class DBRef {
    constructor(collection, oid, db) {
        this.collection = collection;
        this.oid = oid;
        this.db = db;
    }
}

class Decimal128 {
    constructor(bytes) {
        this.bytes = bytes;
    }
}

class Double {
    constructor(value) {
        this.value = value;
    }
}

class Int32 {
    constructor(value) {
        this.value = value;
    }
}

class Long {
    constructor(low, high) {
        this.low = low;
        this.high = high;
    }
}

class MaxKey {
    constructor() {}
}

class MinKey {
    constructor() {}
}

class Timestamp {
    constructor(t, i) {
        this.t = t;
        this.i = i;
    }
}

class UUID {
    constructor(bytes) {
        this.bytes = bytes;
    }
}

module.exports = {
    ObjectId,
    Binary,
    Code,
    DBRef,
    Decimal128,
    Double,
    Int32,
    Long,
    MaxKey,
    MinKey,
    Timestamp,
    UUID
};