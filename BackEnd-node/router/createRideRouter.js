const express = require("express");
const CreateRide = require("../Model/createRideModel");
const router = new express.Router();
const multer = require("multer");
const upload = multer();
const auth = require("../Controller/middleware/auth");
const path = require("path");
const mongoose = require("mongoose");
const moment = require("moment");

const envPath = path.join(__dirname, "../key.env");
require("dotenv").config({ path: envPath });

////                                                             ///  ADD Ride ///                                                                             ////

router.post("/Ride", upload.none(), auth, async (req, res) => {
  if (!req.body.Stops) {
    req.body.Stops = [];
  }
  if (req.body.type) {
    if (!mongoose.Types.ObjectId.isValid(req.body.type)) {
      throw new Error("Vehicle Not Valid");
    }
    req.body.type = new mongoose.Types.ObjectId(req.body.type);
  }
  if (req.body.RideCity) {
    if (!mongoose.Types.ObjectId.isValid(req.body.RideCity)) {
      throw new Error("Services Not Found");
    }
    req.body.RideCity = new mongoose.Types.ObjectId(req.body.RideCity);
  }
  req.body.ScheduleTime = moment(
    req.body.ScheduleTime,
    "DD/MM/YYYY, HH:mm:ss"
  ).format("YYYY-MM-DDTHH:mm:ssZZ");

  try {
    const Ride = new CreateRide(req.body);
    await Ride.save();
    res.status(201).json({
      message: "Ride added",
      code: 51,
      id: Ride._id,
    });
  } catch (error) {
    console.log(error);
    if (error.errors && error.errors.user_id) {
      res.status(400).json("user_id is required");
    } else if (error.errors && error.errors.type) {
      res.status(400).json("type is required");
    } else if (error.errors && error.errors.PickupPoint) {
      res.status(400).json("PickupPoint is required");
    } else if (error.errors && error.errors.DropPoint) {
      res.status(400).json("DropPoint is required");
    } else if (error.errors && error.errors.ScheduleTime) {
      res.status(400).json("ScheduleTime is required");
    } else if (error.errors && error.errors.TripFee) {
      res.status(400).json("TripFee is required");
    } else {
      res.status(400).json(error);
    }
  }
});

////                                                      ////    Get Specific Rides  ////                                                                     ////

router.post("/GetRides", upload.none(), auth, async (req, res) => {
  let matchQuery;
  let filterMatchQuery;

  const limit = req.body.limit || 10;
  const page = req.body.page || 1;
  const skip = (page - 1) * limit;

  if (req.body.status && Array.isArray(req.body.status)) {
    matchQuery = {
      $match: {
        Status: { $in: req.body.status },
      },
    };
  }

  let lookup = [
    {
      $lookup: {
        from: "myusers",
        localField: "user_id",
        foreignField: "_id",
        as: "userInfo",
      },
    },
    {
      $unwind: {
        path: "$userInfo",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "taxis",
        localField: "type",
        foreignField: "_id",
        as: "VehicleInfo",
      },
    },
    {
      $unwind: {
        path: "$VehicleInfo",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "drivers",
        localField: "DriverId",
        foreignField: "_id",
        as: "DriverInfo",
      },
    },
    {
      $unwind: {
        path: "$DriverInfo",
        preserveNullAndEmptyArrays: true,
      },
    },
  ];
  console.log("req.body", req.body);

  if (req.body.filter) {
    let { Search, Status, Type, FromDate, toDate } = req.body.filter;
    let filterConditions = [];

    if (Search && Search !== "null") {
      if (mongoose.Types.ObjectId.isValid(Search)) {
        filterConditions.push({
          _id: new mongoose.Types.ObjectId(Search),
        });
      } else {
        filterConditions.push({
          $or: [
            { "userInfo.UserName": Search },
            { "userInfo.UserPhone": { $regex: Search, $options: "i" } },
          ],
        });
      }
    }

    if (Status && Status !== "null") {
      filterConditions.push({ Status: +Status });
    }

    if (FromDate && toDate !== "null") {
      filterConditions.push({
        ScheduleTime: {
          $gte: new Date(FromDate),
          $lte: new Date(toDate),
        },
      });
    }

    if (Type && mongoose.Types.ObjectId.isValid(Type)) {
      filterConditions.push({ type: new mongoose.Types.ObjectId(Type) });
    }

    if (filterConditions.length > 0) {
      filterMatchQuery = {
        $and: filterConditions,
      };
    }
  }

  console.log("filterMatchQuery", filterMatchQuery);
  let count = { $group: { _id: null, total: { $sum: 1 } } };
  let countPipeline = [
    ...(matchQuery ? [matchQuery] : []),
    ...lookup,
    ...(filterMatchQuery ? [{ $match: filterMatchQuery }] : []),
    count,
  ];

  let pipeline = [
    ...(matchQuery ? [matchQuery] : []),
    ...lookup,
    ...(filterMatchQuery ? [{ $match: filterMatchQuery }] : []),
    { $skip: skip },
    { $limit: limit },
  ];

  try {
    const Rides = await CreateRide.aggregate(pipeline);
    let totalRide = await CreateRide.aggregate(countPipeline);
    console.log(totalRide);
    if (!totalRide[0]) {
      totalRide = 0;
    } else {
      totalRide = totalRide[0].total;
    }
    res.status(200).send({ Rides, totalRide });
  } catch (error) {
    console.log(error);
    res.status(400).send(error);
  }
});

module.exports = router;
