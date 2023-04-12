const mongoose = require('mongoose')
//PRESENT, LATE
const attendance = new mongoose.Schema({
    timeIn: { type: String, required: true },
    timeOut: { type: String, required: true },
    student: {type: mongoose.Schema.Types.ObjectId, ref: "students"},
    teacher: {type: mongoose.Schema.Types.ObjectId, ref: "teachers"},
    class_schedule: {type: mongoose.Schema.Types.ObjectId, ref: "class_schedule"},
    remarks: { type: String, required: true, default: "PRESENT" },
},
    {
        strict: false,
        timestamps: { createdAt: 'createdAt' },
        collection: 'attendance',
    }
)

module.exports = mongoose.model('attendance', attendance) 