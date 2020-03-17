var contPlayer = 0;

var config = {
  type: Phaser.AUTO,
  parent: 'phaser-example',
  width: 1024,
  height: 768,
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
      gravity: { y: 0 }
    }
  },
  scene: {
    preload: preload,
    create: create,
    update: update
  }
};

var game = new Phaser.Game(config);

function preload() {
  this.load.image('ship', 'assets/spaceShips_001.png');
  this.load.image('otherPlayer', 'assets/enemyBlack5.png');
  this.load.image('pBlue', 'assets/BluePj.png');
  this.load.image('pRed', 'assets/RedPj.png');
  this.load.image('otherPlayerBlue', 'assets/OtherBlue.png');
  this.load.image('otherPlayerRed', 'assets/OtherRed.png');
  this.load.image('star', 'assets/COLSA2.png');
}

function addPlayer(self, playerInfo) {
  contPlayer++;
  if (playerInfo.team === 'blue') {
    self.ship = self.physics.add.image(playerInfo.x, playerInfo.y, 'pBlue').setOrigin(0.5, 0.5).setDisplaySize(90, 65);
  } else {
    self.ship = self.physics.add.image(playerInfo.x, playerInfo.y, 'pRed').setOrigin(0.5, 0.5).setDisplaySize(90, 65);
  }
  self.ship.setDrag(100);
  self.ship.setAngularDrag(100);
  self.ship.setMaxVelocity(200);
}

function create() {
  //game.world.setBounds()
  this.cursors = this.input.keyboard.createCursorKeys();
  var self = this;
  this.socket = io();
  this.otherPlayers = this.physics.add.group();
  this.socket.on('currentPlayers', function (players) {
    Object.keys(players).forEach(function (id) {
      if (players[id].playerId === self.socket.id) {
        addPlayer(self, players[id]);
      } else {
        addOtherPlayers(self, players[id]);
      }
    });
  });
  this.socket.on('newPlayer', function (playerInfo) {
    addOtherPlayers(self, playerInfo);
  });
  this.socket.on('disconnect', function (playerId) {
    self.otherPlayers.getChildren().forEach(function (otherPlayer) {
      if (playerId === otherPlayer.playerId) {
        otherPlayer.destroy();
      }
    });
  });
  this.socket.on('playerMoved', function (playerInfo) {
    self.otherPlayers.getChildren().forEach(function (otherPlayer) {
      if (playerInfo.playerId === otherPlayer.playerId) {
        otherPlayer.setRotation(playerInfo.rotation);
        otherPlayer.setPosition(playerInfo.x, playerInfo.y);
        if((playerInfo.x-self.ship.x<30 && playerInfo.x-self.ship.x>-30) && (playerInfo.y-self.ship.y<30 && playerInfo.y-self.ship.y>-30)){
          console.log("colision");
          
          self.ship.setAcceleration(0);
          self.ship.setAngularVelocity(150);
          self.physics.velocityFromRotation(self.ship.rotation + 1.5, 200, self.ship.body.acceleration);
        }
      }
    });
  });
  this.blueScoreText = this.add.text(16, 16, '', { fontSize: '32px', fill: '#0000FF' });
  this.redScoreText = this.add.text(584, 16, '', { fontSize: '32px', fill: '#FF0000' });

  this.socket.on('scoreUpdate', function (scores) {
    console.log("updated");

    self.blueScoreText.setText('Blue: ' + scores.blue);
    self.redScoreText.setText('Red: ' + scores.red);
  });
  this.socket.on('starLocation', function (starLocation) {
    if (self.star) self.star.destroy();
    self.star = self.physics.add.image(starLocation.x, starLocation.y, 'star');
    self.physics.add.overlap(self.ship, self.star, function () {
      this.socket.emit('starCollected');
    }, null, self);
  });
}

function addOtherPlayers(self, playerInfo) {
  var otherPlayer=self.add.sprite(playerInfo.x, playerInfo.y)
  if (playerInfo.team === 'blue') {
    otherPlayer = self.add.sprite(playerInfo.x, playerInfo.y, 'otherPlayerBlue').setOrigin(0.5, 0.5).setDisplaySize(90, 65);
  } else {
    otherPlayer = self.add.sprite(playerInfo.x, playerInfo.y, 'otherPlayerRed').setOrigin(0.5, 0.5).setDisplaySize(90, 65);
  }
  otherPlayer.playerId = playerInfo.playerId;
  self.otherPlayers.add(otherPlayer);
}

function update() {
  if (this.ship) {
    if (this.cursors.left.isDown) {
      this.ship.setAngularVelocity(-150);
    } else if (this.cursors.right.isDown) {
      this.ship.setAngularVelocity(150);
    } else {
      this.ship.setAngularVelocity(0);
    }

    if (this.cursors.up.isDown) {
      this.physics.velocityFromRotation(this.ship.rotation + 1.5, 100, this.ship.body.acceleration);
    } else {
      this.ship.setAcceleration(0);
    }
    var x = this.ship.x;
    var y = this.ship.y;
    var r = this.ship.rotation;
    if (this.ship.oldPosition && (x !== this.ship.oldPosition.x || y !== this.ship.oldPosition.y || r !== this.ship.oldPosition.rotation)) {
      this.socket.emit('playerMovement', { x: this.ship.x, y: this.ship.y, rotation: this.ship.rotation });
    }
    this.ship.oldPosition = {
      x: this.ship.x,
      y: this.ship.y,
      rotation: this.ship.rotation
    };
  }
}