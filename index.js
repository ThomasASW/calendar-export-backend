const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const cors = require("cors");
const ics = require("ics");
const dateFns = require("date-fns");
const { writeFile } = require("fs");

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
app.post("/api/calendar/events/:id", editEvent);
app.get("/api/calendar/events/export", getCalendarExport);
app.get("/api/calendar/events/export/all", exportMultiple);

async function exportMultiple(req, res) {
  console.log("export multiple event called");
  const db = client.db("calendar");
  const cursor = db.collection("events").find({
    startDateTime: {
      $gte: req.query.startDateTime,
    },
    endDateTime: {
      $lte: req.query.endDateTime,
    },
  });
  let events = [];
  for await (const doc of cursor) {
    events.push(doc);
  }
  console.log(events);
  let eventsToBeExported = [];
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    let start = new Date(event.start);
    let end = new Date(event.end);
    event.start = [
      start.getFullYear(),
      start.getMonth() + 1,
      start.getDate(),
      start.getHours(),
      start.getMinutes(),
    ];
    event.end = [
      end.getFullYear(),
      end.getMonth() + 1,
      end.getDate(),
      end.getHours(),
      end.getMinutes(),
    ];
    delete event._id;
    console.log(event);
    eventsToBeExported.push(event);
  }
  console.log(eventsToBeExported);
  let fileName = `${__dirname}/temp/events.ics`;
  ics.createEvents(eventsToBeExported, (error, value) => {
    if (error != null || error != undefined) {
      console.log(error);
      res.status(500).json({ error: "Server error" });
    } else {
      writeFile(fileName, value, (err) => {
        if (err != null) {
          console.log(err);
        } else {
          console.log("file saved successfully");
          res.download(fileName, "events.ics");
        }
      });
    }
  });
}

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
    start.getMonth() + 1,
    start.getDate(),
    start.getHours(),
    start.getMinutes(),
  ];
  event.end = [
    end.getFullYear(),
    end.getMonth() + 1,
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

async function editEvent(req, res) {
  console.log("edit event called");
  console.log(req.params.id);
  const db = client.db("calendar");
  const event = await db.collection("events").updateOne(
    {
      _id: new ObjectId(`${req.params.id}`),
    },
    {
      $set: req.body,
    },
    {
      upsert: false,
    }
  );
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
    },
    endDateTime: {
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
