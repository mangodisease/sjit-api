const mongoose = require('mongoose')

const class_schedule = new mongoose.Schema({
    subject: { type: String, required: true },
    description: { type: String, required: false },
    course: { type: String, required: true },
    year_level: { type: String, required: true },
    teacher: {type: mongoose.Schema.Types.ObjectId, ref: "teachers"},
    days: { type: [String], required: true },
    time: { type: [String], required: true },
    status: { type: String, default: "active" }
},
    {
        strict: false,
        timestamps: { createdAt: 'createdAt' },
        collection: 'class_schedule',
    }
)

module.exports = mongoose.model('class_schedule', class_schedule) 