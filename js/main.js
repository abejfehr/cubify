//main.js
var profiles = {
  "rubiks3x3": {
    size: 3,
    palette: [
{ color: [255,255,255], class: 'rubiksWhite' },
{ color: [255,255,0  ], class: 'rubiksYellow' },
{ color: [255,0  ,0  ], class: 'rubiksRed'},
{ color: [255,123,0  ], class: 'rubiksOrange' },
{ color: [0  ,0  ,255], class: 'rubiksBlue' },
{ color: [0  ,255,0  ], class: 'rubiksGreen' }
]
  },
  "minecraft": {
    size: 1,
    palette: [
{ color: [221,221,221], type: 'White wool', class: 'whiteWool'},
{ color: [219,125,62 ], type: 'Orange wool', class: 'orangeWool'},
{ color: [179,80 ,188], type: 'Magenta wool', class: 'magentaWool'},
{ color: [107,138,39 ], type: 'Yellow wool', class: 'yellowWool'},
{ color: [65 ,174,56 ], type: 'Lime wool', class: 'limeWool'},
{ color: [208,132,153], type: 'Pink wool', class: 'pinkWool'},
{ color: [64 ,64 ,64 ], type: 'Gray wool', class: 'grayWool'},
{ color: [154,161,161], type: 'Light gray wool', class: 'lightGrayWool'},
{ color: [46 ,110,137], type: 'Cyan wool', class: 'cyanWool'},
{ color: [126,61 ,181], type: 'Purple wool', class: 'purpleWool'},
{ color: [46 ,56 ,141], type: 'Blue wool', class: 'blueWool'},
{ color: [79 ,50 ,31 ], type: 'Brown wool', class: 'brownWool'},
{ color: [53 ,70 ,27 ], type: 'Green wool', class: 'greenWool'},
{ color: [150,52 ,48 ], type: 'Red wool', class: 'redWool'},
{ color: [25 ,22 ,22 ], type: 'Black wool', class: 'blackWool'}
    ]
  }
};

var filters = {
  "colormapping": function(image, palette) {
    var ctx = image.getContext('2d');

    var oldpixel;
    var newpixel;

    // Convert each color to it's closest rubiks equivalent
    for (var i = 0; i < image.height; i++) {
      for (var j = 0; j < image.width; j++) {
        oldpixel = ctx.getImageData(j,i,1,1);
        newpixel = getClosestColor(oldpixel, palette);
        ctx.putImageData(newpixel,j,i);
      }
    }

    return image;
  },
  "floyd-steinberg": function(image, palette) {
    var ctx = image.getContext('2d');
    // Declaring the variables outside of the for loop
    var oldpixel;
    var newpixel;
    var quant_error;

    writeMessage('dithering image...');

    // Convert each color to it's closest rubiks equivalent
    for (var i = 0; i < image.height; i++) {
      for (var j = 0; j < image.width; j++) {
        oldpixel = ctx.getImageData(j,i,1,1);
        newpixel = getClosestColor(oldpixel, palette);
        ctx.putImageData(newpixel,j,i);
        quant_error = pixelSubtract(oldpixel, newpixel);
        ctx.putImageData(pixelAdd(ctx.getImageData(j+1,i  ,1,1),pixelMultiply(quant_error, 7/16)),j+1,i  );
        ctx.putImageData(pixelAdd(ctx.getImageData(j-1,i+1,1,1),pixelMultiply(quant_error, 3/16)),j-1,i+1);
        ctx.putImageData(pixelAdd(ctx.getImageData(j  ,i+1,1,1),pixelMultiply(quant_error, 5/16)),j  ,i+1);
        ctx.putImageData(pixelAdd(ctx.getImageData(j+1,i+1,1,1),pixelMultiply(quant_error, 1/16)),j+1,i+1);
      }
    }

    return image;
  }
};


// User's options
var cubeWidth;
var cubeFilter;
var cubeProfile;

// Cube Size Profile
var cubeSize;

