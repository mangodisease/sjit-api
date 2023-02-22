const students = require("./students")
const attendance = require("./attendance")
const class_schedule = require("./class_schedule")
const enrolled = require("./enrolled")
const teachers = require("./teachers")
const users = require("./users")

module.exports = {
    users: users,
    students: students,  
    attendance: attendance,
    class_schedule: class_schedule,
    enrolled: enrolled,
    teachers: teachers
}