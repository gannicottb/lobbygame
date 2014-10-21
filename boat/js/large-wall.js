var LargeWall = (function(){

  //private members
  var session = null;
  var players = [];
  var nextIdx = 0;

  //private functions
  var onmove = function(args, kwargs, details) {
    var uid = args[0];
    var playerId = players[uid];
    moveAnimal(playerId, args[1]);
  };

  var onRoundStart = function(args, kwargs){
    for(var p = 0; p < args.length; p++){
      addPlayer(args[p]);
    }
    //TODO: Start Round Timer
  }

  var addPlayer = function(user){
    addAnimal(user.color);
    players[user.uid] = nextIdx++;
  }

  var main = function(a_session) {
    session = a_session;
    initTestbed();

    console.log("test bed initialized");    

    // session.subscribe("com.google.boat.onlogin",
    //   function(args) {
    //     var user = args[0];
    //     var uid = user.uid;
    //     addAnimal(user.color);
    //     players[uid] = nextIdx;
    //     nextIdx += 1;
    // });

    session.subscribe("com.google.boat.roundStart", onRoundStart);

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