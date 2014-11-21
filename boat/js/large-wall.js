var LargeWall = (function() {

  //private members
  var session = null;
  var players = {}; //player kv pairs are uid -> user object

  var qrcode_opts = {
    text: 'http://'+document.location.host+'/mobile.html',
    width: $('.wrap').height()/4 - $('.wrap').width() * .005,
    height: $('.wrap').height()/4 - $('.wrap').width() * .005,
    colorDark : "#000000",
    colorLight : "#ffffff",
    correctLevel : QRCode.CorrectLevel.H
  };

  var left_qrcode = new QRCode($(".left_corner.qr_code")[0], qrcode_opts);
  var right_qrcode = new QRCode($(".right_corner.qr_code")[0], qrcode_opts);

  // User management
  var users = [], //uid -> user objects
    uidCounter = 0;

  var roundCountDown = Timer(); //shouldn't this be new Timer()?
  var prepareCountDown = Timer();      
  var getReadyCountDown = Timer();   

  var wave_interval = null;                                            

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
          //$("#link_text").html(link); //unnecessary
          left_qrcode.makeCode(link);
          right_qrcode.makeCode(link);
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
    addUser(uidCounter);
    return users[uidCounter++];
  };

  var addUser = function(id){
    // Make sure the color is bright
    var genColor = HSVtoRGB(Math.random(), Math.random(), (70.0 + Math.random() * 30.0) / 100.0);
    console.log("gen color: " + genColor.r + ", " + genColor.g + ", " + genColor.b);
    var rgb = (genColor.r << 16) + (genColor.g << 8) + genColor.b;
    
    // Create a new user object and store it in users
    users[id] = {
      uid: id,
      uname: "guest" + id,
      logged_in: true,
      color: rgb,
      score: 0,
      time: 0,
      dead: false
    };
  }

  var login = function(args) {
    var user = lookup(args[0]);

    if (user == null || user == undefined) {
      user = register(); // they don't have an id. give them one.
      console.log("Registering: ", user.uname);
    } else if (user.logged_in) {
      return login_result(user);
    } else if (!user.logged_in) {
      user.logged_in = true // they had a valid id. set them as logged in.
    }
    console.log("Logged in: ", user.uname, user.color);
    //session.publish("com.google.boat.onlogin", [user]);
    return login_result(user);
  };

  var login_result = function(user){
    var is_user_playing = Object.keys(players).some(
      function(p_uid) {
        return p_uid == user.uid;
      }
    );

    return {
      user: user, 
      can_join: canJoinQueue(user.uid),
      playing: is_user_playing
    };
  }

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
    
    //tryStartRound();
    if(state == WAIT && !roundCountDown.counting()){
      //Make label visible and Display "Prepare" label for timer
      //Using css for visibility preserves the height of the element in the layout
      $(timer_label).css("visibility", "visible");
      $(timer_label).html("Waiting for other players to join");
      roundCountDown.set(config.PREPARE_DURATION / 1000, 'round', tryStartRound);
      roundCountDown.start();      
    }

    return rounds_until_user_plays;
  };

  var leaveQueue = function(args){
    var user = lookup(args[0]);

    if(!user.logged_in){
      throw ["User "+args[0]+" can't leave queue if not logged in"];
    }

    deleteFromQueue(user);

    updateQueueDisplay();  
 
  }
  ////////////////////

  var onmove = function(args, kwargs, details) {
    var uid = args[0];
    if(players[uid]){
      var animalId = players[uid].animalId;
      moveAnimal(animalId, args[1]);      
    }
  };

  // Change user names
  //
  var changeName = function(args, kwargs, details) {
    var user = lookup(args[0]);
    var new_name = args[1];    
   
    user.uname = new_name;      
    console.log("User " + user.uid + " changed their name to " + new_name);

    //update anywhere that the user's name shows up
    updatePlayersDisplay();
    updateQueueDisplay();  

    return user.uname; //receipt
  };

  /*

    Round Management

  */

  var tryStartRound = function() {
    // if we have enough players, we're not waiting, and we're not preparing.
    if(queue.length >= config.MIN_PLAYERS && state == WAIT && !roundCountDown.counting()) {
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

    //Timing
    //    
    roundCountDown.cancel();

    roundCountDown.set(config.ROUND_DURATION / 1000, 'round', endRound);

    $('#get_ready_timer_box').fadeIn();
    getReadyCountDown.setSimpleCountdown(config.GET_READY_DURATION / 1000, 'get_ready', function() {
      $('#get_ready').html("GO!");
      setTimeout(function(){
        $('#get_ready_timer_box').fadeOut();
      }, config.ROUND_DURATION * .1);
      console.log("get ready timeout reached");
      startWaves(); // start the ACTION
      roundCountDown.start();
    });
    //Display label "Round Duration"
    $(timer_label).html("Round in Progress");  
    getReadyCountDown.start();
    
    //Hide scores at round start
    if(document.getElementById('players_scores') !== null)
    {
      $('div#players_scores').fadeOut();
    }

    updatePlayersDisplay();
    console.log("animals added");

    session.publish('com.google.boat.roundStart', Object.keys(players), {
      round_duration: config.ROUND_DURATION, 
      get_ready_duration: config.GET_READY_DURATION
    });

  };

  var startWaves = function(){
    console.log("startWaves");
    var velocity = 1.4;
    var index = 0;
    
    //Add function calls to this schedule to set the routine for the round
    var schedule = [
      leftPush,
      function(vel){
        velocity = vel + .1;
        leftPush(velocity);
      },
      function(vel){
        velocity = vel + .1;
        leftPush(velocity);
      },
      function(){
        rain();
      }
    ];

    var interval = config.ROUND_DURATION / schedule.length;

    //Run all commands in schedule at specified interval
    //
    schedule[index++](velocity); // run the first command
    wave_interval = setInterval(function(){
      schedule[index++](velocity); //call next function in schedule 
      if(index == schedule.length) clearInterval(wave_interval); //clear interval when we've called all functions      
    }, interval);
  };

  var stopWaves = function(){
    leftPush(0);
    clearInterval(wave_interval);
    wave_interval = null;
  }

  var endRound = function() {
    console.log("end Round");
    state = WAIT;

    //roundCountDown.set(0, 'round', null);
    roundCountDown.cancel();
    roundCountDown.set(config.PREPARE_DURATION / 1000, 'round', tryStartRound);
    //Display "Prepare" label for timer
    $(timer_label).html("Waiting for players to join");    
    roundCountDown.start();

    // Calculate Number of players currently on the boat
    var players_on_boat = 0;

    for (var uid in players) {
      if(players[uid].dead==false)
      {
        players_on_boat++;
      }
    }
    // Calculate Scores
    for (var uid in players) {

      var score = 0;

      //base score for all players based on how long they lasted in the round
      score = Math.round(players[uid].time / 100);
    
      if(players[uid].dead == false)
      { //If the player survived the whole round (multiplier based on other survivors)
        if(players_on_boat>1)
          score = score * 2 * (players_on_boat-1);
        else if(players_on_boat==1) 
          //If the player is the only survivor at round end - bonus points!! -> multiplier based on all the players in the round
          score = score * 2 * Object.keys(players).length;
      }

      players[uid].score = score;

      console.log("Name = "+players[uid].uname);
      console.log("Score ="+players[uid].score);
    }

    document.getElementById('players_scores').innerHTML = new EJS({
        url: 'templates/scores.ejs'
      }).render({
        players: players
      });    
    //Shows the 'players_scores' div if it has been hidden in startRound
    $('div#players_scores').fadeIn();

    session.publish('com.google.boat.roundEnd', Object.keys(players), {duration: config.PREPARE_DURATION}); 


    // Reset the wave machine
    restart();
    
    // Clear players from current round
    players = {};

    updatePlayersDisplay();
    round_start = null;
    
  };

  var restart = function() {
    for(var uid in users){
      users[uid].dead = false;
    }
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
      updateQueueDisplay();
    }
    return queue.length;
  };

  var popFromQueue = function() {
    var user = queue.shift();
    enqueued[user.uid] = false;
    updateQueueDisplay();
    return user;
  }; 

  var deleteFromQueue = function(user){
    if(enqueued[user.uid]){
      var idx_to_remove = null;
      for(var i = 0, len = queue.length; i < len; i++){
        if(queue[i].uid === user.uid){
          // Found 'em!
          idx_to_remove = i;
          // Quit looking
          break;
        }
      }
      if(idx_to_remove !== null){
        queue.splice(idx_to_remove, 1);
        enqueued[user.uid] = false;               
      }
    } 
    updateQueueDisplay();
  }

  // Convenience functions for rendering queue and player visualizations

  var updateQueueDisplay = function(){
    document.getElementById('queue_display').innerHTML = new EJS({
      url: 'templates/queue.ejs'
    }).render({
      data: queue
    });
  }
  var updatePlayersDisplay = function(){
    document.getElementById('players_display').innerHTML = new EJS({
      url: 'templates/players.ejs'
    }).render({
      data: players
    });
  }
  // Callbacks

  var playerDeathCallback = function(uid) {

    var player_uids = Object.keys(players);

    if(player_uids.length>0)
    {
      players[uid].time = new Date().getTime() - round_start;
      players[uid].dead = true;
      console.log("Player " + uid + " is dead!");       
      
      var all_dead = player_uids.every(function(uid){return players[uid].dead});

      if(all_dead){ // End the round early
        console.info("End early!");
        getReadyCountDown.set(0, 'get_ready', null);
        $('#get_ready_timer_box').fadeOut();
        stopWaves();
        endRound();
      }      
    }
  };

  var onRefresh = function(){    
    // Convert users object to JSON and cache it   
    var users_json = JSON.stringify(users);
    sessionStorage.setItem("users_backup", users_json);
    sessionStorage.setItem("uid_counter", uidCounter);    
  }


  var main = function(a_session) {
    session = a_session;

    var game_canvas = $('#game_canvas');
    //Set the canvas dimensions to fill the frame
    game_canvas[0].width = $('#frame').width();
    game_canvas[0].height = $('#frame').height();

    initTestbed({canvas: game_canvas[0]});

    console.log("test bed initialized");

    //Find local IP and display QR Code  
    if(document.location.host.split(':')[0] == "localhost"){
      loadQRCode();
    }

    //If there is a uid backup, add them to the users object
    var users_json = sessionStorage.getItem("users_backup");
    if(users_json !== undefined && users_json !== null && users_json !== ""){
      users = JSON.parse(users_json);
      uidCounter = Number(sessionStorage.getItem("uid_counter") || uidCounter);   
    }

    //Set the onPlayerDeath callback (defined in testbed.js)
    onPlayerDeath(playerDeathCallback);

    //Detect when the backend gets refreshed
    $(window).on('beforeunload', onRefresh);

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

    updateQueueDisplay();

    roundCountDown.set(0, 'round', null);    

    if(state == WAIT){
      //Make label visible and Display "Prepare" label for timer
      //Using css for visibility preserves the height of the element in the layout
      $(timer_label).css("visibility", "visible");
      $(timer_label).html("Waiting for players to join");      
    }

    session.register('com.google.boat.move', onmove);
    session.register('com.google.boat.login', login);
    session.register('com.google.boat.changeName', changeName);
    session.register('com.google.boat.joinQueue', joinQueue);
    session.register('com.google.boat.leaveQueue', leaveQueue);

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
