function TestWaveMachine() {
  camera.position.y = 1;
  camera.position.z = 2.5;

  this.bd = new b2BodyDef();
  var ground = world.CreateBody(this.bd);

  // this.bd.type = b2_dynamicBody;
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
  var boat_body = world.CreateBody(this.bd);
  var boat = new b2PolygonShape();
  boat.vertices.push(new b2Vec2(-0.9, 0.05));
  boat.vertices.push(new b2Vec2(0.9, 0.05));
  boat.vertices.push(new b2Vec2(0.7, 0.00));
  boat.vertices.push(new b2Vec2(0.5, -0.03));
  boat.vertices.push(new b2Vec2(-0.5, -0.03));
  boat.vertices.push(new b2Vec2(-0.7, 0.00));


  boat_body.CreateFixtureFromShape(boat, 0.3);


  var jd = new b2RevoluteJointDef();
  jd.motorSpeed = 0.05 * Math.PI;
  jd.maxMotorTorque = 1e7;
  jd.enableMotor = true;
  this.joint = jd.InitializeAndCreate(ground, body, new b2Vec2(0, 1));
  this.time = 0;

  // setup particles
  var psd = new b2ParticleSystemDef();
  psd.radius = 0.025;
  psd.dampingStrength = 0.2;

  var particleSystem = world.CreateParticleSystem(psd);
  var box = new b2PolygonShape();
  box.SetAsBoxXYCenterAngle(3.9, 0.45, new b2Vec2(0, 0.0), 0);

  var particleGroupDef = new b2ParticleGroupDef();
  particleGroupDef.shape = box;
  var particleGroup = particleSystem.CreateParticleGroup(particleGroupDef);

  this.animals = [];
}

TestWaveMachine.prototype.Step = function() {
  world.Step(timeStep, velocityIterations, positionIterations);
  this.time += 1 / 60;
  this.joint.SetMotorSpeed(0.05 * Math.cos(this.time) * Math.PI);
}

TestWaveMachine.prototype.AddAnimal = function() {
  console.log("TestWaveMachine: AddAnimal");
  var dog_body = world.CreateBody(this.bd);
  var dog = new b2CircleShape();
  dog.position.Set(0, 0.3);
  dog.radius = 0.1;
  dog_body.CreateFixtureFromShape(dog, 3);
  this.animals.push(dog_body);
}

TestWaveMachine.prototype.MoveAnimal = function(animal, direction) {
  var dog_body = this.animals[animal];
  var f = dog_body.GetWorldVector(new b2Vec2(direction === 0 ? -3 : 3, 0));
  dog_body.ApplyForceToCenter(f, true);
};