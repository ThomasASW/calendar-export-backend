const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const cors = require("cors");
const ics = require("ics");
const dateFns = require("date-fns");
const { writeFileSync, writeFile } = require("fs");

const client = new MongoClient("mongodb://localhost:27017");

async function connectToDatabase() {
  await client.connect();
  console.log("Connected to database");
  app.listen(5000, () => {
    console.log("Server running on port 5000");
  });
}

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/api/calendar/events", getEvents);
app.post("/api/calendar/events", createNewEvent);
app.get("/api/calendar/events/export", getCalendarExport);

async function getCalendarExport(req, res) {
  console.log("export event called");
  const db = client.db("calendar");
  const event = await db.collection("events").findOne({
    _id: new ObjectId(`${req.query.id}`),
  });
  let start = new Date(event.start);
  let end = new Date(event.end);
  event.start = [
    start.getFullYear(),
    start.getMonth(),
    start.getDate(),
    start.getHours(),
    start.getMinutes(),
  ];
  event.end = [
    end.getFullYear(),
    end.getMonth(),
    end.getDate(),
    end.getHours(),
    end.getMinutes(),
  ];
  delete event._id;
  console.log(event);
  let fileName = `${__dirname}/temp/event.ics`;
  ics.createEvent(event, (error, value) => {
    if (error != null || error != undefined) {
      console.log(error);
      res.status(500).json({ error: "Server error" });
    } else {
      writeFile(fileName, value, (err) => {
        if (err != null) {
          console.log(err);
        } else {
          console.log("file saved successfully");
          res.download(fileName, "event.ics");
        }
      });
    }
  });
}

async function createNewEvent(req, res) {
  console.log("create new event called");
  const db = client.db("calendar");
  const event = await db.collection("events").insertOne(req.body);
  console.log(event);
  res.json(event);
}

async function getEvents(req, res) {
  console.log("get events called");
  console.log(req.query);
  const db = client.db("calendar");
  const cursor = db.collection("events").find({
    startDateTime: {
      $gte: req.query.startDateTime,
      $lte: req.query.endDateTime,
    },
    endDateTime: {
      $gte: req.query.startDateTime,
      $lte: req.query.endDateTime,
    },
  });
  let events = [];
  for await (const doc of cursor) {
    events.push(doc);
  }
  res.json(events);
}

connectToDatabase();
