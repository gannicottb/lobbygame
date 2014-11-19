function TestWaveMachine() {

  this.DEATH_THRESHOLD = 120; // 1 second (60 steps per second)

  camera.position.y = 0.7;
  camera.position.z = 3.5;

  this.hz = 4;
  this.zeta = 0.7;
  this.speed = 5;

  this.wave_starter_l_velocity = 0;
  this.wave_starter_r_velocity = 0;
  this.useWaveStarter = false;

  this.bd = new b2BodyDef();
  var ground = world.CreateBody(this.bd);

  this.bd.type = this.useWaveStarter ? b2_staticBody : b2_dynamicBody;
  this.bd.allowSleep = false;
  this.bd.position.Set(0, 1);
  var body = world.CreateBody(this.bd);


  if (!this.useWaveStarter) {
    var b1 = new b2PolygonShape();
    b1.SetAsBoxXYCenterAngle(0.05, 3, new b2Vec2(5, 0), 0);
    body.CreateFixtureFromShape(b1, 5);

    var b2 = new b2PolygonShape();
    b2.SetAsBoxXYCenterAngle(0.05, 3, new b2Vec2(-5, 0), 0);
    body.CreateFixtureFromShape(b2, 5);

    var b3 = new b2PolygonShape();
    b3.SetAsBoxXYCenterAngle(5, 0.05, new b2Vec2(0, 5), 0);
    body.CreateFixtureFromShape(b3, 5);
  }

  var b4 = new b2PolygonShape();
  b4.SetAsBoxXYCenterAngle(5, 0.05, new b2Vec2(0, -1), 0);
  body.CreateFixtureFromShape(b4, 5);

  if (this.useWaveStarter) {
    this.bd = new b2BodyDef();
    this.bd.type = b2_dynamicBody;
    this.bd.allowSleep = false;
    this.bd.position.Set(0, 1);
    var waveStarterBoardShape = new b2PolygonShape();
    waveStarterBoardShape.SetAsBoxXYCenterAngle(1, 1, new b2Vec2(-7, 0.05), 0);
    this.waveStarterL = world.CreateBody(this.bd);
    this.waveStarterL.CreateFixtureFromShape(waveStarterBoardShape, 100);

    waveStarterBoardShape.SetAsBoxXYCenterAngle(1, 1, new b2Vec2(7, 0.05), 0);
    this.waveStarterR = world.CreateBody(this.bd);
    this.waveStarterR.CreateFixtureFromShape(waveStarterBoardShape, 100);
  }


  var boatBodyRef = new b2BodyDef();
  boatBodyRef.type = b2_dynamicBody;
  boatBodyRef.allowSleep = false;
  boatBodyRef.position.Set(0, 2);
  boatBodyRef.userData = 0xffffff;
  // boat body
  this.boat_body = world.CreateBody(boatBodyRef);


  var boat_shape = new b2PolygonShape();
  boat_shape.vertices.push(new b2Vec2(1.8, 0.00));
  boat_shape.vertices.push(new b2Vec2(1.8, -0.15));
  boat_shape.vertices.push(new b2Vec2(-1.8, -0.15));
  boat_shape.vertices.push(new b2Vec2(-1.8, 0.00));

  // boat_shape.vertices.push(new b2Vec2(1.8, 0.00));
  // boat_shape.vertices.push(new b2Vec2(1.6, -0.09));
  // boat_shape.vertices.push(new b2Vec2(1.3, -0.15));
  // boat_shape.vertices.push(new b2Vec2(0.5, -0.2));
  // boat_shape.vertices.push(new b2Vec2(-0.5, -0.2));
  // boat_shape.vertices.push(new b2Vec2(-1.3, -0.15));
  // boat_shape.vertices.push(new b2Vec2(-1.6, -0.09));
  // boat_shape.vertices.push(new b2Vec2(-1.8, 0.00));
  

  var boat_fixture = new b2FixtureDef();
  boat_fixture.friction = 2;
  boat_fixture.density = 0.3;
  boat_fixture.shape = boat_shape;

  this.boat_body.CreateFixtureFromDef(boat_fixture);

  // Define a new property on boat_body called tag
  this.boat_body.tag = "boat";
  //  
  console.log("boat userData: " + this.boat_body.GetUserData());

  var jd = new b2RevoluteJointDef();
  jd.motorSpeed = 0.05 * Math.PI;
  jd.maxMotorTorque = 1e7;
  jd.enableMotor = this.useWaveStarter ? false : true;
  this.joint = jd.InitializeAndCreate(ground, body, new b2Vec2(0, 1));
  this.time = 0;

  // setup particles
  var psd = new b2ParticleSystemDef();
  psd.radius = 0.06;
  psd.dampingStrength = 0.5;

  var particleSystem = world.CreateParticleSystem(psd);
  var box = new b2PolygonShape();

  box.SetAsBoxXYCenterAngle(3.9, 0.8, new b2Vec2(0, 0.9), 0);


  var particleGroupDef = new b2ParticleGroupDef();

  particleGroupDef.shape = box;
  particleGroupDef.flags = b2_waterParticle;
  particleGroupDef.color = new b2ParticleColor(100, 150, 255, 255);
  var particleGroup = particleSystem.CreateParticleGroup(particleGroupDef);

  this.animals = [];

  world.SetContactListener(this);
  this.direction = 1;
}

