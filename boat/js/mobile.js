var Mobile = (function() {

   // Private variables
   //

   var uid = null;
   
   // Private functions
   //

   function main(session) {

      //Check to see if the device already has a user id
      //Note: needs to be localStorage for mobile testing
      uid = sessionStorage.getItem("uid");
      //Log in to the server (and get auto-registered if no uid is present)
      session.call("com.google.boat.login", [uid]).then(
         function(user) {
            // Store the uid returned from the server  
            uid = user.uid;
            sessionStorage.setItem("uid", uid);
            // Display the username
            $("#user_name").html(user.uname);
            document.body.style.backgroundColor = "#" + user.color.toString(16);
            console.log("user is logged in with uid " + uid + ", and their color is " + user.color);

         },
         session.log
      );

      // Wire up the guess button
      var leftButton = $("#move_left");
      //Declare an event handlers
      leftButton.on('click', function(event) {
         session.call("com.google.boat.move", [Number(uid), 0]).then(
            session.log, session.log
         );
      });

      var rightButton = $("#move_right");
      //Declare an event handlers
      rightButton.on('click', function(event) {
         session.call("com.google.boat.move", [Number(uid), 1]).then(
            session.log, session.log
         );
      });

      // Subscribe to trending guesses
      // 
      session.subscribe("com.google.boat.onmove",
         function(args) {
            var event = args[0];
            console.log(event);
         });
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