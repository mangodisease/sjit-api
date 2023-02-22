const mongoose = require('mongoose')

const enrolled = new mongoose.Schema({
    student: {type: mongoose.Schema.Types.ObjectId, ref: "students"},
    class_schedule: {type: mongoose.Schema.Types.ObjectId, ref: "class_schedule"},
    teacher: {type: mongoose.Schema.Types.ObjectId, ref: "teachers"}
},
    {
        strict: false,
        timestamps: { createdAt: 'createdAt' },
        collection: 'enrolled',
    }
)

module.exports = mongoose.model('enrolled', enrolled) 