var cubify = function() {
  var preview = document.querySelector('#preview');
  var file    = document.querySelector('input[type=file]').files[0]; //sames as here
  var reader  = new FileReader();
  var result  = new Image();

  // Get the user's options
  cubeWidth = parseInt(document.querySelector('input[name=width]').value);
  cubeFilter = document.querySelector('select[name=filter]').value;
  cubeProfile = document.querySelector('select[name=profile]').value;

  cubeSize = profiles[cubeProfile].size;

  // Show that we're loading
  showMessage();
  writeMessage('generating...');

  // Get the image data
  if (file) {
    reader.readAsDataURL(file); //reads the data as a URL
  }
  else {
    writeMessage('no image found!');
    window.setTimeout(hideMessage, 2000);
    preview.src = "";
  }

  // Once the image is loaded...
  reader.onloadend = function () {
    writeMessage('resizing image...');
    // Resize the image
    result.src = reader.result;

    // Convert and show the final picture
    var processedImage = processImage(result, cubeWidth*cubeSize, profiles[cubeProfile].palette);
    preview.src = processedImage.toDataURL();
    $('#preview_area').show();


    writeMessage('drawing blueprint...');
    // Add the picture to the blueprint
    drawBlueprint(processedImage);

    // End the loading
    hideMessage();
  }
}





//
// processImage - resizes an image, takes it's colors from a profile's palette
//  and returns it in a canvas.
//
function processImage(img, width, palette, smooth) {
  // Create a canvas and the canvas context
  var canvas = document.createElement('canvas');
  var ctx = canvas.getContext('2d');

  // Set the height of the canvas to be reasonable
  canvas.width = width;
  canvas.height = canvas.width * img.height / img.width;

  if(smooth){ // I made this optional to save time generating the image
    var oc = document.createElement('canvas'),
    octx = oc.getContext('2d');

    oc.width = img.width * 0.5;
    oc.height = img.height * 0.5;
    octx.drawImage(img, 0, 0, oc.width, oc.height);

    octx.drawImage(oc, 0, 0, oc.width * 0.5, oc.height * 0.5);

    ctx.drawImage(oc, 0, 0, oc.width * 0.5, oc.height * 0.5,
      0, 0, canvas.width, canvas.height);
  }
  else {
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  }

  // Just return the canvas for later use
  return filters[cubeFilter](canvas, palette);
}

//
// getClosestColor - returns the closest color to c from a palette of colors
//
var getClosestColor = function(c, palette) {
  var distance = 999999;
  var index = -1;

  //go through the colors in the palette
  for (var i = 0; i < palette.length; ++i) {
    var e = Math.pow(c.data[0]-palette[i].color[0],2) +
      Math.pow(c.data[1]-palette[i].color[1],2) +
      Math.pow(c.data[2]-palette[i].color[2],2);
    var d = Math.sqrt(e);
    if(d < distance) {
      distance = d;
      index = i;
    }
  }


  var canvas = document.createElement('canvas');
  var ctx = canvas.getContext('2d');
  var f = ctx.getImageData(0,0,1,1);

  f.data[0] = palette[index].color[0];
  f.data[1] = palette[index].color[1];
  f.data[2] = palette[index].color[2];
  f.data[3] = 255;

  return f;
}

var pixelSubtract = function(p1, p2) {
  p1.data[0] -= p2.data[0];
  p1.data[1] -= p2.data[1];
  p1.data[2] -= p2.data[2];
  return p1;
}

var pixelAdd = function(p1, p2) {
  p1.data[0] += p2.data[0];
  p1.data[1] += p2.data[1];
  p1.data[2] += p2.data[2];
  return p1;
}

var pixelMultiply = function(p1, val) {
  p1.data[0] *= val;
  p1.data[1] *= val;
  p1.data[2] *= val;
  return p1;
}

var printColor = function(c) {
  alert(c.data[0] + "," + c.data[1] + "," + c.data[2]);
}


