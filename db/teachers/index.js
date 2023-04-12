const mongoose = require('mongoose')

const teachers = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
    },
    image: { type: String, required: true },
    address: { type: String, required: true },
    birthdate: { type: String, required: true },
    designation: { type: String, required: true },
    contact: { type: String, required: true },
    username: {
        type: String,
        required: true,
        unique: true,
    },
    password: { type: String, required: true },
    status: { type: String, default: "active" }
},
    {
        strict: false,
        timestamps: { createdAt: 'createdAt' },
        collection: 'teachers',
    }
)

module.exports = mongoose.model('teachers', teachers) 