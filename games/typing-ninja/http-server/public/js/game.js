function getWindowDimensions() {
    return {
        width: $(window).width(),
        height: $(window).height() 
    };
}

// $(window).resize(function() {});

var TypingNinja = {
    STANDARD_DIMENSIONS: { x: 800, y: 600 },
    DEV_MODE: false,
    FULL_SCREEN: true,

    RANDOMIZE_BALLOONS: true,
    RANDOMIZE_AMOUNT: 50,

    // TYPE_MODE > options: 'next-balloon', 'current-balloon'
    // TYPE_MODE: 'current-balloon',
    TYPE_MODE: 'next-balloon',
};

TypingNinja.Game = function() {
    // scene objects
    this.player = null;
    this.cloudSmall = null;
    // this.cloudBig = null;
    this.bgSky = null;
    this.bgMountain = null;
    this.cliffLeft = null;
    this.cliffRight = null;
    this.valley = null;

    // this.textToType = "TYPING NINJA IS A GREAT GAME FOR EVERYONE TO PRACTICE";
    this.textToType = "TYPING NINJA";
    this.typingCursorPosition = 0;
    this.blockingKeys = false;

    this.gamePace = 5;
    this.gameWidth = null;
    this.dropSpeed = null;
    this.cloudSpeed = 0.1;

    this.activeBalloon = 1;
    this.balloonSpacing = 200;
    this.balloonStartPosition = {
        x: 200,
        y: 170
    };

    this.playerBalloonOffset = {
        x: 0,
        y: 78
    };

    this.cameraPos =  new Phaser.Point(0, 0);

    // smooth movement of camera - change this value to alter the amount of damping, lower values = smoother camera movement
    this.cameraMoveSmoothness = 0.05; 

    this.balloons = [];
    this.firstBalloon = true;

    this.score = 0;
    this.bufferScore = 0;
    this.scoreText = null;
};

