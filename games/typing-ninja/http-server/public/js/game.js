function getWindowDimensions() {
    return {
        width: $(window).width(),
        height: $(window).height() 
    };
}

// var windowDimensions = getWindowDimensions();
var windowDimensions = {width: 800, height: 600};

var game = new Phaser.Game(windowDimensions.width, windowDimensions.height, 
    Phaser.AUTO,
	'my-game', { preload: preload, create: create, update: update, render: render });

/*
if (this.game.device.desktop) {
    this.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
    this.scale.minWidth = gameWidth/2;
    this.scale.minHeight = gameHeight/2;
    this.scale.maxWidth = gameWidth;
    this.scale.maxHeight = gameHeight;
    this.scale.pageAlignHorizontally = true;
    this.scale.pageAlignVertically = true;
    this.scale.setScreenSize(true);
} else {
    this.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
    this.scale.minWidth = gameWidth/2;
    this.scale.minHeight = gameHeight/2;
    this.scale.maxWidth = 2048; //You can change this to gameWidth*2.5 if needed
    this.scale.maxHeight = 1228; //Make sure these values are proportional to the gameWidth and gameHeight
    this.scale.pageAlignHorizontally = true;
    this.scale.pageAlignVertically = true;
    this.scale.forceOrientation(true, false);
    this.scale.hasResized.add(this.gameResized, this);
    this.scale.enterIncorrectOrientation.add(this.enterIncorrectOrientation, this);
    this.scale.leaveIncorrectOrientation.add(this.leaveIncorrectOrientation, this);
    this.scale.setScreenSize(true);
}
*/

// game.stage.scaleMode = Phaser.StageScaleMode.SHOW_ALL;
// game.stage.scale.startFullScreen();


var DEV_MODE = false;

var player;
var bgClouds;
var cursors;


var textToType = "TYPINGNINJAISAGREATGAME";

var BLOCKING_KEYS = false;

var GAME_PACE = 2;
var DROP_SPEED = 0.3 * GAME_PACE;
var CLOUD_SPEED = 0.3;

var ACTIVE_BALLOON = 1;
var TYPING_CURSOR_POSITION = 0;
var BALLOON_SPACING = 200;
var BALLOON_START_POSITION_X = 200;
var BALLOON_START_POSITION_Y = 170;

var GAME_WIDTH = textToType.length * 300;

var cameraPos = new Phaser.Point(0, 0);


var balloons = [];

function preload() {
    game.load.image('bg-static', 'assets/bg-blue.png');
    game.load.image('bg-clouds', 'assets/clouds.png');
    // game.load.image('front-mountain', 'assets/front-mountain.png');
    // game.load.image('background-mountain', 'assets/background-mountain.png');
    
    game.load.spritesheet('ninja', 'assets/Ninja_sprite_03_sized.png', 170, 170, 10);
    game.load.spritesheet('balloon-yellow', 'assets/simple_balloon_yellow.png', 103, 174, 1);
    game.load.spritesheet('balloon-red', 'assets/simple_balloon_red.png', 103, 174, 1);
    game.load.spritesheet('balloon-purple', 'assets/simple_balloon_purple.png', 103, 174, 1);
    game.load.spritesheet('balloon-blue', 'assets/simple_balloon_blue.png', 103, 174, 1);
    // game.load.spritesheet('balloon-dark', 'assets/simple_balloon_dark.png', 103, 174, 1);
}

