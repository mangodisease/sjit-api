const mongoose = require('mongoose')

const teachers = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true,
        unique: true,
    },
    designation: { type: String, required: true },
    description: { type: String, required: true },
    isAdmin: { type: Boolean, required: true, default: false }
},
    {
        strict: false,
        timestamps: { createdAt: 'createdAt' },
        collection: 'teachers',
    }
)

module.exports = mongoose.model('teachers', teachers) 