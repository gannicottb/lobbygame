var Mobile = (function() {

  // Private variables
  //
  var session = null;
  var uid = null;

  // Private functions
  //

  var joinQueue = function(){    
    session.call("com.google.boat.joinQueue", [uid]).then(
      function(success){
        alertify.success("You joined the queue!");
      }
    );
  }

  var handleEvent = function(event) {
    var x = event.beta;
    var y = event.gamma;
    window.console && console.info('Raw Position: x, y: ', x, y);
    $('#ac').html('Raw Position: ' + x + ' ' + y);

    if (y > 15) {
      session.call("com.google.boat.move", [Number(uid), -1]).then(
        session.log, session.log
      );
    } else if (y < -15) {
      session.call("com.google.boat.move", [Number(uid), 1]).then(
        session.log, session.log
      );
    } else {
      session.call("com.google.boat.move", [Number(uid), 0]).then(
        session.log, session.log
      );
    }
  };

  var onQueueUpdate = function(args, kwargs){
    new EJS({url:'templates/queue.ejs'}).update('queue', {data: args});
    var my_pos = args.indexOf(uid) + 1;
    var num_players_in_next_round = Math.min(kwargs.max_players, queue.length);
    var rounds_until_I_play = Math.floor(my_pos / num_players_in_next_round);
  };

  var onRoundEnd = function(args, kwargs){
    if (args.some(function(p_uid){return p_uid === uid})){
      
      alertify.set({ 
        labels: {
          ok     : "Yes!",
          cancel : "No"
        } 
      });

      alertify.confirm("Play again?", function (ok) {
        if (ok) {
          joinQueue();        
        } else {
          $("#join_queue").prop('disabled', false).removeClass('disabled').addClass('enabled');
        }
      });
    }
  };

  var main = function(a_session) {
    session = a_session;
    //Check to see if the device already has a user id
    //Note: needs to be localStorage for mobile testing
    uid = sessionStorage.getItem("uid");
    //Log in to the server (and get auto-registered if no uid is present)
    session.call("com.google.boat.login", [uid]).then(
      function(result) {
        var user = result.user;

        uid = user.uid;
        sessionStorage.setItem("uid", uid);       
        
        // Display the username
        $("#name_container").html(user.uname);
        //Set background color
        $(".wrap").css('backgroundColor', "#"+user.color.toString(16));
        //Disable or enable the join queue button?
        if(result.can_join){
          $("#join_queue").prop('disabled', false).removeClass('disabled').addClass('enabled');
        }

        console.log("user is logged in with uid " + uid + ", and their color is " + user.color);

      },
      session.log
    );

    window.addEventListener("deviceorientation", handleEvent, true);

    //Join Queue button handler
    $("#join_queue").on('click', function(event){
      var elem = $(event.target);
      elem.prop('disabled', true).removeClass('enabled').addClass('disabled');
      joinQueue();
    });

    //Declare move left handler
    $("#move_left").on('click', function(event) {
      session.call("com.google.boat.move", [Number(uid), 0]).then(
        session.log, session.log
      );
    });

    //Declare move right event handler
    $("#move_right").on('click', function(event) {
      session.call("com.google.boat.move", [Number(uid), 1]).then(
        session.log, session.log
      );
    });

    session.subscribe("com.google.boat.queueUpdate", onQueueUpdate);
    session.subscribe("com.google.boat.roundEnd", onRoundEnd);
  }

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

      // fired when connection was lost (or could not be established)
      //
      connection.onclose = function(reason, details) {

        console.log("Connection lost: " + reason);

      }


      // now actually open the connection
      //
      connection.open();
    }

  };
})();

Mobile.connect();