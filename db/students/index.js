const mongoose = require('mongoose')

const students = new mongoose.Schema({
    std_id: {
        type: String,
        required: true,
        unique: true,
    },
    name: {
        type: String,
        required: true,
        unique: true,
    },
    course: { type: String, required: true },
    year_level: { type: String, required: true },
    section: { type: String, required: false },
    birthdate: { type: String, required: true },
    parent: { type: String, required: true },
    parent_contact: { type: String, required: true },
    image: { type: String },
    descriptions: {
        type: Array,
        required: true,
    },
    username: {
        type: String,
        required: true,
        unique: true,
    },
    password: { type: String, required: true },
    status: { type: String, default: "enrolled" }
},
    {
        strict: false,
        timestamps: { createdAt: 'createdAt' },
        collection: 'students',
    }
)

module.exports = mongoose.model('students', students) 