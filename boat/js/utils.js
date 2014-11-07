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
	  document.getElementById(element_id).innerHTML = fmtSeconds(time);
	  //update();
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
	  start: update,
	  counting: function(){return timer_id != null;}
	}
};

function HSVtoRGB(h, s, v) {
    var r, g, b, i, f, p, q, t;
    if (h && s === undefined && v === undefined) {
        s = h.s, v = h.v, h = h.h;
    }
    i = Math.floor(h * 6);
    f = h * 6 - i;
    p = v * (1 - s);
    q = v * (1 - f * s);
    t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }
    return {
        r: Math.floor(r * 255),
        g: Math.floor(g * 255),
        b: Math.floor(b * 255)
    };
};