const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const cors = require('cors')

const uri = 'mongodb+srv://Judge:456fg789%23%25%24@cluster0-3ldxj.mongodb.net/test?retryWrites=true&w=majority';

const mongoose = require('mongoose')
mongoose.connect(uri, {useNewUrlParser: true}, (err) => {
  if(err) console.log(err);
})

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


// Not found middleware
// app.use((req, res, next) => {
//   return next({status: 404, message: 'not found'})
// })

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

//Schemas

const Schema = mongoose.Schema;


var exerciseSchema = new Schema({
  description: {
    type: String,
    required: true,
  },
  duration: {
    type: Number,
    required: true
  },
  date: String
}, {_id: false});


var userSchema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  _id: {
    type: String,
    unique: true
  },
  count: Number,
  log: [exerciseSchema]
})



var User = mongoose.model('User', userSchema);
// var Exercise = mongoose.model('Excercise', exerciseSchema);

app.get('/find', (req, res) => {
  User.find({}, (err, data) => {
    res.send(data);
  })
})
app.get('/remove', (req, res) => {

  User.remove({}, (err, data) => {
    if(!err) res.redirect('/find')
  });
})

app.post('/api/exercise/new-user', (req, res) => {
  var username = req.body.username;
  User.findOne({username: username}, (err, person) => {
    if(!person) {
      var user = new User({
        username: req.body.username,
        _id: generateId(9),
        count: 0,
        log: []
      });
  
      user.save((err, data) => {
        if(err) res.send('username already taken');
        res.json({username: data.username, _id: data._id});
      })
    } else {
      res.json({username: person.username, _id: person._id});
    }
  })

})

function generateId(count) {
    var sym = 'abcdefghijklmnopqrstuvwxyz0123456789', _id= '';
    for(let i = 0; i < count; i++) {
        _id += sym[parseInt(Math.random() * sym.length)]
    }
    return _id;
}

app.post('/api/exercise/add', (req, res) => {
  var e_date, d;
  if(!req.body.date) {
    d = new Date();
    e_date = d.toDateString();
  } else {
    d = new Date(req.body.date);
    e_date = d.toDateString().replace(d.getDate().toString(), d.getUTCDate().toString());
  }
  console.log(req.body.userId)
  User.findById(req.body.userId, (err, user) => {
    if(err) res.send(err);

    var exercise = {
      description: req.body.description,
      duration: Number(req.body.duration),
      date: e_date
    }
    
    user.log.unshift(exercise);
    user.count = user.log.length;
    user.save((err, data) => {
      if(err) console.log(err);
      res.json({username: user.username, description: exercise.description, duration: exercise.duration, _id: user._id, date: exercise.date});
    })
  })

})

function getDate(str) {
  let dt = new Date(str);
  let adj = dt.toDateString().replace(dt.getDate().toString(), dt.getUTCDate().toString());
  let date = new Date(adj);
  
  return date;
}

app.get('/api/exercise/log', (req, res) => {
  let id = req.query.userId;

  User.findById(id).select({__v: 0}).exec((err, data) => {
    if(err) res.send('unknown userId');
    let d = [];
    if(req.query.from) {
      let from = getDate(req.query.from);
      if(req.query.to) {
        let to = getDate(req.query.to);
        
        data.log.forEach((x) => {
          if(new Date(x.date) >= from && new Date(x.date) <= to) {
            d.push(x)
          }
        })
      } else {

        data.log.forEach((x) => {
          if(new Date(x.date) - from >= 0) {
            d.push(x);
          }
        })
      }
      res.json({_id: data._id, username: data.username, from: req.query.from, count: data.count, log: d})
    } else res.json(data);

  })
})



const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
