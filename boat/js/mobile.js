var Mobile = (function() {

  // Private variables
  //
  var session = null;
  var uid = null;
  var user = null;

  // Private functions
  //

  var enableQueueButton = function(){
    $("#join_queue").prop('disabled', false).removeClass('disabled').addClass('enabled');
  };

  var disableQueueButton = function(){
    $("#join_queue").prop('disabled', true).removeClass('enabled').addClass('disabled');
  };

  var changeNameClick = function(){

    var name_container = $('#name_container');
    var display = name_container.find('.display');
    var edit = name_container.find('.edit');

    // Render the edit_widget with the name
    edit.html(new EJS({url: 'templates/edit_name.ejs'}).render(user));
    edit.find('input').prop('autofocus', true);

    //toggle from display to edit
    toggleViews(display, edit);

    // Wire up the submit button
    edit.find('button').on('click', function(event) {
      var edit_name_val = $("#edit_name").val();
      if(edit_name_val == ""){
        setName(null); //re render with cached name
        toggleViews(edit, display);
      } else {
        session.call("com.google.boat.changeName", [user.uid, $("#edit_name").val()]).then(
          function(new_name) {
            console.info("User",user.uname,"changed their name to",new_name);
            setName(new_name);
            toggleViews(edit, display);
          },
          function(error) {
            console.warn("Change name failed", error);
            setName(); //re render with cached name
            toggleViews(edit, display);
          }
        );
      }
    });
  };

  //Toggles from viewOut to viewIn
  var toggleViews = function(viewOut, viewIn){
    viewOut.hide();
    viewIn.fadeIn();
  }

  var setName = function(new_name) {
    new_name = new_name || user.uname // default to user name if no new name is passed
    user.uname = new_name; //update local user cache
    $('#name_container .display').html(user.uname);
  };

  var waitMessage = function(rounds_to_wait){
    var msg = "";
    switch(rounds_to_wait){
      case 0:
        msg = "You will play in the next round!";
        break;
      case 1:
        msg = "You will play in "+rounds_to_wait+" round!";
        break;
      default: 
        msg = "You will play in "+rounds_to_wait+" rounds!";
        break;
    }
    return msg;
  }

  var joinQueue = function(){    
    session.call("com.google.boat.joinQueue", [uid]).then(
      function(rounds_to_wait){
        alertify.success(waitMessage(rounds_to_wait));
        disableQueueButton();
      }
    );
  };

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
  };

  var onRoundEnd = function(args, kwargs){
    if (args.some(function(p_uid){return p_uid == uid})){
      
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
          enableQueueButton();
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
        user = result.user;

        uid = user.uid;
        sessionStorage.setItem("uid", uid);       
        
        // Display the username
        $("#name_container .display").html(user.uname);
        document.title = user.uname + " - Wobble Boat";

        //Set background color
        $(".wrap").css('backgroundColor', "#"+user.color.toString(16));

        //Disable or enable the join queue button?
        if(result.can_join) enableQueueButton();

        console.log("User", user.uname,"is logged in with uid " + uid + ", and their color is " + user.color);

        joinQueue();
      },
      session.log
    );

    window.addEventListener("deviceorientation", handleEvent, true);

    //Join Queue button handler
    $("#join_queue").on('click', joinQueue);
    //Change name handler
    $('#name_container .display').on('click', changeNameClick);

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