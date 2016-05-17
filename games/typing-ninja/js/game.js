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

    PLAY_SFX: false,
    PLAY_MUSIC: false,

    DISPLAY_SCORE: false
};

TypingNinja.Game = function() {
    // scene objects
    this.player = null;
    this.cloudSmall = null;
    this.cloudBig = null;
    this.bgSky = null;
    this.bgMountain = null;
    this.cliffLeft = null;
    this.cliffRight = null;
    this.valley = null;

    this.gameState = {
        lost: false
    };

    this.blockingKeys = false;

    this.gamePace = 10;
    this.realGamePace = null; // normalized game pace
    this.gameWidth = null;
    this.dropSpeed = null;
    this.cloudSpeed = 0.1;

    this.activeBalloon = 0;
    this.balloonSpacing = 200;
    this.balloonStartPosition = {
        x: 300,
        y: 100
    };

    this.playerBalloonOffset = {
        x: 0,
        y: 78
    };

    this.balloonGlowOffset = {
        x: 0,
        y: -35
    };

    this.cameraPos =  new Phaser.Point(0, 0);
    this.cameraCenterXOffset = 200;

    // smooth movement of camera - change this value to alter the amount of damping, lower values = smoother camera movement
    this.cameraMoveSmoothness = 0.05; 

    this.balloons = [];
    this.balloonGlow = { glow: null, ray: null };

    this.score = 0;
    this.bufferScore = 0;
    this.scoreText = null;

    this.startingText = null;
    this.gameOverText = null;
    this.youWinText = null;

    this.soundEffects = {
        jump: null
    };

    this.core = new TypingCore(env);
};

