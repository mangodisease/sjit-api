const express = require("express");
const faceapi = require("face-api.js");
const mongoose = require("mongoose");
const { Canvas, Image } = require("canvas");
const canvas = require("canvas");
const fileUpload = require("express-fileupload");
const moment = require("moment");
const bcrypt = require("bcrypt")
const cors = require("cors")
const { getTimeDiff } = require("time-difference-js");

const db = require("./db")

faceapi.env.monkeyPatch({ Canvas, Image });

const app = express();

app.use(
  fileUpload({
    useTempFiles: true,
  })
);

app.use(express.json({ limit: '50mb' }));
//app.use(express.urlencoded({limit: '50mb'}));

app.use(cors())
app.use(express.json())

async function LoadModels() {
  // Load the models
  // __dirname gives the root directory of the server
  await faceapi.nets.faceRecognitionNet.loadFromDisk(__dirname + "/models");
  await faceapi.nets.faceLandmark68Net.loadFromDisk(__dirname + "/models");
  await faceapi.nets.ssdMobilenetv1.loadFromDisk(__dirname + "/models");
}
LoadModels();

async function uploadLabeledImages(images) {
  try {
    //let counter = 0;
    const descriptions = [];
    // Loop through the images
    for (let i = 0; i < images.length; i++) {
      const img = await canvas.loadImage(images[i]);
      //counter = (i / images.length) * 100;
      //console.log(`Progress = ${counter}%`);
      // Read each face and save the face descriptions in the descriptions array
      const detections = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
      descriptions.push(detections.descriptor);
    }

    // Create a new face document with the given name and save it in DB

    return descriptions
  } catch (error) {
    console.log(error);
    return []
  }
}

async function getDescriptorsFromDB(image) {
  // Get all the face data from mongodb and loop through each of them to read the data
  let faces = await db.students.find().select("_id name descriptions").lean();
  //console.log(faces)
  for (i = 0; i < faces.length; i++) {
    // Change the face data descriptors from Objects to Float32Array type
    for (j = 0; j < faces[i].descriptions.length; j++) {
      faces[i].descriptions[j] = new Float32Array(Object.values(faces[i].descriptions[j]));
    }
    // Turn the DB face docs to
    faces[i] = new faceapi.LabeledFaceDescriptors(faces[i]._id.toString(), faces[i].descriptions);
  }

  // Load face matcher to find the matching face
  const faceMatcher = new faceapi.FaceMatcher(faces, 0.6);

  // Read the image using canvas or other method
  const img = await canvas.loadImage(image);
  let temp = faceapi.createCanvasFromMedia(img);
  // Process the image for the model
  const displaySize = { width: img.width, height: img.height };
  faceapi.matchDimensions(temp, displaySize);

  // Find matching faces
  const detections = await faceapi.detectAllFaces(img).withFaceLandmarks().withFaceDescriptors();
  const resizedDetections = faceapi.resizeResults(detections, displaySize);
  const results = resizedDetections.map((d) => faceMatcher.findBestMatch(d.descriptor));
  return results;
}

app.post("/login", async (req, res) => {
  try {
    const val = req.body
    console.log(val)
    const username = val.username
    const password = val.password
    const col = val.col
    console.log(col)
    let user = await db[col].find({ username: username, password: password })
    console.log(user)
    if (user.length > 0) {
      res.status(200).json({ login: true, msg: "Successfuly Login", user: user[0] })
    } else {
      res.status(201).json({ login: false, msg: "Invalid username!", user: null })
    }
  } catch (err) {
    console.log(err.message)
    res.status(500)
  }
})

app.post("/add-student", async (req, res) => {
  try {
    const File = req.files.File.tempFilePath
    const val = JSON.parse(req.body.body)
    let result = await uploadLabeledImages([File])
    if (result.length !== 0) {
      //save to database
      val.descriptions = result
      const data = new db.students(val)
      const n = await data.save()
      console.log(n)
      res.json({ msg: "Student Successfully Added", isAdded: true })
    } else {
      res.json({ msg: "Something went wrong, please try again.", isAdded: false })

    }
  } catch (err) {
    console.log(err.message)
    res.status(500).json({ err: err.message, isAdded: false })
  }
})

app.post("/update-student", async (req, res) => {
  try {
    const val = JSON.parse(req.body.body)
    console.log(val)
    if (val.updateImage === true) {
      const File = req.files.File.tempFilePath
      let result = await uploadLabeledImages([File])
      if (result.length !== 0) {
        //save to database
        val.descriptions = result
        const udata = await db.students.updateOne({ _id: val._id }, val)
        console.log(udata)
        res.status(200).json({ updated: udata.ok === 1 && udata.nModified >= 1 ? true : false })
      } else {
        res.json({ msg: "Something went wrong, please try again.", updated: false })
      }

    } else {
      const udata = await db.students.updateOne({ _id: val._id }, val)
      console.log(udata)
      res.status(200).json({ updated: udata.ok === 1 && udata.nModified >= 1 ? true : false })
    }

  } catch (err) {
    console.log(err.message)
    res.status(500).json({ err: err.message, isAdded: false })
  }
})


