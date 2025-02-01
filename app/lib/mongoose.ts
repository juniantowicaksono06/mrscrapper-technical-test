import mongoose, { Connection } from "mongoose";

let client: Connection | null = null;

const MONGODB_URI = process.env.MONGODB_URI as string;

interface DbConnection {
    client: Connection;
}

async function connectToDb(): Promise<DbConnection> {
    if (client) {
        return { client };
    }

    await mongoose.connect(MONGODB_URI);

    client = mongoose.connection;

    console.log("Connected to the Database");
    return { client };
}

export default connectToDb;