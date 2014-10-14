function TestWaveMachine() {
  camera.position.y = 1;
  camera.position.z = 2.5;

  this.hz = 4;
  this.zeta = 0.7;
  this.speed = 10;

  this.bd = new b2BodyDef();
  var ground = world.CreateBody(this.bd);

  //this.bd.type = b2_dynamicBody;
  this.bd.allowSleep = false;
  this.bd.position.Set(0, 1);
  var body = world.CreateBody(this.bd);

  var b1 = new b2PolygonShape();
  b1.SetAsBoxXYCenterAngle(0.05, 1, new b2Vec2(4, 0), 0);
  body.CreateFixtureFromShape(b1, 5);

  var b2 = new b2PolygonShape();
  b2.SetAsBoxXYCenterAngle(0.05, 1, new b2Vec2(-4, 0), 0);
  body.CreateFixtureFromShape(b2, 5);

  // var b3 = new b2PolygonShape();
  // b3.SetAsBoxXYCenterAngle(4, 0.05, new b2Vec2(0, 1), 0);
  // body.CreateFixtureFromShape(b3, 5);

  var b4 = new b2PolygonShape();
  b4.SetAsBoxXYCenterAngle(4, 0.05, new b2Vec2(0, -1), 0);
  body.CreateFixtureFromShape(b4, 5);

  this.bd = new b2BodyDef();
  this.bd.type = b2_dynamicBody;
  this.bd.allowSleep = false;
  this.bd.position.Set(0, 2);
  // boat body
  this.boat_body = world.CreateBody(this.bd);
  var boat = new b2PolygonShape();
  boat.vertices.push(new b2Vec2(-1.1, 0.05));
  boat.vertices.push(new b2Vec2(1.1, 0.05));
  boat.vertices.push(new b2Vec2(1.0, 0.00));
  // boat.vertices.push(new b2Vec2(0.8, -0.05));
  boat.vertices.push(new b2Vec2(0.5, -0.1));
  boat.vertices.push(new b2Vec2(0.3, -0.15));
  boat.vertices.push(new b2Vec2(-0.3, -0.15));
  boat.vertices.push(new b2Vec2(-0.5, -0.1));
  // boat.vertices.push(new b2Vec2(-0.8, -0.05));
  boat.vertices.push(new b2Vec2(-1.0, 0.00));

  var fixture = new b2FixtureDef();
  fixture.friction = 0.1;
  fixture.density = 0.3;
  fixture.shape = boat;

  this.boat_body.CreateFixtureFromDef(fixture);


  // var jd = new b2RevoluteJointDef();
  // jd.motorSpeed = 0.05 * Math.PI;
  // jd.maxMotorTorque = 1e7;
  // jd.enableMotor = true;
  // this.joint = jd.InitializeAndCreate(ground, this.boat_body, new b2Vec2(0, 1));
  this.time = 0;

  // setup particles
  var psd = new b2ParticleSystemDef();
  psd.radius = 0.05;
  psd.dampingStrength = 0.5;

  var particleSystem = world.CreateParticleSystem(psd);
  var box = new b2PolygonShape();

  box.SetAsBoxXYCenterAngle(3.9, 0.7, new b2Vec2(0, 0.7), 0);


  var particleGroupDef = new b2ParticleGroupDef();

  particleGroupDef.shape = box;
  particleGroupDef.flags = b2_waterParticle;
  particleGroupDef.color = new b2ParticleColor(100, 150, 255, 255);
  var particleGroup = particleSystem.CreateParticleGroup(particleGroupDef);

  this.animals = [];

  // world.SetContactListener(this);
}

TestWaveMachine.prototype.BeginContactBody = function(contact) {
  var fixtureA = contact.GetFixtureA();
  var fixtureB = contact.GetFixtureB();

  if (fixtureA === this.sensor) {
    var userData = fixtureB.body.GetUserData();
    if (userData) {
      this.touching[userData] = true;
    }
  }
  if (fixtureB === this.sensor) {
    var userData = fixtureB.body.GetUserData();
    if (userData) {
      this.touching[userData] = true;
    }
  }
};

TestWaveMachine.prototype.EndContactBody = function(contact) {
  var fixtureA = contact.GetFixtureA();
  var fixtureB = contact.GetFixtureB();

  if (fixtureA === this.sensor) {
    var userData = fixtureB.body.GetUserData();
    if (userData) {
      this.touching[userData] = false;
    }
  }
  if (fixtureB === this.sensor) {
    var userData = fixtureB.body.GetUserData();
    if (userData) {
      this.touching[userData] = false;
    }
  }
};


TestWaveMachine.prototype.Step = function() {
  world.Step(timeStep, velocityIterations, positionIterations);
  this.time += 1 / 60;
  // this.joint.SetMotorSpeed(0.05 * Math.cos(this.time) * Math.PI);
  camera.position.x = this.boat_body.GetWorldCenter().x;

  for (var i = this.animals.length - 1; i >= 0; i--) {
    if (this.animals[i] == undefined) continue;

    // console.log(this.animals[i].body.GetWorldCenter().y);
    if (this.animals[i].body.GetWorldCenter().y < 0.2) {
      // for (var f = 0, max = this.animals[i].body.fixtures.length; f < max; f++) {
      //   // This line is JUST for Three.js
      //   scene.remove(this.animals[i].body.fixtures[f].graphic);
      // }
      // for (var f = 0, max = this.animals[i].wheel.fixtures.length; f < max; f++) {
      //   // This line is JUST for Three.js
      //   scene.remove(this.animals[i].body.fixtures[f].graphic);
      // }
      // world.DestroyBody(this.animals[i].body);
      // world.DestroyBody(this.animals[i].wheel);
      // world.DestroyJoint(this.animals[i].spring);

      // this.animals[i] = undefined;
      this.animals[i].spring.SetMotorSpeed(0);
    }
  };
}

