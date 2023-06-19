let cron = require("node-cron");
let CroneTime = 10;

const {
  getAvailableDrivers,
  getUnassignedRequests,
  getBusyDrivers,
} = require("./functions");
const Sockets = require("./Socket");

let schedule = `*/${CroneTime} * * * * *`;

module.exports = function (io) {
  cron.schedule(schedule, async () => {
    let rides = await getUnassignedRequests();
    AssignRideToDriver(rides);
  });

  async function AssignRideToDriver(rides) {
    if (!rides) return;
    for await (const ride of rides) {
      await CheckTimeOut(ride);
    }
  }

  async function CheckTimeOut(ride) {
    function CheckTime(ride) {
      if (ride.AssignTime && ride.AssignTime <= Date.now()) {
        AssignDriverToRide(ride);
      } else {
        setImmediate(() => CheckTime(ride));
      }
    }
    CheckTime(ride);
  }
  // async function Wait(ride) {
  //   while (ride.AssignTime >= Date.now()) {}
  //   await AssignDriverToRide(ride);
  // }

  async function GetDriver(ride) {
    let drivers = await getAvailableDrivers(
      ride.type,
      ride.RideCity,
      ride.RejectedRide
    );
    return drivers;
  }

  async function NoDriverFound(ride) {
    let hasBusyDriver = await getBusyDrivers(
      ride.type,
      ride.RideCity,
      ride.RejectedRide
    );
    return hasBusyDriver;
  }

  async function AssignDriverToRide(ride) {
    if (ride.AssigningType == "single") {
      await Sockets.freeRide(ride._id);
      return;
    }
    await Sockets.NotReactedRide(ride._id);
    let newdriver = await GetDriver(ride);
    if (!newdriver) {
      let busydriver = await NoDriverFound(ride);
      if (busydriver.length >= 1) {
        return;
      } else {
        await Sockets.freeRide(ride._id);
      }
    } else {
      await Sockets.AssignRide(ride._id, newdriver._id);
    }
  }
};