function create() {
    if (DEV_MODE) {
        game.time.advancedTiming = true;    
    }

    game.world.setBounds(0, 0, GAME_WIDTH, 600);

    // static background (gradient sky)
    bgStatic = game.add.tileSprite(0, 0, game.width, game.height, 'bg-static');
    bgStatic.fixedToCamera = true;

    // moving clouds
    // bgClouds = game.add.tileSprite(0, 0, game.stage.width, game.cache.getImage('bg-clouds').height, 'bg-clouds');
    bgClouds = game.add.tileSprite(0, 0, GAME_WIDTH, game.cache.getImage('bg-clouds').height, 'bg-clouds');
    bgClouds.tileScale.x = 1;
    bgClouds.tileScale.y = 1;
    bgClouds.alpha = 0.5;


    // backMountains = game.add.tileSprite(0, 0, GAME_WIDTH, game.cache.getImage('background-mountain').height, 'background-mountain');
    // backMountains.alpha = 1;
    // backMountains.position.y = 100;

    // frontMountains = game.add.tileSprite(0, 0, GAME_WIDTH, game.cache.getImage('front-mountain').height, 'front-mountain');
    // frontMountains.alpha = 0.7;
    // frontMountains.position.y = 100;


    for(var i=0; i<textToType.length; i++) {
        createBalloon(i+1, textToType[i]);
    }

    player = game.add.sprite(
        getBalloonPosition(ACTIVE_BALLOON).x, 
        getBalloonPosition(ACTIVE_BALLOON).y, 
        'ninja');
    player.scale.x = 0.9;
    player.scale.y = 0.9;
    player.anchor.setTo(0.5, 0.1);

    cameraPos.setTo(player.x, player.y);

    jumpAnimation = player.animations.add('jump', [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 30, true);
    // wrongAnimation = player.animations.add('wrong', [0, 3, 0, 3, 0], 30, true);

    jumpAnimation.onComplete.add(
        function(sprite, animation) {
            sprite.animations.stop(); 
            sprite.frame = 0;
            ACTIVE_BALLOON++;
            var newPosition = getBalloonPosition(ACTIVE_BALLOON);
            sprite.position.x = newPosition.x;
            sprite.position.y = newPosition.y;
            BLOCKING_KEYS = false;
            destroyBalloon(ACTIVE_BALLOON - 1);
        }, this);

    //  enable physics on the player
    game.physics.arcade.enable(player);

    cursors = game.input.keyboard.createCursorKeys();

    game.input.keyboard.onDownCallback = function() {
        if (BLOCKING_KEYS) {
            return;
        }

        var capturedKeyCode = game.input.keyboard.event.keyCode;
        var capturedChar = String.fromCharCode(capturedKeyCode);
        var expectedChar = textToType.charAt(TYPING_CURSOR_POSITION);

        // console.log(capturedChar, expectedChar);

        if (capturedChar == expectedChar) {
            BLOCKING_KEYS = true;
            TYPING_CURSOR_POSITION++;
            jump();
        } else {
            // wrong();
        }
    };

    
}

function getBalloonStyle() {
    var balloonStyles = [
        'balloon-yellow',
        // 'balloon-dark',
        'balloon-blue',
        'balloon-purple',
        'balloon-red'
    ];

    return balloonStyles[Math.floor(Math.random() * balloonStyles.length)];
}

function createBalloon(position, character) {
    var positionXCoord = BALLOON_START_POSITION_X + ((position - 1) * BALLOON_SPACING + Math.random() * 50);
    var positionYCoord = BALLOON_START_POSITION_Y + Math.random() * 50;

    balloons[position] = game.add.sprite(positionXCoord, positionYCoord, getBalloonStyle());
    balloons[position].anchor.setTo(0.5, 0.5);

    var balloonText = game.add.text(
        // (balloons[position].width/2),
        // (balloons[position].height/2) - 25,
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

    balloons[position].addChild(balloonText);

    game.physics.arcade.enable(balloons[position]);
}

function destroyBalloon(position) {
    var balloon = balloons[position];
    // balloon.anchor.setTo(0.5, 0.5);

    var tween = game.add.tween(balloon).to({
        alpha: [1, 0], y: [150]
    }, 300, Phaser.Easing.Linear.None, true).onComplete.add(function() {
        balloon.destroy();
    });

    game.add.tween(balloon.scale).to({
        x: [1, 0.1], y: [1, 0.1]
    }, 200, Phaser.Easing.Linear.None, true);
}

function jump() {
    player.animations.play('jump', 30, false);

    var nextPosition = getBalloonPosition(ACTIVE_BALLOON + 1);
    var activePosition = getBalloonPosition(ACTIVE_BALLOON);
    var diffPosition = { x: nextPosition.x - activePosition.x, y: nextPosition.y - activePosition.y };

    game.add.tween(player).to({
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
}

function getBalloonPosition(balloonIndex) {
    return {
        x: balloons[balloonIndex].position.x,
        y: balloons[balloonIndex].position.y + 78
    }
}

// function wrong() {
//     player.animations.play('wrong', 15, false);
// }

/*
function gameOver() {
    var text = game.add.text(
        game.width/2, game.height/2,
        "Game Over",
        {
            font: "100px Arial",
            fill: "#fff",
            stroke: "#555",
            strokeThickness: 1,
            align: "center"
        });

    text.anchor.setTo(0.5, 0.5);
    text.scale.x = 0.1;
    text.scale.y = 0.1;

    game.add.tween(text.scale).to({
        x: [0.5, 1], y: [0.5, 1]
    }, 300, Phaser.Easing.Linear.None, true);
}
*/

function update() {
    if (DEV_MODE) {
        game.debug.text("FPS: " + game.time.fps, 2, 14, "#00ff00");    
    }
    
    bgClouds.tilePosition.x -= CLOUD_SPEED;

    // frontMountains.tilePosition.x -= CLOUD_SPEED * 2;

    player.body.position.y += DROP_SPEED;
    balloons[ACTIVE_BALLOON].body.position.y += DROP_SPEED;


    // smooth movement of camera - change this value to alter the amount of damping, lower values = smoother camera movement
    var lerp = 0.05;
    cameraPos.x += (player.x - cameraPos.x) * lerp;
    cameraPos.y += (player.y - cameraPos.y) * lerp;
    this.game.camera.focusOnXY(cameraPos.x, cameraPos.y);
}

function render() {
    if (DEV_MODE) {
        game.debug.cameraInfo(game.camera, 400, 450);
        game.debug.spriteCoords(player, 400, 550);
    }
    
}