var LargeWall = (function(){

  //private members
  var session = null;
  var players = [];
  var nextIdx = 0;

  //private functions
  var Timer = (function(){    
    var timer_id, time;
    
    var fmtSeconds = function(seconds){
      var min = Math.floor(seconds/60);
      var sec = seconds - (min * 60);
      if(sec < 10){
        sec = "0"+sec;
      }
      return min+":"+sec;
    };

    var set = function(t){
      time = t;
      update();
    };

    var update = function(){
      document.getElementById('timer').innerHTML = fmtSeconds(time);   
      if(time == 0){
        clearTimeout(timer_id);        
      } else {
        timer_id = setTimeout(update, 1000);
      }
      time--;
    };
    
    return {
      set: set,
    }
  })();

  var onmove = function(args, kwargs, details) {
    var uid = args[0];
    var playerId = players[uid];
    moveAnimal(playerId, args[1]);
  };

  var onRoundStart = function(args, kwargs){
    console.log("!!Round Start!!");
    Timer.set(kwargs.duration / 1000);

    for(var p = 0; p < args.length; p++){
      addPlayer(args[p]);
    }
  };

  var onRoundEnd = function(args, kwargs){
    console.log("!!Round Over!!");
    Timer.set(0);
  };

  var addPlayer = function(user){
    addAnimal(user.color);
    players[user.uid] = nextIdx++;
  }

  var main = function(a_session) {
    session = a_session;
    initTestbed();

    console.log("test bed initialized");   

    Timer.set(0); 

    // session.subscribe("com.google.boat.onlogin",
    //   function(args) {
    //     var user = args[0];
    //     var uid = user.uid;
    //     addAnimal(user.color);
    //     players[uid] = nextIdx;
    //     nextIdx += 1;
    // });

    session.subscribe("com.google.boat.roundStart", onRoundStart);
    session.subscribe("com.google.boat.roundEnd", onRoundEnd);

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