TypingNinja.Game.prototype = {
    init: function() {
        this.gameWidth = ((env.text.length + 1) * this.balloonSpacing) + this.balloonStartPosition.x;

        // realGamePace is the normalization of set gamePace to account for different game heights (based on screen size)
        this.realGamePace = this.gamePace * this.game.height / 600;
        this.dropSpeed = 0.3 * this.realGamePace;

        // this.game.scale.scaleMode = Phaser.ScaleManager.RESIZE;
        // this.game.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
    },

    preload: function() {
        this.load.image('bg-sky', 'assets/bg_sky.png');
        
        this.load.image('cloud-small', 'assets/cloud_small.png');
        this.load.image('cloud-big', 'assets/cloud_big.png');

        this.load.image('cliff-left', 'assets/cliff_left.png');
        this.load.image('cliff-right', 'assets/cliff_right.png');
        
        this.load.image('valley', 'assets/valley.png');
        this.load.image('bg-mountain', 'assets/bg_mountain.png');
        
        // ninja
        this.load.spritesheet('ninja', 'assets/ninja.png', 170, 170, 15);

        // balloons
        this.load.spritesheet('balloon-yellow', 'assets/simple_balloon_yellow.png', 103, 174, 1);
        this.load.spritesheet('balloon-red', 'assets/simple_balloon_red.png', 103, 174, 1);
        this.load.spritesheet('balloon-purple', 'assets/simple_balloon_purple.png', 103, 174, 1);
        this.load.spritesheet('balloon-blue', 'assets/simple_balloon_blue.png', 103, 174, 1);
        // this.load.spritesheet('balloon-dark', 'assets/simple_balloon_dark.png', 103, 174, 1);

        this.load.spritesheet('balloon-glow', 'assets/balloon_glow.png', 149, 149, 1);
        this.load.spritesheet('balloon-ray-1', 'assets/balloon_ray_1.png', 149, 149, 1);
        this.load.spritesheet('balloon-ray-2', 'assets/balloon_ray_2.png', 149, 149, 1);

        if (TypingNinja.PLAY_SFX) {
            this.load.audio('jump', 'assets/audio/jump.wav');    
        }
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

        var cliffLeftHeight = this.cache.getImage('cliff-left').height;
        this.cliffLeft = this.add.sprite(0, this.game.height - cliffLeftHeight, 'cliff-left');
        
        var cliffRightHeight = this.cache.getImage('cliff-right').height;
        var cliffRightWidth = this.cache.getImage('cliff-right').width;
        this.cliffRight = this.add.sprite(this.gameWidth - cliffRightWidth, this.game.height - cliffRightHeight, 'cliff-right');
        
        var valleyHeight = this.cache.getImage('valley').height;
        this.valley = this.add.tileSprite(0, this.game.height - valleyHeight, this.gameWidth, valleyHeight, 'valley');

        for(var i=0; i<env.text.length; i++) {
            this.createBalloon(i+1, env.text[i]);
        }

        this.createBalloonGlow(this.balloons[1]);

        // var player = this.add.sprite(
        //     this.getBalloonPosition(this.activeBalloon).x, 
        //     this.getBalloonPosition(this.activeBalloon).y, 
        //     'ninja');

        var playerStartPosition = {
            x: 60,
            y: this.game.height - this.cache.getImage('cliff-left').height
        };

        var player = this.add.sprite(playerStartPosition.x, playerStartPosition.y, 'ninja');
        player._state = { isOnStartPlatform: true, isOnEndPlatform: false, isJumping: false };
        player.checkWorldBounds = true;
        player.events.onOutOfBounds.add(this.playerOut, this);

        this.player = player;

        player.scale.x = 1;
        player.scale.y = 1;
        player.anchor.setTo(0.5, 0.1);

        this.cameraPos.setTo(player.x, player.y);

        jumpAnimation = this.player.animations.add('jump', [0, 1, 2, 3, 3, 2, 1, 0], 30, true);
        jumpOffAnimation = this.player.animations.add('jump-off', [0, 1, 2, 3, 3, 5], 30, true);

        // wrongAnimation = this.player.animations.add('wrong', [0, 1, 2, 3, 3, 2, 1, 0], 30, true);

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
                this.player._state.isJumping = false;
                
                if (this.player._state.isOnStartPlatform) {
                    this.player._state.isOnStartPlatform = false;        
                }
                
                this.focusNextBalloon();

                if (this.onLastBalloon()) {
                    this.destroyGlow();
                    var that = this;
                    setTimeout(function() { that.jumpOff(); }, 300);
                }
            }, this);

        jumpOffAnimation.onComplete.add(
            function(sprite, animation) {
                this.player._state.isJumping = false;
                this.player._state.isOnEndPlatform = true;
                this.destroyBalloon(this.activeBalloon);
                sprite.frame = 5;
                this.showYouWin();
            }, this);

        //  enable physics on the player
        this.physics.arcade.enable(this.player);
        // this.player.body.collideWorldBounds = true;

        var keyboard = this.input.keyboard;
        keyboard.onPressCallback = function() {
            if (this.blockingKeys || this.player._state.isOnEndPlatform || this.gameState.lost) {
                return;
            }

            var capturedKeyCode = keyboard.pressEvent.keyCode;
            var capturedChar = String.fromCharCode(capturedKeyCode);
            var delay = this.core.record_keydown_time(capturedChar);
            if (this.core.cur_char) {
                var is_valid = this.core.cur_char.keydown(capturedChar, delay);

                if (is_valid) {
                    this.core.goto_next_char();
                    this.addScore(10);
                    this.blockingKeys = true;
                    this.jump();
                } else {
                    this.wrong();
                }    
            }
        }.bind(this);

        if (TypingNinja.DISPLAY_SCORE) {
            this.scoreText = this.game.add.text(10, 10, 'Score : ' + this.score, {
                fontSize: '20px',
                fill: '#ddd', 
                stroke: '#555',
                strokeThickness: 2
            });

            this.scoreText.fixedToCamera = true;    
        }

        this.startingText = this.game.add.text(
            this.game.width / 2, 
            this.game.height / 2, 
            'Type letter in\nballoon to begin', 
            {
                fontSize: '40px',
                fill: '#ddd',
                stroke: '#52a4c5',
                strokeThickness: 10,
                align: "center"
            }
        );

        this.startingText.anchor.setTo(0.5, 0.5);
        this.add.tween(this.startingText).to({alpha: [1, 1, 1, 1, 0.3, 1]}, 2000, Phaser.Easing.Quadratic.In, true, 0, false);
        
        this.player.frame = 4; // set initial player pose to standing pose (frame 5)
        this.focusNextBalloon(); // focus first balloon when game starts

        if (TypingNinja.PLAY_SFX) {
            this.soundEffects.jump = this.game.add.audio('jump');
        }
    },

    playerOut: function() {
        this.gameState.lost = true;
        this.showGameOver();
    },

    showGameOver: function() {
        this.gameOverText = this.game.add.text(
            this.game.width / 2, 
            this.game.height / 2, 
            'Game Over', 
            {
                fontSize: '70px',
                fill: '#ddd',
                stroke: '#52a4c5',
                strokeThickness: 10,
                align: "center"
            }
        );

        this.gameOverText.anchor.setTo(0.5, 0.5);
        this.gameOverText.scale.setTo(0, 0);

        this.add.tween(this.gameOverText.scale).to({x: [1.3, 1, 1.2, 1], y: [1.3, 1.2, 1, 1]}, 500, Phaser.Easing.Quadratic.InOut, true, 0, 0);
        
        this.gameOverText.fixedToCamera = true;
    },

    showYouWin: function() {
        this.youWinText = this.game.add.text(
            this.game.width / 2, 
            this.game.height / 2, 
            'You Win\nGreat Job', 
            {
                fontSize: '70px',
                fill: '#ddd',
                stroke: '#52a4c5',
                strokeThickness: 10,
                align: "center"
            }
        );

        this.youWinText.anchor.setTo(0.5, 0.5);
        this.youWinText.scale.setTo(0, 0);

        this.add.tween(this.youWinText.scale).to(
            {x: [1.3, 1, 1.2, 1], y: [1.3, 1.2, 1, 1]}, 
            500, 
            Phaser.Easing.Quadratic.InOut, 
            true, 
            0, 
            0).onComplete.add(this.destroyYouWin.bind(this));
        
        this.youWinText.fixedToCamera = true;
    },

    destroyYouWin: function() {
        // console.log('destroy You win');
        this.submitScores();
    },

    submitScores: function() {
        if(this.core.is_done()) {
            console.log('Submitting scores');
            return this.core.submit_score();
        }
    },

    update: function() {
        var player = this.player;
        
        this.cloudBig.tilePosition.x -= this.cloudSpeed;

        this.balloonGlow.ray.angle -= 0.5;

        if (this.gameState.lost) {
            var activeBalloon = this.getActiveBalloon();

            //player.body.position.y -= this.dropSpeed * 50;
            //activeBalloon.body.position.y -= this.dropSpeed * 50;
        }

        if (!player._state.isOnStartPlatform && !player._state.isOnEndPlatform) {
            if (TypingNinja.DISPLAY_SCORE) {
                if (this.bufferScore < this.score) {
                    this.bufferScore++;
                    this.scoreText.text = 'Score : ' + this.bufferScore;
                }    
            }
            
            if (!player._state.isJumping && !player._state.isOnEndPlatform) {
                player.body.position.y += this.dropSpeed;
            }

            var activeBalloon = this.getActiveBalloon();
            activeBalloon.body.position.y += this.dropSpeed;
            
            if (this.game.height - player.body.position.y < this.game.height / 4) {
                this.flashBalloon(activeBalloon);
            }

            this.moveCamera();

            this.bgMountain.x = this.camera.x * 0.5;
            this.valley.x = this.camera.x * 0.2;

            this.cloudSmall.x = this.camera.x * 0.5;
            this.cloudBig.x = this.camera.x * 0.3;
        }
    },

    render: function() {
        if (TypingNinja.DEV_MODE) {
            this.game.debug.text("FPS: " + this.time.fps, 2, 14, "#00ff00");    
        }
    },

    addScore: function(value) {
        if (TypingNinja.DISPLAY_SCORE) {
            this.score += value;    
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

    getActiveBalloon: function() {
        return (this.activeBalloon == 0)? null: this.balloons[this.activeBalloon];
    },

    getNextBalloon: function() {
        if (this.activeBalloon + 1 > env.text.length) {
            return null;
        } else {
            return this.balloons[this.activeBalloon + 1];    
        }
    },

    getBalloonPosition: function(balloonIndex) {
        return {
            x: this.balloons[balloonIndex].position.x + this.playerBalloonOffset.x,
            y: this.balloons[balloonIndex].position.y + this.playerBalloonOffset.y
        }
    },

    onLastBalloon: function() {
        return (this.activeBalloon + 1 > env.text.length);
    },

    createBalloonGlow: function(balloon) {
        var balloonGlow = this.add.sprite(
            balloon.position.x + this.balloonGlowOffset.x,
            balloon.position.y + this.balloonGlowOffset.y, 'balloon-glow');
        balloonGlow.anchor.setTo(0.5, 0.5);
        balloonGlow.alpha = 0.5;

        var balloonRay = this.add.sprite(
            balloon.position.x + this.balloonGlowOffset.x,
            balloon.position.y + this.balloonGlowOffset.y, 'balloon-ray-1');
        balloonRay.anchor.setTo(0.5, 0.5);
        balloonRay.alpha = 0.5;

        this.balloonGlow.glow = balloonGlow;
        this.balloonGlow.ray = balloonRay;

        balloon.bringToTop();
    },

    destroyGlow: function() {
        this.balloonGlow.glow.destroy();
        this.balloonGlow.ray.destroy();
    },

    repositionBalloonGlow: function(balloon) {
        this.balloonGlow.glow.position.x = balloon.position.x + this.balloonGlowOffset.x;
        this.balloonGlow.glow.position.y = balloon.position.y + this.balloonGlowOffset.y;

        this.balloonGlow.ray.position.x = balloon.position.x + this.balloonGlowOffset.x;
        this.balloonGlow.ray.position.y = balloon.position.y + this.balloonGlowOffset.y;
        balloon.bringToTop();
    },

    calculateBalloonCoordinates: function(position) {
        /*
        var positionXCoord = this.balloonStartPosition.x + ((position - 1) * this.balloonSpacing + 
                                ((TypingNinja.RANDOMIZE_BALLOONS)? Math.random() * TypingNinja.RANDOMIZE_AMOUNT: 0));
        */

        var positionXCoord = this.balloonStartPosition.x + ((position - 1) * this.balloonSpacing);

        var positionYCoord = this.balloonStartPosition.y + 
                                ((TypingNinja.RANDOMIZE_BALLOONS)? Math.random() * TypingNinja.RANDOMIZE_AMOUNT: 0);

        return { x: positionXCoord, y: positionYCoord };
    },

    createBalloon: function(position, character) {
        var balloonCoordinates = this.calculateBalloonCoordinates(position);

        var balloon = this.add.sprite(balloonCoordinates.x, balloonCoordinates.y, this.pickBalloonStyle());
        this.balloons[position] = balloon;
        balloon.anchor.setTo(0.5, 0.5);
        balloon._state = { flashing: false };

        this.addTextNodeToBalloon(balloon, character);
        this.physics.arcade.enable(balloon);        
    },

    addTextNodeToBalloon: function(balloon, character) {
        var balloonText = this.add.text(
            0, -30,
            character,
            {
                font: "50px Droid Sans Mono",
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

    focusNextBalloon: function(balloon) {
        var balloon = this.getNextBalloon();

        if (balloon) {
            this.repositionBalloonGlow(balloon);
        }
    },

    flashBalloon: function(balloon) {
        if (balloon._state.flashing) {
            return;
        }
    
        balloon.anchor.setTo(0.5, 0.5);

        var tween = this.add.tween(balloon).to({
            alpha: [1, 0.5]
        }, 300, Phaser.Easing.Linear.None, true, 0, -1);

        balloon._state.flashing = true;
    },

    jerkBalloonAndPlayer: function(balloon) {
        if (balloon) {
            balloon.anchor.setTo(0.5, 0.5);

            var balloonTween = this.add.tween(balloon.scale).to({
                x: [1, 1.2, 1],
                y: [1, 1.2, 1]
            }, 150, Phaser.Easing.Linear.None, true);

            var player = this.player;
            var playerTween = this.add.tween(player.scale).to({
                x: [1, 1.2, 1],
                y: [1, 1.2, 1]
            }, 150, Phaser.Easing.Linear.None, true);
        }   
    },

    destroyBalloon: function(position) {
        if (this.player._state.isOnStartPlatform) {
            return;
        }

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
        this.player._state.isJumping = true;
        player.animations.play('jump', 30, false);

        this.playSound('jump');

        var nextPosition = this.getBalloonPosition(this.activeBalloon + 1);        
        var nextBalloon = this.getNextBalloon();
        var nextBalloonText = nextBalloon.children[0];

        this.add.tween(nextBalloonText).to({
            alpha: [1, 0]}, 200, Phaser.Easing.Linear.None, true
        ).onComplete.add(function() {
            // nextBalloonText.destroy();
        });

        if (player._state.isOnStartPlatform) {
            var startingText = this.startingText;

            this.add.tween(startingText.scale).to({ x: [1, 1.2, 0.5], y: [1, 1.2, 0.5]}, 300, Phaser.Easing.Linear.None, true, 0);
            this.add.tween(startingText).to({ alpha: [1, 0] }, 300, Phaser.Easing.Linear.None, true, 0).onComplete.add(function() {
                startingText.destroy();
            });
        }

        var activePosition = (player._state.isOnStartPlatform)? 
                                    { x: player.body.x + 85, y: player.body.y }: 
                                    this.getBalloonPosition(this.activeBalloon);

        var diffPosition = { x: nextPosition.x - activePosition.x, y: nextPosition.y - activePosition.y };

        this.add.tween(player).to({
            x: [
                activePosition.x,
                activePosition.x + diffPosition.x / 2,
                nextPosition.x
            ],

            y: [
                activePosition.y, 
                100 + diffPosition.y / 2,
                nextPosition.y
            ]
        }, 150, Phaser.Easing.Quadratic.Out, true).interpolation(function(v, k) {
            return Phaser.Math.bezierInterpolation(v, k);
        });
    },

    jumpOff: function() {
        var player = this.player;
        this.player._state.isJumping = true;
        player.animations.play('jump-off', 30, false);

        // this.soundEffects.jump.play();

        var nextPosition = this.getEndPlatformPosition();
        var activePosition = {x: this.player.body.position.x, y: this.player.body.position.y };
        var diffPosition = { x: nextPosition.x - activePosition.x, y: nextPosition.y - activePosition.y };

        this.add.tween(player).to({
            x: [
                activePosition.x,
                activePosition.x + diffPosition.x / 2,
                nextPosition.x
            ],

            y: [
                activePosition.y, 
                50,
                nextPosition.y
            ]
        }, 200, Phaser.Easing.Quadratic.Out, true).interpolation(function(v, k) {
            return Phaser.Math.bezierInterpolation(v, k);
        });
    },

    wrong: function() {
        this.jerkBalloonAndPlayer(this.getActiveBalloon());
    },

    getEndPlatformPosition: function() {
        return { 
            x: this.gameWidth - 200,
            y: this.game.height - this.cache.getImage('cliff-right').height + 100
        };
    },

    moveCamera: function() {
        this.cameraPos.x += (this.player.x - this.cameraPos.x + this.cameraCenterXOffset) * this.cameraMoveSmoothness;
        // this.cameraPos.y += (this.player.y - this.cameraPos.y) * this.cameraMoveSmoothness;
        this.camera.focusOnXY(this.cameraPos.x, this.cameraPos.y);
    },

    playSound: function(sfxName) {
        if (TypingNinja.PLAY_SFX) {
            this.soundEffects[sfxName].play();
        }
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
        Phaser.CANVAS, 'game', null, false, true);

    game.state.add('TypingNinja.Game', TypingNinja.Game);
    game.state.start('TypingNinja.Game');
}

$(run);