//
var drawBlueprint = function(canvas) {
  var ctx = canvas.getContext('2d');
  var blueprint_area = $('#blueprint_area').empty();
  var table = $('<table id="blueprint"></table>');

  //the indices
  var i,j,k,m,n;

  var row, cell;

  var cube_table, c_row, c_cell;

  //go through all of the pixels here and draw the blueprint
  for (i = 0; i < canvas.height; i+=cubeSize) {
    //create a new table row in the blueprint
    row = $('<tr></tr>').addClass('bp_row');
    for (j = 0; j < canvas.width; j+=cubeSize) {
      cell = $('<td></td>').addClass('bp_cell');

      //in each cube cell, make another 3x3 table
      cube_table = $('<table></table>').addClass('bp_cube_table');

      var color_data = [];
      for (k = 0; k < cubeSize; k++) {
        c_row = $('<tr></tr>').addClass('bp_cube_row');
        for (m = 0; m < cubeSize; m++) {

          //create a new table cell in that row
          var cIndex = -1;
          var pixel = ctx.getImageData(j+m,i+k,1,1).data;

          for (n = 0; n < profiles[cubeProfile].palette.length; n++) {
            if(profiles[cubeProfile].palette[n].color[0] == pixel[0] &&
              profiles[cubeProfile].palette[n].color[1] == pixel[1] &&
              profiles[cubeProfile].palette[n].color[2] == pixel[2]) {
                cIndex = n;
            }
          }

          color_data.push(cIndex);

          c_cell = $('<td></td>').addClass('bp_cube_cell').addClass(index_to_color(cIndex));
          c_row.append(c_cell);
        }
        cube_table.append(c_row);
        cell.append(cube_table).attr('data-x', Math.floor(j / cubeSize) + 1).attr('data-y', Math.floor(i / cubeSize) + 1).attr('data-colors', color_data);
      }
      row.append(cell);
    }
    table.append(row);
  }
  blueprint_area.append(table);

  writeMessage('creating tooltips...');
  $(".bp_cell").each(function() {
    var content = getQTipContent($(this));

    $(this).qtip({
      content: {
        text: content
      },
      position: {
        my: 'left center',
        at: 'right center',
        viewport: $(window)
      },
      style: {
        tip: true,
        classes: 'ui-tooltip-dark ui-tooltip-rounded ui-tooltip-shadow'
      },
      show: { solo: true },
      hide: { fixed: true },
    });
  });

  writeMessage('finished!', '#79E8A4', '#39B368');
}

var getQTipContent = function(cell) {
  var container = $('<div></div>').addClass('cell_metadata_container');

  var x = parseInt(cell.attr('data-x'));
  var y = parseInt(cell.attr('data-y'));
  var color_data = cell.attr('data-colors');

  color_data = color_data.split(',').map(function(val) {
    return parseInt(val);
  });

  // Title
  var title = $('<h1></h1>').append('Cube no. ' + (cubeWidth*(y-1)+x));
  container.append(title);

  // Coordinates
  var coords = $('<p></p>').append('X: ' + x + ', Y: ' + y);
  container.append(coords);

  // Cube diagram
  var table = $('<table></table>');
  for (var i = 0; i < cubeSize; i++) {
    var row = $('<tr></tr>');
    for (var j = 0; j < cubeSize; j++) {
      var cell = $('<td></td>').addClass(index_to_color(color_data[i*cubeSize+j]));
      row.append(cell);
    }
    table.append(row).css('width','50px').css('height','50px').css('border-spacing','1px');
  }
  container.append(table);

  // Algorithm
  if(cubeProfile == "rubiks3x3") {
    var algorithm = $('<p></p>');
    if(!all_same(color_data))
      algorithm.append("Moves: <em>coming soon!</em>");
    else
      algorithm.append('No moves needed')
    container.append(algorithm);
  }

  if(cubeProfile == "minecraft") {
    var cubeName = $('<p></p>');
    cubeName.append(profiles[cubeProfile].palette[color_data[0]].type);
    container.append(cubeName);
  }

  return container.html();
}

var index_to_color = function(i) {
  if(i < 0)
    return 'white';
  return profiles[cubeProfile].palette[i].class;
}

var all_same = function(arr) {
  var val = arr[0];
  for (var i = 1; i < arr.length; i++) {
    if(arr[i] != val)
      return false;
  }
  return true;
}

var updateSlider = function() {
  cubeWidth = parseInt(document.querySelector('input[name=width]').value);
  $('label[for=width]').html('Width: ' + cubeWidth + ' cubes');
}

var showMessage = function() {
  $('#message_area').show();
}

var hideMessage = function() {
  $('#message_area').fadeOut(300, function() {
    // Restore the color
    $('#message_area').css('background-color','#F7B7DF');
    $('#message_area').css('border-color','#E879BD');
  });
}

var writeMessage = function(text, bgcolor, bordercolor) {
  $('#message').html(text);
  $('#message_area').css('background-color', bgcolor);
  $('#message_area').css('border-color', bordercolor);
}


// Listen for mouse movement
var mX, mY, distance;

$(document).mousemove(function(e) {
  var element = $('#preview_area');
  mX = e.pageX;
  mY = e.pageY;
  if($('#preview').attr('src') &&
    !(mX > $(document).width() - $('#preview_area').width() - 90 && mY >
    $(document).height() - $('#preview_area').height() - 90))
    $('#preview_area').show();
  else
    $('#preview_area').hide();
});
