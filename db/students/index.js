const mongoose = require('mongoose')

const students = new mongoose.Schema({
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
    descriptions: {
        type: Array,
        required: true,
    },
},
    {
        timestamps: { createdAt: 'createdAt' },
        collection: 'students',
    }
)

module.exports = mongoose.model('students', students) 