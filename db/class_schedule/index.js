const mongoose = require('mongoose')

const class_schedule = new mongoose.Schema({
    subject: { type: String, required: true },
    description: { type: String, required: true },
    course: { type: String, required: true },
    teacher: {type: mongoose.Schema.Types.ObjectId, ref: "teachers"},
    days: { type: [String], required: true },
    time: { type: [String], required: true }
},
    {
        timestamps: { createdAt: 'createdAt' },
        collection: 'class_schedule',
    }
)

module.exports = mongoose.model('class_schedule', class_schedule) 