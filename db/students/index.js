const mongoose = require('mongoose')

const students = new mongoose.Schema({
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
    course: { type: String, required: true },
    year_level: { type: String, required: true },
    birthdate: { type: String, required: true },
    parent: { type: String, required: true },
    parent_contact: { type: String, required: true },
    image: { type: Buffer },
    descriptions: {
        type: Array,
        required: true,
    },
},
    {
        strict: false,
        timestamps: { createdAt: 'createdAt' },
        collection: 'students',
    }
)

module.exports = mongoose.model('students', students) 