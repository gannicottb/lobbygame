var Backend = (function() {

  // Private Variables
  //
  var session = null;

  var PROGRESS = 200;
  var WAIT = 100;

  var config = {
    MIN_PLAYERS: 1,
    MAX_PLAYERS: 6,
    ROUND_DURATION: 30e3,
    PREPARE_DURATION: 10e3
  };

  var queue = [];
  var enqueued = {};
  var players = [];

  var uidCounter = 0;
  var users = [];

  var state = WAIT;
  var prepare_timer = null;

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
      console.log("Queue: ", queue);
    }
  };

  var popFromQueue = function(){
    var uid = queue.pop();
    enqueued[uid] = false;
    console.log("Queue: ", queue);
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
      return user;            // they were already logged in, disregard this event.
    } else if(!user.logged_in){
      user.logged_in = true   // they had a valid id. set them as logged in.
    }
    console.log("Logged in: ", user.uname, user.color);

    pushToQueue(user.uid);
    
    if(ready()) {
      startRound();
    }

    return user;
  };

  var startRound = function(){
    console.log("start Round");
    state = PROGRESS;

    shuffle(queue);

    for(var p = 0; p < Math.min(queue.length, config.MAX_PLAYERS); p++){
      players.push(lookup(popFromQueue()));
    }

    console.log("Players for this round: ", players);

    session.publish('com.google.boat.roundStart', players, {duration: config.ROUND_DURATION});

    setTimeout(endRound, config.ROUND_DURATION);
    
  };

  var endRound = function(){
    console.log("end Round");
    state = WAIT;
    //TODO: Score info
    for(var i = 0; i < players.length; i++){
      players[i].time = config.ROUND_DURATION;
      pushToQueue(players[i].uid);
    }
    
    session.publish('com.google.boat.roundEnd');

    players = [];

    prepare_timer = setTimeout(function(){
      prepare_timer = null;
      if(ready()) {
        startRound();   
      }
    }, config.PREPARE_DURATION);
  };

  var onPlayerDeath = function(uid){
    var user = lookup(uid);
    user.time = new Date().getTime() - round_start;
    players.splice(players.indexOf(uid),1); // remove that user from players
    pushToQueue(uid);
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

    //document.getElementById('params_display').innerHTML = new EJS({url:'templates/params.ejs'}).render({params: config});


    session.register('com.google.boat.login', login);
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