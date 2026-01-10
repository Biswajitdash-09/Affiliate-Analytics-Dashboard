// Mock for mongodb module to prevent ES module parsing errors in Jest
const MongoClient = jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue({
        db: jest.fn().mockReturnValue({
            collection: jest.fn().mockReturnValue({
                find: jest.fn().mockReturnValue({
                    toArray: jest.fn().mockResolvedValue([]),
                    sort: jest.fn().mockReturnThis(),
                    limit: jest.fn().mockReturnThis(),
                    skip: jest.fn().mockReturnThis(),
                }),
                insertOne: jest.fn().mockResolvedValue({ insertedId: 'mock-id' }),
                updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
                findOne: jest.fn().mockResolvedValue(null),
                countDocuments: jest.fn().mockResolvedValue(0),
                aggregate: jest.fn().mockReturnValue({
                    toArray: jest.fn().mockResolvedValue([]),
                }),
            }),
        }),
    }),
    collection: jest.fn(),
}));

class ObjectId {
    constructor(id) {
        this.id = id || 'mock-id';
    }
    toString() {
        return this.id;
    }
    toJSON() {
        return this.id;
    }
    static isValid(id) {
        return !!id;
    }
}

module.exports = {
    MongoClient,
    ObjectId
};