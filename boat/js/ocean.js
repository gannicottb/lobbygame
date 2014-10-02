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

  var b3 = new b2PolygonShape();
  b3.SetAsBoxXYCenterAngle(4, 0.05, new b2Vec2(0, 1), 0);
  body.CreateFixtureFromShape(b3, 5);

  var b4 = new b2PolygonShape();
  b4.SetAsBoxXYCenterAngle(4, 0.05, new b2Vec2(0, -1), 0);
  body.CreateFixtureFromShape(b4, 5);

  this.bd = new b2BodyDef();
  this.bd.type = b2_dynamicBody;
  this.bd.allowSleep = false;
  this.bd.position.Set(0, 1);
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


  var jd = new b2RevoluteJointDef();
  jd.motorSpeed = 0.05 * Math.PI;
  jd.maxMotorTorque = 1e7;
  jd.enableMotor = true;
  // this.joint = jd.InitializeAndCreate(ground, this.boat_body, new b2Vec2(0, 1));
  this.time = 0;

  // setup particles
  var psd = new b2ParticleSystemDef();
  psd.radius = 0.025;
  psd.dampingStrength = 0.2;

  var particleSystem = world.CreateParticleSystem(psd);
  var box = new b2PolygonShape();
  box.SetAsBoxXYCenterAngle(3.9, 0.4, new b2Vec2(0, 0.2), 0);

  var particleGroupDef = new b2ParticleGroupDef();
  particleGroupDef.shape = box;
  var particleGroup = particleSystem.CreateParticleGroup(particleGroupDef);

  this.animals = [];
}

var j = 0;

TestWaveMachine.prototype.Step = function() {
  world.Step(timeStep, velocityIterations, positionIterations);
  this.time += 1 / 60;
  this.joint.SetMotorSpeed(0.05 * Math.cos(this.time) * Math.PI);
  camera.position.x = this.boat_body.GetWorldCenter().x;

  //render animal images
  for (i = 0; i < this.animals.length; i++) { 
    var dog_body = this.animals[i];
    var position = dog_body.GetWorldCenter();
    draw(position.x, position.y);    
  }
}

TestWaveMachine.prototype.AddAnimal = function() {
  var chassis = new b2PolygonShape;
  chassis.vertices[0] = new b2Vec2(-0.10, -0.05);
  chassis.vertices[1] = new b2Vec2(0.10, -0.05);
  chassis.vertices[2] = new b2Vec2(0.10, 0.0);
  chassis.vertices[3] = new b2Vec2(-0.1, 0.0);

  var circle = new b2CircleShape;
  circle.radius = 0.04;

  bd = new b2BodyDef;
  bd.type = b2_dynamicBody;
  bd.position.Set(0.0, 0.5);
  car = world.CreateBody(bd);
  car.CreateFixtureFromShape(chassis, 1.0);

  fd = new b2FixtureDef;
  fd.shape = circle;
  fd.density = 4.0;
  fd.friction = 0.9;

  bd.position.Set(0.0, 0.435);
  wheel1 = world.CreateBody(bd);
  wheel1.CreateFixtureFromDef(fd);

  jd = new b2WheelJointDef;
  var axis = new b2Vec2(0.0, 1.0); // ?? why

  jd.motorSpeed = 0.0;
  jd.maxMotorTorque = 20.0;
  jd.enableMotor = true;
  jd.frequencyHz = this.hz;
  jd.dampingRatio = this.zeta;
  spring1 =
    jd.InitializeAndCreate(car, wheel1, wheel1.GetPosition(), axis);

  this.animals.push(spring1);
  console.log("camera pos: x = " + camera.position.x + " y = " + camera.position.y);
  console.log("boat pos: x = " + this.boat_body.GetWorldCenter().x + " y = " + this.boat_body.GetWorldCenter().y);

}

TestWaveMachine.prototype.MoveAnimal = function(animal, direction) {
  var spring = this.animals[animal];
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
  }
};