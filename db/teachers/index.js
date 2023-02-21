const mongoose = require('mongoose')

const teachers = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
    },
    designation: { type: String, required: true },
    description: { type: String, required: true }
},
    {
        timestamps: { createdAt: 'createdAt' },
        collection: 'teachers',
    }
)

module.exports = mongoose.model('teachers', teachers) 