TestWaveMachine.prototype.BeginContactBody = function(contact) {
  var fixtureA = contact.GetFixtureA();
  var fixtureB = contact.GetFixtureB();

  // If the boat and a player are in contact, then reset the number of steps the player has been not touching
  if (fixtureA.body.tag == "boat" && fixtureB.body.GetUserData()) {
    fixtureB.body.stepsAway = 0;
    fixtureB.body.touchingBoat = true;
    console.log("Begin contact for Fixture B");
  }

  // If the boat and a player are in contact, then reset the number of steps the player has been not touching
  // if (fixtureB.body.tag == "boat" && fixtureA.body.GetUserData()) {
  //   fixtureA.body.stepsAway = 0;
  //   fixtureA.body.touchingBoat = true;
  //   console.log("Begin contact for Fixture A");
  // }

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

  // If the boat and a player stop touching, set the player flag
  if (fixtureA.body.tag == "boat" && fixtureB.body.GetUserData()) {
    fixtureB.body.touchingBoat = false;
    console.log("End contact for Fixture B");
  }

  // if (fixtureB.body.tag == "boat" && fixtureA.body.GetUserData()) {
  //   fixtureA.body.touchingBoat = false;
  //   console.log("End contact for Fixture A");
  // }

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

// Register death handler
TestWaveMachine.prototype.OnDeath = function(callback) {
  this.deathHandler = callback;
};

TestWaveMachine.prototype.Rain = function() {
  var psd = new b2ParticleSystemDef();
  psd.radius = 0.06;
  psd.dampingStrength = 0.5;

  var particleSystem = world.CreateParticleSystem(psd);
  var box = new b2PolygonShape();

  box.SetAsBoxXYCenterAngle(0.06, 0.06, new b2Vec2(this.boat_body.GetWorldCenter().x, 3), 0);


  var particleGroupDef = new b2ParticleGroupDef();

  particleGroupDef.shape = box;
  particleGroupDef.flags = b2_waterParticle;
  particleGroupDef.color = new b2ParticleColor(100, 150, 255, 255);
  var particleGroup = particleSystem.CreateParticleGroup(particleGroupDef);
};

TestWaveMachine.prototype.Step = function() {
  world.Step(timeStep, velocityIterations, positionIterations);
  this.time += 1 / 50;

  // Wave machine speed
  this.joint.SetMotorSpeed(0.02 * this.wave_starter_l_velocity * Math.cos(this.time) * Math.PI);

  if (this.useWaveStarter) {
    if (this.waveStarterL.GetWorldCenter().x <= -7) {
      this.directionL = 1;
    } else if (this.waveStarterL.GetWorldCenter().x >= -5) {
      this.directionL = -0.5;
    }
    this.waveStarterL.SetLinearVelocity(new b2Vec2(this.wave_starter_l_velocity * this.directionL, 0));

    if (this.waveStarterR.GetWorldCenter().x >= 7) {
      this.directionR = -1;
    } else if (this.waveStarterR.GetWorldCenter().x <= 5) {
      this.directionR = 0.5;
    }
    this.waveStarterR.SetLinearVelocity(new b2Vec2(this.wave_starter_r_velocity * this.directionR, 0));
  }

  // The camera should follow the boat
  camera.position.x = this.boat_body.GetWorldCenter().x;


  for (var i = this.animals.length - 1; i >= 0; i--) {
    var animal = this.animals[i];
    if (animal == undefined) continue;
    if (animal.isDead === true) continue;

    // Is this animal dead?
    if (!animal.body.touchingBoat) {

      animal.body.stepsAway++;

      if(animal.body.stepsAway >= this.DEATH_THRESHOLD / 2) console.debug("Player steps away", animal.body.stepsAway);

      if (animal.body.stepsAway >= this.DEATH_THRESHOLD) {

        animal.spring.SetMotorSpeed(0);

        //DESTROY PLAYER

        for (var f = 0, max = animal.body.fixtures.length; f < max; f++) {
          // This line is JUST for Three.js
          scene.remove(animal.body.fixtures[f].graphic);
        }
        for (var f = 0, max = animal.wheel.fixtures.length; f < max; f++) {
          // This line is JUST for Three.js
          scene.remove(animal.body.fixtures[f].graphic);
        }
        console.log("animal " + i + " will be removed:" + animal);
        // Need to delete joint first, otherwise it will crash
        world.DestroyJoint(animal.spring);
        world.DestroyBody(animal.body);
        world.DestroyBody(animal.wheel);

        animal.isDead = true;
        if (this.deathHandler != null && this.deathHandler != undefined) {
          this.deathHandler(animal.userId);

        }
      }
    }

  };
};

TestWaveMachine.prototype.ResetWorld = function() {
  this.animals = [];
};

TestWaveMachine.prototype.AddAnimal = function(color, uid) {

  var offsetX = this.boat_body.GetWorldCenter().x + RandomFloat(-1, 1);
  var animal = {};
  animal.userId = uid;
  var chassis = new b2PolygonShape;
  chassis.vertices[0] = new b2Vec2(-0.15, -0.05);
  chassis.vertices[1] = new b2Vec2(0.15, -0.05);
  chassis.vertices[2] = new b2Vec2(0.15, 0.05);
  chassis.vertices[3] = new b2Vec2(-0.15, 0.05);

  bd = new b2BodyDef;
  bd.type = b2_dynamicBody;
  bd.userData = color;
  bd.position.Set(offsetX, 2.0);
  var carFixture = new b2FixtureDef;
  carFixture.shape = chassis;
  carFixture.density = 1.0;
  carFixture.filter.groupIndex = -1;
  // carFixture.friction = 10.0;
  car = world.CreateBody(bd);
  car.CreateFixtureFromDef(carFixture);
  console.log("userData: " + car.GetUserData());
  animal.body = car;

  var circle = new b2CircleShape;
  circle.radius = 0.1;  
  fd = new b2FixtureDef;
  fd.shape = circle;
  fd.density = 2.0;
  fd.friction = 5;
  fd.filter.groupIndex = -1;

  bd.position.Set(offsetX, 2.0);
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
  // console.log("camera pos: x = " + camera.position.x + " y = " + camera.position.y);
  // console.log("boat pos: x = " + this.boat_body.GetWorldCenter().x + " y = " + this.boat_body.GetWorldCenter().y);

}

TestWaveMachine.prototype.MoveAnimal = function(animal, direction) {
  if (this.animals[animal] == undefined) return;
  if (this.animals[animal].isDead === true) return;

  var spring = this.animals[animal].spring;
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
  spring.SetMotorSpeed(direction * this.speed);
  // var horForce = direction < 2 ? (direction == 0 ? -10 : 10) : 0;
  // var verForce = direction < 2 ? 0 : (direction == 2 ? 10 : -10);

  // var f = this.animals[animal].body.GetWorldVector(new b2Vec2(horForce, verForce));
  // var p = this.animals[animal].body.GetWorldCenter();
  // this.animals[animal].body.ApplyForce(f, p, true);
};

TestWaveMachine.prototype.setWaveStarterLeftVelocity = function(velocity) {
  this.wave_starter_l_velocity = velocity;
  console.info("WaveStarter left set to",this.wave_starter_l_velocity);
}

TestWaveMachine.prototype.setWaveStarterRightVelocity = function(velocity) {
  this.wave_starter_r_velocity = velocity;
  console.info("WaveStarter right set to",this.wave_starter_r_velocity);

}

// Only for testing
TestWaveMachine.prototype.Keyboard = function(char) {
  switch (char) {
    case 'a':
      this.MoveAnimal(0, 1);
      break;
    case 's':
      this.AddAnimal();
      break;
    case 'd':
      this.MoveAnimal(0, -1);
      break;
    case 'w':
      this.MoveAnimal(0, 0);
      break;
    case 'x':
      this.MoveAnimal(0, 0);
      break;
  }
};