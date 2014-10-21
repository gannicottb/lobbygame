var LargeWall = (function(){

  //private members
  var session = null;
  var animals = [];
  var nextIdx = 0;

  //private functions
  var onmove = function(args, kwargs, details) {
    var uid = args[0];
    var animalId = animals[uid];
    moveAnimal(animalId, args[1]);
  };

  var main = function(session) {
    initTestbed();

    console.log("test bed initialized");    

    session.subscribe("com.google.boat.onlogin",
      function(args) {
        var user = args[0];
        var uid = user.uid;
        addAnimal(user.color);
        animals[uid] = nextIdx;
        nextIdx += 1;
      });

    // Large Wall handles user input
    session.register('com.google.boat.move', onmove);
  }

  //public API
  return {
    connect: function(){
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

      connection.open();

    }
  }
})();

LargeWall.connect();