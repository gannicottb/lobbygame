// the URL of the WAMP Router (Crossbar.io)
//
var wsuri;
if (document.location.origin == "file://") {
  wsuri = "ws://127.0.0.1:8081/ws";

} else {
  wsuri = (document.location.protocol === "http:" ? "ws:" : "wss:") + "//" +
    document.location.host + "/ws";
}


// the WAMP connection to the Router
//
var connection = new autobahn.Connection({
  url: wsuri,
  realm: "realm1"
});

// fired when connection is established and session attached
//
connection.onopen = function(session, details) {
  main(session);
};

var animals = [];
var nextIdx = 0;

function main(session) {
  initTestbed();

  console.log("test bed initialized");
  var onmove = function(args, kwargs, details) {
    var uid = args[0];
    var animalId = animals[uid];
    moveAnimal(animalId, args[1]);
  }

  session.subscribe("com.google.boat.onlogin",
    function(args) {
      var uid = args[0];
      console.log(uid);
      addAnimal();
      animals[uid] = nextIdx;
      nextIdx += 1;
    });

  session.register('com.google.boat.move', onmove);
}

// now actually open the connection
//
connection.open();