TypingNinja.Game.prototype = {
    init: function() {
        this.gameWidth = ((this.textToType.length + 1) * this.balloonSpacing) + this.balloonStartPosition.x;
        this.dropSpeed = 0.3 * this.gamePace;

        // this.scale.scaleMode = Phaser.ScaleManager.RESIZE;
    },

    preload: function() {
        this.load.image('bg-sky', 'assets/bg_sky.png');
        
        this.load.image('cloud-small', 'assets/cloud_small.png');
        this.load.image('cloud-big', 'assets/cloud_big.png');

        this.load.image('cliff-left', 'assets/cliff_left.png');
        this.load.image('cliff-right', 'assets/cliff_right.png');
        
        this.load.image('valley', 'assets/valley.png');
        this.load.image('bg-mountain', 'assets/bg_mountain.png');
        
        this.load.spritesheet('ninja', 'assets/Ninja_sprite_03_sized.png', 170, 170, 10);
        this.load.spritesheet('balloon-yellow', 'assets/simple_balloon_yellow.png', 103, 174, 1);
        this.load.spritesheet('balloon-red', 'assets/simple_balloon_red.png', 103, 174, 1);
        this.load.spritesheet('balloon-purple', 'assets/simple_balloon_purple.png', 103, 174, 1);
        this.load.spritesheet('balloon-blue', 'assets/simple_balloon_blue.png', 103, 174, 1);
        // this.load.spritesheet('balloon-dark', 'assets/simple_balloon_dark.png', 103, 174, 1);
    },

    create: function() {
        if (TypingNinja.DEV_MODE) {
            this.time.advancedTiming = true;    
        }

        this.world.setBounds(0, 0, this.gameWidth, this.game.height);

        // static background (gradient sky)
        this.bgSky = this.add.tileSprite(0, 0, this.game.width, this.game.height, 'bg-sky');
        this.bgSky.fixedToCamera = true;

        if (TypingNinja.FULL_SCREEN) {
            var scale = Math.max(this.game.height / TypingNinja.STANDARD_DIMENSIONS.y, 1);
            this.bgSky.scale.y = scale;
        }

        var mountainHeigh = this.cache.getImage('bg-mountain').height;
        this.bgMountain = this.add.tileSprite(0, this.game.height - mountainHeigh - (this.game.height / 6), this.gameWidth, mountainHeigh, 'bg-mountain');


        // moving clouds
        this.cloudSmall = this.add.tileSprite(0, 0, this.gameWidth, this.cache.getImage('cloud-small').height, 'cloud-small');
        this.cloudSmall.tileScale.x = 1;
        this.cloudSmall.tileScale.y = 1;
        this.cloudSmall.alpha = 0.2;

        this.cloudBig = this.add.tileSprite(0, 0, this.gameWidth, this.cache.getImage('cloud-big').height, 'cloud-big');
        this.cloudBig.tileScale.x = 1;
        this.cloudBig.tileScale.y = 1;
        this.cloudBig.alpha = 0.4;

        for(var i=0; i<this.textToType.length; i++) {
            this.createBalloon(i+1, this.textToType[i]);
        }

        var cliffLeftHeight = this.cache.getImage('cliff-left').height;
        this.cliffLeft = this.add.sprite(0, this.game.height - cliffLeftHeight, 'cliff-left');
        
        var cliffRightHeight = this.cache.getImage('cliff-right').height;
        var cliffRightWidth = this.cache.getImage('cliff-right').width;
        this.cliffRight = this.add.sprite(this.gameWidth - cliffRightWidth, this.game.height - cliffRightHeight, 'cliff-right');
        
        var valleyHeight = this.cache.getImage('valley').height;
        this.valley = this.add.tileSprite(0, this.game.height - valleyHeight, this.gameWidth, valleyHeight, 'valley');

        var player = this.add.sprite(
            this.getBalloonPosition(this.activeBalloon).x, 
            this.getBalloonPosition(this.activeBalloon).y, 
            'ninja');

        this.player = player;

        player.scale.x = 0.9;
        player.scale.y = 0.9;
        player.anchor.setTo(0.5, 0.1);

        this.cameraPos.setTo(player.x, player.y);

        jumpAnimation = this.player.animations.add('jump', [0, 1, 3, 5, 5, 3, 1, 0], 30, true);
        // wrongAnimation = this.player.animations.add('wrong', [0, 3, 0, 3, 0], 30, true);

        jumpAnimation.onComplete.add(
            function(sprite, animation) {
                sprite.animations.stop(); 
                sprite.frame = 0;
                this.activeBalloon++;
                var newPosition = this.getBalloonPosition(this.activeBalloon);
                sprite.position.x = newPosition.x;
                sprite.position.y = newPosition.y;
                this.blockingKeys = false;
                this.destroyBalloon(this.activeBalloon - 1);
            }, this);

        //  enable physics on the player
        this.physics.arcade.enable(this.player);
        // this.player.body.collideWorldBounds = true;

        var keyboard = this.input.keyboard;
        var that = this;
        keyboard.onDownCallback = function() {
            if (that.blockingKeys) {
                return;
            }

            var capturedKeyCode = keyboard.event.keyCode;
            var capturedChar = String.fromCharCode(capturedKeyCode);
            
            var cursorPosition = (TypingNinja.TYPE_MODE == 'next-balloon')? 
                                        that.typingCursorPosition + 1: 
                                        that.typingCursorPosition;

            var expectedChar = that.textToType.charAt(cursorPosition);

            if (capturedChar == expectedChar) {
                that.addScore(10);
                that.blockingKeys = true;
                that.typingCursorPosition++;
                that.jump();
            } else {
                // wrong();
            }
        };

        this.scoreText = this.game.add.text(10, 10, 'Score : ' + this.score, {
                fontSize: '20px',
                fill: '#ddd', 
                stroke: "#555",
                strokeThickness: 2
        });

        this.scoreText.fixedToCamera = true;
    },

    update: function() {
        var player = this.player;

        if (TypingNinja.DEV_MODE) {
            this.game.debug.text("FPS: " + this.time.fps, 2, 14, "#00ff00");    
        }

        if (!this.player.inWorld) {

        }

        if (this.bufferScore < this.score) {
            this.bufferScore++;
            this.scoreText.text = 'Score : ' + this.bufferScore;
        }
        
        // this.cloudSmall.tilePosition.x -= this.cloudSpeed;
        this.cloudBig.tilePosition.x -= this.cloudSpeed;

        player.body.position.y += this.dropSpeed;
        
        var activeBalloon = this.getActiveBalloon();
        activeBalloon.body.position.y += this.dropSpeed;

        if (this.game.height - player.body.position.y < this.game.height / 2) {
            this.flashBalloon(activeBalloon);
        }

        this.moveCamera();

        this.bgMountain.x = this.camera.x * 0.5;
        this.valley.x = this.camera.x * 0.2;

        this.cloudSmall.x = this.camera.x * 0.5;
        this.cloudBig.x = this.camera.x * 0.3;
    },

    render: function() {
        if (TypingNinja.DEV_MODE) {
            this.game.debug.cameraInfo(this.game.camera, 400, 450);
            this.game.debug.spriteCoords(this.player, 400, 550);
        }  
    },

    addScore: function(value) {
        this.score += value;
    },

    pickBalloonStyle: function() {
        var balloonStyles = [
            'balloon-yellow',
            // 'balloon-dark',
            'balloon-blue',
            'balloon-purple',
            'balloon-red'
        ];

        return balloonStyles[Math.floor(Math.random() * balloonStyles.length)];
    },

    getActiveBalloon: function() {
        return this.balloons[this.activeBalloon];
    },

    getBalloonPosition: function(balloonIndex) {
        // if (balloonIndex > this.textToType.length) {
        //     return {
        //         x: this.player.body.position.x + 100,
        //         y: this.player.body.position.y - 1000
        //     }
        // }

        return {
            x: this.balloons[balloonIndex].position.x + this.playerBalloonOffset.x,
            y: this.balloons[balloonIndex].position.y + this.playerBalloonOffset.y
        }
    },

    createBalloon: function(position, character) {
        // var positionXCoord = this.balloonStartPosition.x + ((position - 1) * this.balloonSpacing + 
        //                         ((TypingNinja.RANDOMIZE_BALLOONS)? Math.random() * TypingNinja.RANDOMIZE_AMOUNT: 0));

        var positionXCoord = this.balloonStartPosition.x + ((position - 1) * this.balloonSpacing);

        var positionYCoord = this.balloonStartPosition.y + 
                                ((TypingNinja.RANDOMIZE_BALLOONS)? Math.random() * TypingNinja.RANDOMIZE_AMOUNT: 0);

        var balloon = this.add.sprite(positionXCoord, positionYCoord, this.pickBalloonStyle());
        this.balloons[position] = balloon;
        balloon.anchor.setTo(0.5, 0.5);
        balloon.state = { flashing: false };

        if (TypingNinja.TYPE_MODE == 'next-balloon') {
            if (!this.firstBalloon) {
                this.addTextNodeToBalloon(balloon, character);
            } else {
                this.firstBalloon = false;
            }
        } else {
            this.addTextNodeToBalloon(balloon, character);
        }

        this.physics.arcade.enable(balloon);        
    },

    addTextNodeToBalloon: function(balloon, character) {
        var balloonText = this.add.text(
            0, -30,
            character,
            {
                font: "50px Arial",
                fill: "#fff",
                stroke: "#555",
                strokeThickness: 1,
                align: "center"
            });

        balloonText.anchor.setTo(0.5, 0.5);
        balloonText.scale.x = 1;
        balloonText.scale.y = 1;

        balloon.addChild(balloonText);
    },

    flashBalloon: function(balloon) {
        if (balloon.state.flashing) {
            return;
        }
    
        balloon.anchor.setTo(0.5, 0.5);

        var tween = this.add.tween(balloon).to({
            alpha: [1, 0.5]
        }, 200, Phaser.Easing.Linear.None, true, 0, -1);

        balloon.state.flashing = true;
    },

    destroyBalloon: function(position) {
        var balloon = this.balloons[position];
        balloon.anchor.setTo(0.5, 0.5);

        var tween = this.add.tween(balloon).to({
            alpha: [1, 0], y: [150]
        }, 300, Phaser.Easing.Linear.None, true).onComplete.add(function() {
            balloon.destroy();
        });

        this.add.tween(balloon.scale).to({
            x: [1, 0.1], y: [1, 0.1]
        }, 200, Phaser.Easing.Linear.None, true);
    },

    jump: function() {
        var player = this.player;
        player.animations.play('jump', 30, false);

        var nextPosition = this.getBalloonPosition(this.activeBalloon + 1);
        
        if (TypingNinja.TYPE_MODE == 'next-balloon') {
            var nextBalloon = this.balloons[this.activeBalloon + 1];
            var nextBalloonText = nextBalloon.children[0];
            this.add.tween(nextBalloonText).to({
                alpha: [1, 0]}, 200, Phaser.Easing.Linear.None, true
            ).onComplete.add(function() {
                nextBalloonText.destroy();
            });
        }

        var activePosition = this.getBalloonPosition(this.activeBalloon);
        var diffPosition = { x: nextPosition.x - activePosition.x, y: nextPosition.y - activePosition.y };

        this.add.tween(player).to({
            x: [
                activePosition.x,
                activePosition.x + diffPosition.x / 4,
                activePosition.x + diffPosition.x / 2,
                nextPosition.x
            ],

            y: [
                activePosition.y, 
                nextPosition.y - 40,
                nextPosition.y - 50,
                nextPosition.y
            ]
        }, 150, Phaser.Easing.Linear.None, true);

        // cloudSmall.tilePosition.x -= 0.2;
        // cloudBig.tilePosition.x -= 0.2;
    },

    // wrong: function() {
    //     player.animations.play('wrong', 15, false);
    // },
    

    moveCamera: function() {
        this.cameraPos.x += (this.player.x - this.cameraPos.x) * this.cameraMoveSmoothness;
        this.cameraPos.y += (this.player.y - this.cameraPos.y) * this.cameraMoveSmoothness;
        this.camera.focusOnXY(this.cameraPos.x, this.cameraPos.y);
    }
};

function run() {
    var windowDimensions = {width: 800, height: 600};

    if (TypingNinja.FULL_SCREEN) {
        windowDimensions = getWindowDimensions();
        $('.game-normal').removeClass('game-normal').addClass('game-fullscreen');
    }

    var game = new Phaser.Game(
        windowDimensions.width, windowDimensions.height,
        // '100%', '100%',
        Phaser.AUTO, 'game', null, false, true);

    game.state.add('TypingNinja.Game', TypingNinja.Game);
    game.state.start('TypingNinja.Game');
}

$(run);
