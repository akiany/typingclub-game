var env = {
	num_of_rows : 3
}

var row_count = 0;

$(function() {		
	addRow(row_count);
});

function checkForEndOfExp() {
	return row_count == env.num_of_rows;
}

function addRow(i){
	var $row = $("#row-template").clone().css("display","inline").addClass("row-common");
	$row.attr('id', null);
	$('#rows').append($row);

	$.each(['A', 'S', 'D', 'F'], function(index, value){
		var a_cir = createCircle(value);
		$row.children(".leftSec").append(a_cir);
	});

	$.each(['J', 'K', 'L', ';'], function(index, value){
		var a_cir = createCircle(value);
		$row.children(".rightSec").append(a_cir);
	});

	$(".row-common.active").removeClass('active');
	$row.addClass('active');
};

function createCircle(chare){
	var $cirin = $("<div />", {"class":"cirin"}).html(chare);
	var $cirout = $("<div />", {"class":"cirout"});
	$cirout.append($cirin);
		return $cirout;
}

window.addEventListener("keypress", dealWithKeyboard, true);
	
function dealWithKeyboard(e){
	$(".cirout").first().finish();
	var desired_Char=$('.cirout').first().children().text();
	var typed_char = String.fromCharCode(e.keyCode);

	if(typed_char.toUpperCase()==desired_Char.toUpperCase()){
		var f = function() {
			$('.row-common.active').find('.cirout').first().children().
				addClass('cirinoff').removeClass('cirin');
			$(this).addClass('off').removeClass('cirout');
			detectEndOfRow();
		};

		$(".cirout").first().animate({opacity: '0.6'}, 400, f);
		// $(".cirout").first().transition({
		// 		perspective: '100px',
		// 		rotateY: '180deg',
		// 		duration: 1000	,
		// 		complete: function() {
		// 			$('.row-common.active').find('.cirout').first().children().
		// 				addClass('cirinoff').removeClass('cirin');
		// 			$(this).addClass('off').removeClass('cirout');
		// 			detectEndOfRow();
		// 		}
		// });	
	} else {
		$(".cirout").first().transition({
				perspective: '100px',
				rotateX: '180deg',
				complete: function() {
					$('.row-common.active').find(".cirout").first().
						transition({perspective: '100px',rotateX: '0deg'});
				}
		});	
	};

	function detectEndOfRow(){
		if($('.row-common.active .cirout').length == 0){
			++row_count;
			if(checkForEndOfExp()){
				alert('congrads');
			} else {
				addRow(row_count);
				$('#rows').animate({'margin-top': '-=25px'}, 300)
			}
		}
	};
};


