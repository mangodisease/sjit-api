const mongoose = require('mongoose')

const users = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true
    },
    student: {type: mongoose.Schema.Types.ObjectId, ref: "students"},
    teacher: {type: mongoose.Schema.Types.ObjectId, ref: "teachers"},
    isAdmin: { type: Boolean, required: true, default: false }
},
    {
        strict: false,
        timestamps: { createdAt: 'createdAt' },
        collection: 'users',
    }
)

module.exports = mongoose.model('users', users) 