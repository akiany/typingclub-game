
function TypingCore(env){
	this.log = [];
	this.chars = [];
	this.env = env;
	this.create_char_profiles();
	this.reset_stats();
	this.cur_char;
	this.cur_char_index;
	this.submit_count = 0;
	this.unique_id = new Date().getTime();
}

TypingCore.prototype.record_keydown_time = function(key, delay){
    if(delay == undefined) {
        delay = 0;
        var now = new Date();
        if(this.lesson.last_keydown) {
            delay = (now - this.lesson.last_keydown) - this.lesson.last_pause_duration;
        }
        this.lesson.last_keydown = now;
    }

    this.lesson.last_pause_duration = 0;
    this.duration += delay;
    return delay;
};

TypingCore.prototype.create_char_profiles = function(){
	var text = this.env.text;
	for(var i=0;i<text.length;i++){
		var char_obj = new Char(text[i], i);
		this.chars.push(char_obj);
	}
	if(this.chars.length)
		this.cur_char = this.chars[0];
	this.cur_char_index = 0;
}

TypingCore.prototype.reset_stats = function(){
    this.runstats = {valids:0,errors:0,total_chars:0};
    this.lesson = {};
};


TypingCore.prototype.is_done = function(){
	return this.cur_char_index >= (this.env.text.length-1);
}

TypingCore.prototype.goto_next_char = function(){
	if(this.cur_char_index < this.env.text.length)
		this.cur_char_index++;
	this.cur_char = this.chars[this.cur_char_index];
}

TypingCore.prototype.submit_score = function(is_partial, callback){
    this.submit_count++;

    var chr_stats = [];
    for(var i=0;i<this.chars.length;i++)
    	chr_stats.push(this.chars[i].stats);

    var stat_dict = {
        'per_chr': chr_stats.slice(0, this.cur_char_index),
        'history': this.log,
        'lesson_text': this.env.text.slice(0, this.cur_char_index),
        'lesson_id': this.env.lesson_id,
        'is_partial': is_partial?1:0,
        'id': this.unique_id,
        'deletable': this.env.deletable
    };

    if(JSON && JSON.stringify)
        var _enc_str = JSON.stringify(stat_dict);
    else
        var _enc_str = $.toJSON(stat_dict);

    var data = {data:_enc_str};

    // abort until plugged in
    console.log(data);
    return;
    $.post(this.env.PUSH_RESULT_URL, data, function(res){
        if(typeof(res)=="string")
            res = JSON.parse(res);

        if(callback) {
            return callback(res);
        }
        handle_submit_score_results(res);
    }).fail($.proxy(function () {
        if (this.submit_count > 5) {
            window.location.replace(window.location.href);
        } else {
            setTimeout($.proxy(function () {
                this.submit_score(is_partial, callback);
            }, this), 2500);
        }
    }, this));
};


///////
function Char(chr, index){
	this.chr = chr;
	this.stats = {valid:false, dur:0, real_valid:true, chr:chr};
}

Char.prototype.keydown = function(chr, dur){
    var valid = chr==this.chr;
    
    this.stats.valid = valid;
    this.stats.dur += dur;
    this.stats.real_valid = this.stats.real_valid && valid;

    return valid;
}



