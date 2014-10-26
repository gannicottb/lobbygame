var LargeWall = (function() {

  //private members
  var session = null;
  var players = {}; // uid -> animalId
  var nextIdx = 0;

  var roundCountDown = Timer();
  var prepareCountDown = Timer();

  var round_start = null;

  var WAIT = 100,
    PROGRESS = 200;

  var config = {
    MIN_PLAYERS: 1,
    MAX_PLAYERS: 6,
    ROUND_DURATION: 30e3,
    PREPARE_DURATION: 10e3
  };

  var queue = [],
    enqueued = {};
  var state = WAIT;

  //private functions
  var onmove = function(args, kwargs, details) {
    var uid = args[0];
    var animalId = players[uid].animalId;
    moveAnimal(animalId, args[1]);
  };

  var tryStartRound = function() {
    if (ready()) {
      startRound();
    }
  };

  var startRound = function() {
    console.log("start Round");
    state = PROGRESS;
    round_start = new Date().getTime();
    var players_for_round = Math.min(queue.length, config.MAX_PLAYERS)
      // Pop the user from the waiting queue, and add them to the game scene
    for (var p = 0; p < players_for_round; p++) {
      var user = popFromQueue();
      if (user != null && user != undefined) {
        user.animalId = p;
        players[user.uid] = user;
        addAnimal(user.color, user.uid);
      }
    }

    document.getElementById('players_display').innerHTML = new EJS({
      url: 'templates/players.ejs'
    }).render({
      data: players
    });
    console.log("animals added");
    prepareCountDown.set(0, 'prepare', null);
    roundCountDown.set(config.ROUND_DURATION / 1000, 'round', endRound);

  };

  var endRound = function() {
    console.log("end Round");
    state = WAIT;

    roundCountDown.set(0, 'round', null);
    prepareCountDown.set(config.PREPARE_DURATION / 1000, 'prepare', tryStartRound);

    //TODO: Score info
    for (var uid in players) {
      players[uid].time = config.ROUND_DURATION;
      pushToQueue(players[uid]);
    }

    // Clear players from current round
    players = {};

    document.getElementById('players_display').innerHTML = new EJS({
      url: 'templates/players.ejs'
    }).render({
      data: players
    });
    round_start = null;
    setTimeout(restart, 1000);

  };

  var restart = function() {
    resetGame();
    onPlayerDeath(playerDeathCallback);
  };

  var ready = function() {
    // IF we have enough players to start, 
    // AND we're waiting but not preparing (i.e., at the beginning or if too many people log out after a round)
    return (queue.length >= config.MIN_PLAYERS && state == WAIT)
  };

  var pushToQueue = function(user) {
    if (!enqueued[user.uid]) {
      queue.push(user);
      enqueued[user.uid] = true;
      document.getElementById('queue_display').innerHTML = new EJS({
        url: 'templates/queue.ejs'
      }).render({
        data: queue
      });
    }
  };

  var popFromQueue = function() {
    var user = queue.pop();
    var uid = user.uid;
    enqueued[uid] = false;
    document.getElementById('queue_display').innerHTML = new EJS({
      url: 'templates/queue.ejs'
    }).render({
      data: queue
    });
    return user;
  };

  var playerDeathCallback = function(uid) {
    // if (round_start != null) {
    //   user.time = new Date().getTime() - round_start;

    //   //Ask player if they want to play again
    // }
    // players[user.uid] = undefined; // remove that user from players
    console.log("Player " + uid + " is dead!");
  };

  var main = function(a_session) {
    session = a_session;
    initTestbed();

    console.log("test bed initialized");

    roundCountDown.set(0, 'round');

    session.subscribe("com.google.boat.onlogin",
      function(args) {
        var user = args[0];
        pushToQueue(user);
        tryStartRound();
      });

    onPlayerDeath(playerDeathCallback);

    // grab URL params from the browser and set config variables  
    location.search.slice(1).split('&').map(function(str) {
      var pair = str.split('=');
      var key = pair[0];
      var value = pair[1];
      // if the url param matches a config property, then set it to the supplied value
      if (config.hasOwnProperty(key)) {
        // if the value ends in 's', chop the 's' off, convert value from milliseconds to seconds
        config[key] = value[value.length - 1] == 's' ? Number(value.substr(0, value.length - 1)) * 1000 : Number(value);
      }
    });

    document.getElementById('params_display').innerHTML = new EJS({
      url: 'templates/params.ejs'
    }).render({
      data: config
    });
    document.getElementById('queue_display').innerHTML = new EJS({
      url: 'templates/queue.ejs'
    }).render({
      data: queue
    });

    roundCountDown.set(0, 'round', null);
    session.register('com.google.boat.move', onmove);
  };

  //public API
  return {
    connect: function() {
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