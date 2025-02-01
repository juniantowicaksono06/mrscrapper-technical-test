// Model to hold all the requests and products

import { Schema, model, models } from "mongoose";

const itemSchema = new Schema({
    product_name: String,
    product_price: String,
    product_description: String
})

const requestSchema = new Schema({
    transactionId: {
        type: String,
        required: true,
        unique: true
    },
    searchQuery: {
        type: String,
        required: true
    },
    status: {
        type: String, // Type 'success', 'processing', 'failed'
        required: true
    },
    log: {
        type: String,
        required: false,
    },
    date: {
        type: Date,
        default: Date.now
    },
    items: [itemSchema]
})

export const Request = models.Request || model("Request", requestSchema);