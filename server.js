const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const cors = require('cors')

const mongoose = require('mongoose')
mongoose.connect(process.env.MONGOLAB_URI)

// Create workout schema
let workoutSchema = mongoose.Schema({
  username: String,
  exercises: [{
    description: String,
    duration: Number,
    date: Date
  }]
  },
  { usePushEach: true }
);

// Create workout model
let workoutModel = mongoose.model('workout', workoutSchema);

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())

app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// Adds new user
app.post('/api/exercise/new-user', (req, res) => {
  // Check if name already exists
  workoutModel.findOne({
    username: req.body.username
  }, (err, data) => {
    if (data) {
      // Return error
      res.json({ error: 'Name already exists.' });
    } else {
      // Create new workout
      let newWorkout = new workoutModel({
        username: req.body.username,
        exercises: []
      });      
      newWorkout.save((errSave, dataSave) => {
        res.json({
          username: dataSave.username,
          _id: dataSave._id
        });
      });
    }
  });
});

// Returns users
app.get('/api/exercise/users', (req, res) => {
  // Get all workout data
  workoutModel.find({}, (err, data) => {
    let users = []
    
    // Go through each user
    data.forEach((user) => {
      // Add user info
      users.push({
        username: user.username,
        _id: user._id
      });
    });

    // Return results
    res.json(users);
  });
});

// Adds exercise to user
app.post('/api/exercise/add', (req, res) => {
  // Get date
  let date;
  if (req.body.date) {
    date = new Date(req.body.date);
  } else {
    date = new Date();
  }
    
  // Get matching model
  workoutModel.findById(req.body.userId, (err, data) => {
    if (!data) {
      // Return error
      res.json({error: 'ID not found'});
    } else {
      // Append workout
      data.exercises.push({
        description: req.body.description,
        duration: Number(req.body.duration),
        date: date
      });
      
      data.save((errSave, dataSave) => {
        console.log(errSave);
        // Return workout info
        res.json(dataSave);
      });
    }
  });
});

// Returns exercise log of single user
app.get('/api/exercise/log', (req, res) => {  
  // Get workout
  workoutModel.findById(req.query.userID, (errWorkout, dataWorkout) => {
    if (!dataWorkout) {
      // Return error
      res.json({error: 'ID not found'});
    } else {
      let exerciseList = [];
      
      // Go through each exercise
      dataWorkout.exercises.forEach((workout) => {        
        // Check if within filter
        if ((!req.query.from || new Date(req.query.from) <= workout.date) &&
            (!req.query.to || new Date(req.query.to) >= workout.date) &&
            (!req.query.limit || req.query.limit > exerciseList.length)) {
          // Add exercise info
          exerciseList.push({
            description: workout.description,
            duration: workout.duration,
            date: workout.date
          });
        }
      });
      
      // Return exercise log
      res.json({
        count: exerciseList.length,
        exercises: exerciseList
      });
    }
  });  
});

// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
