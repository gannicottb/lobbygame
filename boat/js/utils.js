function RandomFloat(min, max) {
  return min + (max - min) * Math.random();
}

//+ Jonas Raoni Soares Silva
//@ http://jsfromhell.com/array/shuffle [v1.0]
function shuffle(o) { //v1.0
	for (var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
	return o;
};

//Simple Timer object suitable for timing up to 59 minutes
//+ Brandon Gannicott
var Timer = function(){    
	var timer_id = null; 
	var time, element_id, endCallback;

	var fmtSeconds = function(seconds){
	  var min = Math.floor(seconds/60);
	  var sec = seconds - (min * 60);
	  if(sec < 10){
	    sec = "0"+sec;
	  }
	  return min+":"+sec;
	};

	var set = function(t, id, callback){
	  time = t;
	  element_id = id;
	  endCallback = callback;
	  update();
	};

	var update = function(){
	  document.getElementById(element_id).innerHTML = fmtSeconds(time);   
	  if(time == 0){
	    clearTimeout(timer_id);
	    timer_id = null;
	    if (endCallback != null) {
	    	endCallback();
	    }  
	     
	  } else {
	    timer_id = setTimeout(update, 1000);
	  	time--;
	  }
	};

	return {
	  set: set,
	  counting: function(){return timer_id != null;}
	}
};
