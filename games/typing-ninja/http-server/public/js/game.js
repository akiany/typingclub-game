var TypingNinja = {
    DEV_MODE: false,
    FULL_SCREEN: false
};

TypingNinja.Game = function() {
    this.player = null;
    this.bgClouds = null;
    this.bgStatic = null;

    this.textToType = "TYPINGNINJAISAGREATGAME";
    this.typingCursorPosition = 0;
    this.blockingKeys = false;

    this.gamePace = 2;
    this.gameWidth = null;
    this.dropSpeed = null;
    this.cloudSpeed = 0.3;

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
};

TypingNinja.Game.prototype = {
    init: function() {
        this.gameWidth = this.textToType.length * 300;
        this.dropSpeed = 0.3 * this.gamePace;
    },

    preload: function() {
        this.load.image('bg-static', 'assets/bg-blue.png');
        this.load.image('bg-clouds', 'assets/clouds.png');
        
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

        this.world.setBounds(0, 0, this.gameWidth, 600);

        // static background (gradient sky)
        this.bgStatic = this.add.tileSprite(0, 0, this.game.width, this.game.height, 'bg-static');
        this.bgStatic.fixedToCamera = true;

        // moving clouds
        this.bgClouds = this.add.tileSprite(0, 0, this.gameWidth, this.cache.getImage('bg-clouds').height, 'bg-clouds');
        this.bgClouds.tileScale.x = 1;
        this.bgClouds.tileScale.y = 1;
        this.bgClouds.alpha = 0.5;

        for(var i=0; i<this.textToType.length; i++) {
            this.createBalloon(i+1, this.textToType[i]);
        }

        this.player = this.add.sprite(
            this.getBalloonPosition(this.activeBalloon).x, 
            this.getBalloonPosition(this.activeBalloon).y, 
            'ninja');

        this.player.scale.x = 0.9;
        this.player.scale.y = 0.9;
        this.player.anchor.setTo(0.5, 0.1);

        this.cameraPos.setTo(this.player.x, this.player.y);

        jumpAnimation = this.player.animations.add('jump', [0, 1, 2, 3, 4, 5, 6, 7], 30, true);
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

        var keyboard = this.input.keyboard;
        var that = this;
        keyboard.onDownCallback = function() {
            if (that.blockingKeys) {
                return;
            }

            var capturedKeyCode = keyboard.event.keyCode;
            var capturedChar = String.fromCharCode(capturedKeyCode);
            var expectedChar = that.textToType.charAt(that.typingCursorPosition);

            if (capturedChar == expectedChar) {
                that.blockingKeys = true;
                that.typingCursorPosition++;
                that.jump();
            } else {
                // wrong();
            }
        };        
    },

    update: function() {
        if (TypingNinja.DEV_MODE) {
            this.game.debug.text("FPS: " + this.time.fps, 2, 14, "#00ff00");    
        }
        
        this.bgClouds.tilePosition.x -= this.cloudSpeed;

        // frontMountains.tilePosition.x -= cloudSpeed * 2;

        this.player.body.position.y += this.dropSpeed;
        this.balloons[this.activeBalloon].body.position.y += this.dropSpeed;

        this.moveCamera();
    },

    render: function() {
        if (TypingNinja.DEV_MODE) {
            this.game.debug.cameraInfo(this.game.camera, 400, 450);
            this.game.debug.spriteCoords(this.player, 400, 550);
        }
        
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

    getBalloonPosition: function(balloonIndex) {
        return {
            x: this.balloons[balloonIndex].position.x + this.playerBalloonOffset.x,
            y: this.balloons[balloonIndex].position.y + this.playerBalloonOffset.y
        }
    },

    createBalloon: function(position, character) {
        var positionXCoord = this.balloonStartPosition.x + ((position - 1) * this.balloonSpacing + Math.random() * 50);
        var positionYCoord = this.balloonStartPosition.y + Math.random() * 50;

        this.balloons[position] = this.add.sprite(positionXCoord, positionYCoord, this.pickBalloonStyle());
        this.balloons[position].anchor.setTo(0.5, 0.5);

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

        this.balloons[position].addChild(balloonText);

        this.physics.arcade.enable(this.balloons[position]);
    },

    destroyBalloon: function(position) {
        var balloon = this.balloons[position];
        // balloon.anchor.setTo(0.5, 0.5);

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
        this.player.animations.play('jump', 30, false);

        var nextPosition = this.getBalloonPosition(this.activeBalloon + 1);
        var activePosition = this.getBalloonPosition(this.activeBalloon);
        var diffPosition = { x: nextPosition.x - activePosition.x, y: nextPosition.y - activePosition.y };

        this.add.tween(this.player).to({
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
        }, 200, Phaser.Easing.Linear.None, true);

        // bgClouds.tilePosition.x -= 0.2;
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
    function getWindowDimensions() {
        return {
            width: $(window).width(),
            height: $(window).height() 
        };
    }

    var windowDimensions = {width: 800, height: 600};

    if (TypingNinja.FULL_SCREEN) {
        var windowDimensions = getWindowDimensions();
        $('.game-normal').removeClass('game-normal').addClass('game-fullscreen');
    }

    var game = new Phaser.Game(
        windowDimensions.width, 
        windowDimensions.height,
        Phaser.AUTO, 'game', null, false, true);

    game.state.add('TypingNinja.Game', TypingNinja.Game);
    game.state.start('TypingNinja.Game');
}

$(run);
