const express = require("express");
const faceapi = require("face-api.js");
const mongoose = require("mongoose");
const { Canvas, Image } = require("canvas");
const canvas = require("canvas");
const fileUpload = require("express-fileupload");
const moment = require("moment");
const bcrypt = require("bcrypt")
const cors = require("cors")

const db = require("./db")

faceapi.env.monkeyPatch({ Canvas, Image });

const app = express();

app.use(
  fileUpload({
    useTempFiles: true,
  })
);
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
  console.log(faces)
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

app.post("/login", async (req, res)=>{
  try {
    const val = req.body
    const username = val.username
    const password = val.password
    const user = await db.users.findOne({ username: username })
    .select(" -__v -createdAt -updatedAt")
    .populate("teacher").populate("student")
    .lean()
    console.log(user)
    if(user!==undefined){
      //bcrypt comapre
      if(bcrypt.compareSync(password, user.password)){
        res.status(200).json({ login: true, msg: "Successfuly Login", user: user })
      } else {
        res.status(201).json({ login: false, msg: "Incorrect Password", user: null })
      }
      
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
      const data = new db.students({
        //username: val.name.replaceAll(" ", "").toLowerCase(),
        //password: "$2a$12$foRhnB/Dp3k6KAGSunWcy.Yy8zF4emUarKGrX62c9p1dqKJbaPoCu", //password
        name: val.name,
        course: val.course,
        year_level: val.year_level,
        birthdate: val.birthdate,
        parent: val.parent,
        parent_contact: val.parent_contact,
        descriptions: result,
        //image: File
      })
      const n = await data.save()
      console.log(n)
      res.json({ message: "Face data stored successfully", data: n })
    } else {
      res.json({ message: "Something went wrong, please try again." })

    }
  } catch (err) {
    console.log(err.message)
    res.status(500).json({ err: err.message })
  }
})

app.post("/test-add-student", async (req, res) => {
  try {
    const File = req.files.File.tempFilePath
    const val = JSON.parse(req.body.body)
    console.log(File)
    console.log(val)
    res.json({ body: val})
  } catch (err) {
    console.log(err.message)
    res.status(500).json({ err: err.message })
  }
})

app.post("/attendance-check", async (req, res) => {
  try {
    const File = req.files.File.tempFilePath;
    const val = req.body

    const student_id = val.student_id
    const teacher_id = val.teacher_id
    const class_schedule_id = val.class_schedule_id
    const class_schedule_time = val.class_schedule_time
    
    const duration = moment.duration(moment().diff(moment(`${moment().format("MM-DD-YYYY ")}${class_schedule_time}`))).minutes()
    const timeIn = moment().format("MMM-DD-YYYY@hh:mm:ss A")
    console.log(duration)
    //set remarks
    const remarks = duration>30? `${duration} minutes LATE` : "PRESENT"
    console.log(remarks)
    let result = await getDescriptorsFromDB(File);
    if(result.length!==0){
      const rslt = result[0]
      const _id = rslt._label
      let msg
      //identify if attending student is just borrowing for attendance
      if(_id!==student_id){
        //borrowed phone for attendance
        msg =  `Successfully Participated! Note: Account login is not the same with the face recognized`
      } else {
        msg =  `Successfully Participated!`
      }
      const conf = rslt._distance
      const studInfo = await db.students.findOne({ _id: _id }).select('-_id').lean()
      console.log(studInfo)
      const data = new db.attendance({
        timeIn: timeIn,
        student: studInfo._id,
        teacher: teacher_id,
        class_schedule: class_schedule_id,
        remarks: remarks
      })
      await data.save()
      res.json({ timeIn: timeIn, remark: remarks, confidence: conf !== 0? `${(conf * 100 + 20).toFixed(2)}%` : "99.9%" });
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
    if(result.length!==0){
      const rslt = result[0]
      const _id = rslt._label
      const conf = rslt._distance
      const studInfo = await db.students.findOne({ _id: _id }).select('name').lean()
      
      res.json({ name: studInfo.name, confidence: conf !== 0? `${(conf * 100 + 20).toFixed(2)}%` : "99.9%" });
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

    const result = await db[col].find(query).select(select).lean()
    res.status(200).json({ result: result })
  } catch (err) {
    console.log(err.message)
    res.status(500)
  }
})

app.post("/insert", async (req, res) => {
  try {
    const val = req.body
    console.log(val)
    const col = val.col
    const data = val.data
    const nd =  new db[col](data)
    const nnd = await nd.save()
    res.status(200).json({ inserted: nd===nnd, data: nnd })
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

    res.status(200).json({ updated: udata.ok === 1 && udata.nModified >=1? true : false })
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