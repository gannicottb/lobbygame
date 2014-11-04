var LargeWall = (function() {

  //private members
  var session = null;
  var players = {}; // uid -> animalId
  var nextIdx = 0;

  qrcode = new QRCode($("#qr_code")[0], {
      text: 'http://'+document.location.host+'/mobile.html',
      width: 200,
      height: 200,
      colorDark : "#000000",
      colorLight : "#ffffff",
      correctLevel : QRCode.CorrectLevel.H
    });

  // User management
  var users = [], //user objects
    uidCounter = 0;

  var roundCountDown = Timer(); //shouldn't this be new Timer()?
  var prepareCountDown = Timer();      
  var getReadyCountDown = Timer();                                               

  var round_start = null;

  var WAIT = 100,
    PROGRESS = 200;

  var config = {
    MIN_PLAYERS: 1,
    MAX_PLAYERS: 6,
    ROUND_DURATION: 30e3,
    PREPARE_DURATION: 10e3,
    GET_READY_DURATION: 5e3
  };

  var queue = [], //user objects
    enqueued = {};//uid -> boolean
  var state = WAIT;

  //private functions

  var loadQRCode = function(){
    // Courtesy of http://net.ipcalf.com/
    // NOTE: window.RTCPeerConnection is "not a constructor" in FF22/23
    var RTCPeerConnection = /*window.RTCPeerConnection ||*/ window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
    
    if (RTCPeerConnection){
      var rtc = new RTCPeerConnection({iceServers:[]});      

      if (window.mozRTCPeerConnection) {      // FF needs a channel/stream to proceed
          rtc.createDataChannel('', {reliable:false});
      };
      
      rtc.onicecandidate = function (evt) {
          if (evt.candidate) grepSDP(evt.candidate.candidate);      
      };

      rtc.createOffer(function (offerDesc) {
          grepSDP(offerDesc.sdp);        
          rtc.setLocalDescription(offerDesc);        
      }, function (e) { console.warn("offer failed", e); });     

      var addrs = Object.create(null);
      addrs["0.0.0.0"] = false;
      function updateDisplay(newAddr) {
          if (newAddr in addrs) return;
          else addrs[newAddr] = true;
          var displayAddrs = Object.keys(addrs).filter(function (k) { return addrs[k]; });
          var link = "http://"+displayAddrs[0]+":8081/mobile.html"
          $("#link_text").html(link);
          qrcode.makeCode(link);
      }

      function grepSDP(sdp) {       
        var hosts = [];
        sdp.split('\r\n').forEach(function (line) { // c.f. http://tools.ietf.org/html/rfc4566#page-39
            //if (~line.indexOf("a=candidate")) {     // http://tools.ietf.org/html/rfc4566#section-5.13
            if (line.indexOf("candidate") != -1) {   // the first check doesn't work in Chrome for this page.
                var parts = line.split(' '),        // http://tools.ietf.org/html/rfc5245#section-15.1
                    addr = parts[4],
                    type = parts[7];
                if (type === 'host') updateDisplay(addr);
            } else if (~line.indexOf("c=")) {       // http://tools.ietf.org/html/rfc4566#section-5.7
                var parts = line.split(' '),
                    addr = parts[2];
                updateDisplay(addr);
            }
        });
      };       
    }  
  };

  /*
  
    User Management

  */
  var lookup = function(uid) {
    if (uid == null || uid == undefined) {
      return uid;
    } else {
      return users[Number(uid)];
    }
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

  var login = function(args) {
    var user = lookup(args[0]);

    if (user == null || user == undefined) {
      user = register(); // they don't have an id. give them one.
      console.log("Registering: ", user.uname);
    } else if (user.logged_in) {
      return {user: user, can_join: canJoinQueue(user.uid)}; // they were already logged in, disregard this event.
    } else if (!user.logged_in) {
      user.logged_in = true // they had a valid id. set them as logged in.
    }
    console.log("Logged in: ", user.uname, user.color);
    //session.publish("com.google.boat.onlogin", [user]);
    return {user: user, can_join: canJoinQueue(user.uid)}
  };

  var canJoinQueue = function(uid){
    //they can join if they're not queued and not playing
    return !enqueued[uid] && players[uid] == undefined
  };

  var joinQueue = function(args){
    var user = lookup(args[0]);
    if(!user.logged_in){
      throw ["user can't join queue if not logged in", "uid:"+args[0]];
    } else if(!canJoinQueue(user.uid)){
      throw ["user can't join queue if already queued or playing", "uid:"+args[0]];
    }

    var ql = pushToQueue(user);
    var rounds_until_user_plays = Math.floor((ql - 1) / Math.min(queue.length, config.MAX_PLAYERS));
    
    tryStartRound();

    return rounds_until_user_plays;
  };
  ////////////////////

  var onmove = function(args, kwargs, details) {
    var uid = args[0];
    var animalId = players[uid].animalId;
    moveAnimal(animalId, args[1]);
  };

  /*

    Round Management

  */

  var tryStartRound = function() {
    // if we have enough players, we're not waiting, and we're not preparing.
    if(queue.length >= config.MIN_PLAYERS && state == WAIT && !prepareCountDown.counting()) {
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
        user.animalId = p; // this means lots of players will have duplicate animalIds. Hopefully not a problem?
        players[user.uid] = user; //player kv pairs are uid -> user object 
        players[user.uid].time = config.ROUND_DURATION; 
        addAnimal(user.color, user.uid);
      }
    }

    prepareCountDown.set(0, 'prepare', null);
    roundCountDown.set(config.ROUND_DURATION / 1000, 'round', endRound);
    $('#get_ready_timer_box').show();
    getReadyCountDown.set(config.GET_READY_DURATION / 1000, 'get_ready_timer_box', function() {
      $('#get_ready_timer_box').html("GO!");
      setTimeout(function(){
        $('#get_ready_timer_box').hide();
      }, 2000);
      startWaves(1.3); // sets the velocity of the wave pusher
      roundCountDown.start();
    });

    getReadyCountDown.start();
    
    //Hide scores at round start
    if(document.getElementById('players_scores') !== null)
    {
      $('div#players_scores').hide();
    }

    document.getElementById('players_display').innerHTML = new EJS({
      url: 'templates/players.ejs'
    }).render({
      data: players
    });
    console.log("animals added");

  };

  var endRound = function() {
    console.log("end Round");
    state = WAIT;

    roundCountDown.set(0, 'round', null);
    prepareCountDown.set(config.PREPARE_DURATION / 1000, 'prepare', tryStartRound);
    prepareCountDown.start();

    // Calculate Scores

    for (var uid in players) {
      players[uid].score = Math.round(players[uid].time / 100);

      console.log("Name = "+players[uid].uname);
      console.log("Score ="+players[uid].score);
    }

    //If 'players_scores' div does not exist, create it and append it to the frame
    //TODO: simplify this by simply adding the score div to the html and accessing it here
            // That will save all of this code and force you to put the styling into the css where it belongs
    if(document.getElementById('players_scores') === null)
    {
      var scores = document.createElement("div");
      scores.id = "players_scores";
      var canvasHeight = $('canvas').last().height();
      var canvasWidth = $('canvas').last().width(); 
      $(scores).css({width:canvasWidth, height:canvasHeight, position: 'absolute', opacity: 1});     
      $(scores).appendTo('#frame');
    }
    
    document.getElementById('players_scores').innerHTML = new EJS({
        url: 'templates/scores.ejs'
      }).render({
        players: players
      });    
    //Shows the 'players_scores' div if it has been hidden in startRound
    $('div#players_scores').show();

    session.publish('com.google.boat.roundEnd', Object.keys(players), {duration: config.PREPARE_DURATION});
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

  /*

    Queue Management

  */

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
    return queue.length;
  };

  var popFromQueue = function() {
    var user = queue.shift();
    enqueued[user.uid] = false;
    document.getElementById('queue_display').innerHTML = new EJS({
      url: 'templates/queue.ejs'
    }).render({
      data: queue
    });
    return user;
  }; 

  var playerDeathCallback = function(uid) {
    players[uid].time = new Date().getTime() - round_start;
    console.log("Player " + uid + " is dead!");
  };

  var main = function(a_session) {
    session = a_session;

    var game_canvas = $('#game_canvas');
    initTestbed({canvas: game_canvas[0]});

    //Set frame dimensions to the dimensions of the canvas width and height
    $('#frame').width(game_canvas.width());
    $('#frame').height(game_canvas.height());

    console.log("test bed initialized");

    //Find local IP and display QR Code  
    if(document.location.host.split(':')[0] == "localhost"){
      loadQRCode();
    }

    //Set the onPlayerDeath callback (defined in testbed.js)
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
    session.register('com.google.boat.login', login);
    session.register('com.google.boat.joinQueue', joinQueue);


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
