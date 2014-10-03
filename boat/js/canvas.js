function draw(x, y){
   var canvas = document.getElementById('myCanvas');
   var ctx = canvas.getContext('2d');
   if (ctx != null){
      

      var image = new Image();
      image.src = "img/dog.png";
      ctx.drawImage(image, x, y);
   }
   else{
      
   }
}