TestWaveMachine.prototype.Draw = function() {
  var canvas = document.getElementById('myCanvas');
  var ctx = canvas.getContext('2d');
  if (ctx != null) {
    //render animal images
    for (i = 0; i < this.animals.length; i++) {
      var dog_body = this.animals[i];
      var position = dog_body.GetWorldCenter();


      var image = new Image();
      image.src = "img/dog.png";
      console.log("position: " + position.x + ", " + position.y);
      ctx.drawImage(image, position.x, position.y);
    }

    var boat_image = new Image();
    boat_image.src = "img/boat.png";
    var boat_center = this.boat_body.GetWorldCenter();
    ctx.drawImage(boat_image, 10 * boat_center.x, 10 * boat_center.y, 10, 5);
  }
}

TestWaveMachine.prototype.AddAnimal = function(color) {
  var animal = {};

  var chassis = new b2PolygonShape;
  chassis.vertices[0] = new b2Vec2(-0.10, -0.05);
  chassis.vertices[1] = new b2Vec2(0.10, -0.05);
  chassis.vertices[2] = new b2Vec2(0.10, 0.0);
  chassis.vertices[3] = new b2Vec2(-0.1, 0.0);

  bd = new b2BodyDef;
  bd.type = b2_dynamicBody;
  bd.userData = color;
  bd.position.Set(this.boat_body.GetWorldCenter().x, 2.0);
  var carFixture = new b2FixtureDef;
  carFixture.shape = chassis;
  carFixture.density = 10.0;
  carFixture.filter.groupIndex = -1;
  car = world.CreateBody(bd);
  car.CreateFixtureFromDef(carFixture);
  console.log("userData: " + car.GetUserData());
  animal.body = car;

  var circle = new b2CircleShape;
  circle.radius = 0.04;
  fd = new b2FixtureDef;
  fd.shape = circle;
  fd.density = 7.0;
  fd.friction = 0.9;
  fd.filter.groupIndex = -1;

  bd.position.Set(this.boat_body.GetWorldCenter().x, 1.935);
  wheel1 = world.CreateBody(bd);
  wheel1.CreateFixtureFromDef(fd);

  animal.wheel = wheel1;

  jd = new b2WheelJointDef;
  var axis = new b2Vec2(0, 1.0); // ?? why

  jd.motorSpeed = 0.0;
  jd.maxMotorTorque = 20.0;
  jd.enableMotor = true;
  jd.frequencyHz = this.hz;
  jd.dampingRatio = this.zeta;
  spring1 =
    jd.InitializeAndCreate(car, wheel1, wheel1.GetPosition(), axis);

  animal.spring = spring1;

  this.animals.push(animal);
  console.log(this.animals);
  console.log("camera pos: x = " + camera.position.x + " y = " + camera.position.y);
  console.log("boat pos: x = " + this.boat_body.GetWorldCenter().x + " y = " + this.boat_body.GetWorldCenter().y);

}

TestWaveMachine.prototype.MoveAnimal = function(animal, direction) {
  if (this.animals[animal] == undefined) return;

  var spring = this.animals[animal].spring;
  console.log("animal: " + animal + " direction: " + direction == 0 ? "left" : "right");
  // var angle = this.boat_body.GetAngle();
  // console.log(angle);
  // var force = direction === 0 ? -0.1 : 0.1;
  // var forceX = force * Math.cos(angle);
  // var forceY = force * Math.sin(angle);
  // var f = dog_body.GetWorldVector(new b2Vec2(forceX, forceY));
  // dog_body.ApplyAngularImpulse(force, true);
  // console.log("dog pos: x = " + dog_body.GetWorldCenter().x + " y = " + dog_body.GetWorldCenter().y);
  // var vect = new b2Vec2(dog_body.GetWorldCenter().x + forceX, dog_body.GetWorldCenter().y + forceY);
  // dog_body.SetTransform(vect, 0);
  // console.log("new dog pos: x = " + dog_body.GetWorldCenter().x + " y = " + dog_body.GetWorldCenter().y);
  spring.SetMotorSpeed(direction == 0 ? this.speed : -this.speed);
  // var horForce = direction < 2 ? (direction == 0 ? -10 : 10) : 0;
  // var verForce = direction < 2 ? 0 : (direction == 2 ? 10 : -10);

  // var f = this.animals[animal].body.GetWorldVector(new b2Vec2(horForce, verForce));
  // var p = this.animals[animal].body.GetWorldCenter();
  // this.animals[animal].body.ApplyForce(f, p, true);
};

// Only for testing
TestWaveMachine.prototype.Keyboard = function(char) {
  switch (char) {
    case 'a':
      this.MoveAnimal(0, 0);
      break;
    case 's':
      this.AddAnimal();
      break;
    case 'd':
      this.MoveAnimal(0, 1);
      break;
    case 'w':
      this.MoveAnimal(0, 2);
      break;
    case 'x':
      this.MoveAnimal(0, 3);
      break;
  }
};