function draw(x, y){
   var canvas = document.getElementById('myCanvas');
   if (canvas.getContext){
      var ctx = canvas.getContext('2d');

      var image = new Image();
      image.src = "img/dog.png";
      ctx.drawImage(image, x, y);
   }
   else{
      
   }
}