app.post("/attendance-check", async (req, res) => {
  try {
    const File = req.files.File.tempFilePath;
    console.log(req.body.val)
    const val = JSON.parse(req.body.val)

    const student_id = val.student_id
    const teacher_id = val.teacher_id
    const class_schedule_id = val.class_schedule_id
    const class_schedule_time = val.class_schedule_time
    const what = val.what

    const today = moment().format("MM/DD/YYYY HH:MM:SS")
    const startDate = new Date(moment(`${today} ${class_schedule_time}`).format("MM/DD/YYYY HH:MM:SS"));
    const endDate = new Date(today);
 
    const dur = getTimeDiff(startDate, endDate);
    console.log(dur)
    const duration = 0//moment.duration(moment().diff(moment(`${today} ${class_schedule_time}`))).minutes()
    const time = moment().format("MMM-DD-YYYY @ hh:mm:ss A")
    //set remarks
    const remarks = duration > 30 ? `${duration} minutes LATE` : "PRESENT"
    console.log(remarks)
    let result = await getDescriptorsFromDB(File);
    if (result.length !== 0) {
      const rslt = result[0]
      const _id = rslt._label
      let msg
      //identify if attending student is just borrowing for attendance
      if (_id === 'unknown') {
        res.status(200).json({ msg: "Unregistered face detected!" })
      } else {
        if (_id !== student_id) {
          res.status(200).json({ msg: "Face detected is not recognized! Please try again." })
        } else {
          msg = `Successfully Participated!`
          const conf = (rslt._distance * 100)  + 55
          const studInfo = await db.students.findOne({ _id: _id }).select('_id name').lean()
          console.log(studInfo)
          const data = new db.attendance({
            what: what,
            time: time,
            student: studInfo._id,
            teacher: teacher_id,
            class_schedule: class_schedule_id,
            remarks: remarks
          })
          await data.save()
          res.json({ msg: msg, name: studInfo.name, time: time, remark: remarks, confidence: conf !== 0 && conf< 100 ? `${(conf).toFixed(2)}%` : "99.9%" });
        }
        
      }
    } else {
      res.status(200).json({ msg: "Unable to detect or recognized face! Please try again." })
    }

  } catch (err) {
    console.log(err.message)
    res.status(500)
  }
});

app.post("/test-attendance", async (req, res) => {
  try {
    const File = req.files.File.tempFilePath;

    let result = await getDescriptorsFromDB(File);
    if (result.length !== 0) {
      const rslt = result[0]
      const _id = rslt._label
      const conf = rslt._distance
      const studInfo = await db.students.findOne({ _id: _id }).select('name').lean()

      res.json({ name: studInfo.name, confidence: conf !== 0 ? `${(conf * 100 + 20).toFixed(2)}%` : "99.9%" });
    } else {
      res.status(200).json({ msg: "Unable to detect or recognized face! Please try again." })
    }

  } catch (err) {
    console.log(err.message)
    res.status(500)
  }
});


app.post("/get", async (req, res) => {
  try {
    const val = req.body
    const col = val.col
    const select = val.select
    const query = val.query
    const join = val.join
    var rslt = await db[col].find(query)
    const result = await db[col].populate(rslt, { path: join !== undefined ? join : "", select: select })
    res.status(200).json({ result: result })
  } catch (err) {
    console.log(err.message)
    res.status(500)
  }
})


function isJSON(val) {
  try {
    return [true, JSON.parse(val)]
  } catch (err) {
    //console.log(err.message)
    return [false, null]
  }
}
app.post("/insert", async (req, res) => {
  try {
    const val = req.body
    //console.log(val)
    const col = val.col
    const data = val.data
    const nd = new db[col](data)
    const nnd = await nd.save()
    res.status(200).json({ inserted: nd === nnd, data: nnd })
  } catch (err) {
    console.log(err.message)
    res.status(500)
  }
})

app.post("/update", async (req, res) => {
  try {
    const val = req.body
    const col = val.col
    const data = val.data
    const query = val.query
    const udata = await db[col].updateOne(query, data)

    res.status(200).json({ updated: udata.ok === 1 && udata.nModified >= 1 ? true : false })
  } catch (err) {
    console.log(err.message)
    res.status(500)
  }
})

app.post("/remove", async (req, res) => {
  try {
    const val = req.body
    const col = val.col
    const _id = val._id
    const d = await db[col].deleteOne({ _id: _id })

    res.status(200).json({ deleted: true, data: d })
  } catch (err) {
    console.log(err.message)
    res.status(500)
  }
})
// add your mongo key instead of the ***
mongoose
  .connect(
    `mongodb+srv://sjit:pass@attendance.3txyowa.mongodb.net/sjit`,
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true,
    }
  )
  .then(() => {
    app.listen(process.env.PORT || 5000);
    console.log("DB connected and server us running.");
  })
  .catch((err) => {
    console.log(err);
  });