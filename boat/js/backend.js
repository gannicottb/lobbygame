var Backend = (function() {

  // Private Variables
  //
  var session = null;

  var users = [],
    uidCounter = 0;

  // Private Functions
  //
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
      return user; // they were already logged in, disregard this event.
    } else if (!user.logged_in) {
      user.logged_in = true // they had a valid id. set them as logged in.
    }
    console.log("Logged in: ", user.uname, user.color);
    session.publish("com.google.boat.onlogin", [user]);
    return user;
  };

  function main(a_session) {
    session = a_session;
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