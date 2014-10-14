var Backend = (function() {

  // Private Variables
  //

  var uidCounter = 0;
  var uids = [];

  // Private functions
  //

  function main(session) {
    // User login
    //
    var login = function(args, kwargs, details) {
      var uid = args[0]; //it's a string
      console.log("uid " + args[0] + " logging in");
      // Register if the user passes in a null id
      if (uid == null) {
        uid = register();
      }
      // Grab the user from the "database"
      var user = uids[Number(uid)];
      // Log them in
      user.loggedin = true;

      console.log("User " + user.uname + " is logged in.");
      user.color = Math.floor(Math.random() * 0xffffff);
      console.log("color: " + user.color);
      session.publish('com.google.boat.onlogin', [user]);
      return user;
    }

    // Register new devices
    //
    var register = function() {
      console.log("register user " + uidCounter);
      uids[uidCounter] = {
        uid: uidCounter,
        uname: "guest" + uidCounter,
        loggedin: false,
        score: 0
      };
      return uidCounter++;
    }

    // Handle guess submission
    //
    var move = function(args, kwargs, details) {
      var guess = args[0];
      var user = uids[args[1]];
      if (user == undefined || user == null || user.loggedin == false) {
        //the user isn't registered or logged in
        //throw an error of some kind
        return;
      }
    }

    // REGISTER RPC
    //
    session.register('com.google.boat.login', login);
    console.log("registered");
  }

  return {
    connect: function() {
      console.log("connection");
      var wsuri = null;

      // include AutobahnJS
      try {
        autobahn = require('autobahn');

        wsuri = "ws://127.0.0.1:8081/ws"; // assume that this is running locally
      } catch (e) {
        console.log(e);
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
      console.log("open");
    }
  };

})();
Backend.connect();