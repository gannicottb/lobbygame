var Backend = (function() {

  // Private Variables
  //
  var session = null;

  var WAIT = 100, PROGRESS = 200;

  var config = {
    MIN_PLAYERS: 1,
    MAX_PLAYERS: 6,
    ROUND_DURATION: 30e3,
    PREPARE_DURATION: 10e3
  };

  var queue = [], enqueued = {}, players = [];

  var users = [], uidCounter = 0;

  var state = WAIT;

  var prepare_timer = null, round_timer = null;

  // Private Functions
  //
  var lookup = function(uid) {
    if(uid == null || uid == undefined){
      return uid;
    }else{
      return users[Number(uid)];      
    }
  };

  var ready = function(){
    // IF we have enough players to start, 
    // AND we're waiting but not preparing (i.e., at the beginning or if too many people log out after a round)
    return (queue.length >= config.MIN_PLAYERS && state == WAIT && prepare_timer == null)
  };

  var pushToQueue = function(uid){
    if(!enqueued[uid]){
      queue.push(uid);
      enqueued[uid] = true;
      document.getElementById('queue_display').innerHTML = new EJS({url:'templates/queue.ejs'}).render({data: queue});
      session.publish("com.google.boat.queueUpdate", queue);
    }
  };

  var popFromQueue = function(){
    var uid = queue.pop();
    enqueued[uid] = false;
    document.getElementById('queue_display').innerHTML = new EJS({url:'templates/queue.ejs'}).render({data: queue});
    session.publish("com.google.boat.queueUpdate", queue);
    return uid;
  };

  var register = function() {
    users[uidCounter] = {
      uid: uidCounter,
      uname: "guest" + uidCounter,
      logged_in: true,
      color: Math.floor(Math.random() * 0xffffff),
      score: 0,
      time: 0
    }; 
    return users[uidCounter++];
  };

  var login = function(args){
    var user = lookup(args[0]);

    if(user == null || user == undefined){
      user = register();      // they don't have an id. give them one.
      console.log("Registering: ", user.uname);
    } else if(user.logged_in){
      //return user;            // they were already logged in, disregard this event.
      return {user: user, can_join: !enqueued[user.uid] && players[user.uid] == undefined}
    } else if(!user.logged_in){
      user.logged_in = true   // they had a valid id. set them as logged in.
    }
    console.log("Logged in: ", user.uname, user.color);

    pushToQueue(user.uid);
    
    if(ready()) {
      startRound();
    }

    //return user;
    return {user: user, can_join: !enqueued[user.uid] && players[user.uid] == undefined}
  };

  var joinQueue = function(args){
    var user = lookup(args[0]);
    if(user.logged_in){
      pushToQueue(user.uid);
    }

    if(ready()) {
      startRound();
    }

  };

  var startRound = function(){
    console.log("start Round");
    state = PROGRESS;    

    var players_for_round = Math.min(queue.length, config.MAX_PLAYERS)
    for(var p = 0; p < players_for_round ; p++){
      //players.push(lookup(popFromQueue()));
      players.push(popFromQueue());
    }

    var player_info = players.map(function(uid){
      var user = lookup(uid);
      return {uid: user.uid, color: user.color, uname: user.uname};
    })

    document.getElementById('players_display').innerHTML = new EJS({url:'templates/players.ejs'}).render({data: player_info});

    session.publish('com.google.boat.roundStart', player_info, {duration: config.ROUND_DURATION});

    Timer.set(0, 'prepare');
    Timer.set(config.ROUND_DURATION/1000, 'round');

    round_timer = setTimeout(endRound, config.ROUND_DURATION);
    
  };

  var endRound = function(){
    console.log("end Round");
    clearTimeout(round_timer);
    state = WAIT;

    Timer.set(0, 'round');
    Timer.set(config.PREPARE_DURATION/1000, 'prepare')

    //TODO: Score info
    for(var i = 0; i < players.length; i++){
      lookup(players[i]).time = config.ROUND_DURATION;
    }
    
    session.publish('com.google.boat.roundEnd', players, {duration: config.PREPARE_DURATION});

    players = [];

    document.getElementById('players_display').innerHTML = new EJS({url:'templates/players.ejs'}).render({data: players});

    prepare_timer = setTimeout(function(){
      prepare_timer = null;
      if(ready()) {
        startRound();   
      }
    }, config.PREPARE_DURATION);
  };

  var onPlayerDeath = function(uid){
    var user = lookup(uid);
    //TODO: 
    user.time = new Date().getTime() - round_start;
    //players.splice(players.indexOf(uid),1); // remove that user from players
    //Ask player if they want to play again
  };

  function main(a_session) {
    session = a_session;

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

    document.getElementById('params_display').innerHTML = new EJS({url:'templates/params.ejs'}).render({data: config});
    document.getElementById('queue_display').innerHTML = new EJS({url:'templates/queue.ejs'}).render({data: queue});
    Timer.set(0, 'round');

    session.register('com.google.boat.login', login);
    session.register('com.google.boat.joinQueue', joinQueue);
  }

  return {
    connect: function() {
      console.log("Connecting Backend...");
      var wsuri = null;

      // include AutobahnJS
      try {
        autobahn = require('autobahn');

        wsuri = "ws://127.0.0.1:8081/ws"; // assume that this is running locally
      } catch (e) {
 
        // when running in browser, AutobahnJS will
        // be included without a module system

        // router url either localhost or assumed to be
        // at IP of server of backend HTML
        if (document.location.origin == "file://") {
          wsuri = "ws://127.0.0.1:8081/ws";

        } else {
          wsuri = (document.location.protocol === "http:" ? "ws:" : "wss:") + "//" +
            document.location.host + "/ws";
        }
      }

      var connection = new autobahn.Connection({
        url: wsuri,
        realm: 'realm1'
      });

      connection.onopen = function(session) {

        console.log("connected");

        main(session);

      };

      connection.open();
      console.log("connection opened");
    }
  };

})();
Backend.connect();