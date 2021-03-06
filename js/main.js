//main.js
var previewImage, previewContainer;

// For timing
var start = performance.now();

// A canvas for all 1-pixel edits
var p1canvas = document.createElement('canvas');
var p1ctx = p1canvas.getContext('2d');
var p1id = p1ctx.createImageData(1,1);
var p1 = p1id.data;

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
      { color: [107,138,201], type: 'Light blue wool', class: 'lightBlueWool'},
      { color: [177,166,39 ], type: 'Yellow wool', class: 'yellowWool'},
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
    for (let i = 0; i < image.height; i++) {
      for (let j = 0; j < image.width; j++) {
        oldpixel = ctx.getImageData(j, i, 1, 1);
        newpixel = getClosestColor(oldpixel, palette);
        ctx.putImageData(newpixel, j, i);
      }
    }

    return image;
  },
  "floyd-steinberg": function(image, palette) {
    var ctx = image.getContext('2d');
    var oldpixel, newpixel, quant_error;

    writeMessage('dithering image...', 'inform');

    for (let i = 0; i < image.height; i++) {
      for (let j = 0; j < image.width; j++) {
        oldpixel = ctx.getImageData(j,i,1,1);
        newpixel = getClosestColor(oldpixel, palette);
        // console.log(newpixel);
        ctx.putImageData(newpixel, j, i);
        quant_error = pixelSubtract(oldpixel, newpixel);
        ctx.putImageData(pixelAdd(ctx.getImageData(j+1,i  ,1,1), pixelMultiply(quant_error, 7/16)), j+1, i  );
        ctx.putImageData(pixelAdd(ctx.getImageData(j-1,i+1,1,1), pixelMultiply(quant_error, 3/16)), j-1, i+1);
        ctx.putImageData(pixelAdd(ctx.getImageData(j  ,i+1,1,1), pixelMultiply(quant_error, 5/16)), j  , i+1);
        ctx.putImageData(pixelAdd(ctx.getImageData(j+1,i+1,1,1), pixelMultiply(quant_error, 1/16)), j+1, i+1);
      }
    }

    return image;
  },
  "ordered": function(image, palette) {
    var ctx = image.getContext('2d');

    var oldpixel, newpixel;

    var gamma = 96; // Fixed value for now, seems to give good results
    var threshold = 7;

    // 3x2 Bayer matrix for threshold map
    var threshold_map =
    [[{data:[3/threshold*gamma,3/threshold*gamma,3/threshold*gamma]},
    {data:[6/threshold*gamma,6/threshold*gamma,6/threshold*gamma]},
    {data:[4/threshold*gamma,4/threshold*gamma,4/threshold*gamma]}],
    [{data:[2/threshold*gamma,2/threshold*gamma,2/threshold*gamma]},
    {data:[1/threshold*gamma,1/threshold*gamma,1/threshold*gamma]},
    {data:[5/threshold*gamma,5/threshold*gamma,5/threshold*gamma]}]];

    for (let i = 0; i < image.height; i++) {
      for (let j = 0; j < image.width; j++) {
        oldpixel = pixelAdd(ctx.getImageData(j,i,1,1), threshold_map[i % 2][j % 3]);
        newpixel = getClosestColor(oldpixel, palette);
        ctx.putImageData(newpixel,j,i);
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
  start = performance.now();
  var preview = document.getElementById('preview');
  var file    = document.querySelector('input[type=file]').files[0]; //sames as here
  var reader  = new FileReader();
  var result  = new Image();

  // Get the user's options
  cubeWidth = parseInt(document.querySelector('input[name=width]').value);
  cubeFilter = document.querySelector('select[name=filter]').value;
  cubeProfile = document.querySelector('select[name=profile]').value;

  cubeSize = profiles[cubeProfile].size;


  // Get the image data
  if (file) {
    var fileName = document.getElementById('file_input').value;
    //Check if the filetype is invalid first
    if(!(fileName.lastIndexOf("jpg") === fileName.length - 3 ||
      fileName.lastIndexOf("jpeg") === fileName.length - 4 ||
      fileName.lastIndexOf("png") === fileName.length - 3 ||
      fileName.lastIndexOf("gif") === fileName.length - 3 )) {
        showMessage();
        writeMessage('incorrect format!', 'warn');
        window.setTimeout(hideMessage, 2000);
        preview.src = "";
    }
    else {
      // Show that we're loading
      showMessage();
      writeMessage('generating...', 'inform');

      createImageBitmap(file, {
        resizeWidth: cubeWidth * cubeSize,
      }).then(function (image) {
        writeMessage('resizing image...', 'inform');

        // Convert and show the final picture
        var processedImage = processImage(image, cubeWidth*cubeSize, profiles[cubeProfile].palette);
        preview.src = processedImage.toDataURL();
        $('#preview_area').show();

        writeMessage('drawing blueprint...', 'inform');
        // Add the picture to the blueprint
        drawBlueprint(processedImage);

        // End the loading
        hideMessage();
      });
    }
  }
  else {
    preview.src = "";
  }
}

//
// processImage - resizes an image, takes it's colors from a profile's palette
//  and returns it in a canvas.
//
function processImage(img, width, palette) {
  // Create a canvas and the canvas context
  var canvas = document.createElement('canvas');
  var ctx = canvas.getContext('2d');

  // Set the height of the canvas to be reasonable
  canvas.width = width;
  canvas.height = canvas.width * img.height / img.width;

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  // Just return the canvas for later use
  return filters[cubeFilter](canvas, palette);
}

//
// getClosestColor - returns the closest color to c from a palette of colors
//
var getClosestColor = function(c, palette) {
  var distance = Infinity;
  var index = -1;

  //go through the colors in the palette
  for (let i = 0; i < palette.length; ++i) {
    var d = Math.sqrt(Math.pow(c.data[0]-palette[i].color[0],2) +
      Math.pow(c.data[1]-palette[i].color[1], 2) +
      Math.pow(c.data[2]-palette[i].color[2], 2));
    if(d < distance) {
      distance = d;
      index = i;
    }
  }

  p1[0] = palette[index].color[0];
  p1[1] = palette[index].color[1];
  p1[2] = palette[index].color[2];
  p1[3] = 255;

  return p1id;
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
  var blueprint_area = document.getElementById('blueprint_area');
  blueprint_area.innerHTML = '';
  var table = document.createElement('div');
  table.id = 'blueprint';

  //the indices
  var i,j,k,m,n;

  var row, cell;

  var cube_table, c_row, c_cell;

  //go through all of the pixels here and draw the blueprint
  for (i = 0; i < canvas.height; i+=cubeSize) {
    //create a new table row in the blueprint
    row = document.createElement('div');
    row.classList.add('bp_row');
    for (j = 0; j < canvas.width; j+=cubeSize) {
      cell = document.createElement('div');
      cell.classList.add('bp_cell');

      //in each cube cell, make another 3x3 table
      cube_table = document.createElement('div');
      cube_table.classList.add('bp_cube_table');

      // var color_data = [];
      for (k = 0; k < cubeSize; k++) {
        c_row = document.createElement('div');
        c_row.classList.add('bp_cube_row');
        for (m = 0; m < cubeSize; m++) {

          //create a new table cell in that row
          // var cIndex = -1;
          var pixel = ctx.getImageData(j+m,i+k,1,1).data;

          // for (n = 0; n < profiles[cubeProfile].palette.length; n++) {
          //   if(profiles[cubeProfile].palette[n].color[0] == pixel[0] &&
          //     profiles[cubeProfile].palette[n].color[1] == pixel[1] &&
          //     profiles[cubeProfile].palette[n].color[2] == pixel[2]) {
          //       cIndex = n;
          //   }
          // }

          // color_data.push(cIndex);

          c_cell = document.createElement('div');
          c_cell.classList.add('bp_cube_cell');
          c_cell.style.backgroundColor = `rgb(${pixel[0]},${pixel[1]},${pixel[2]})`;
          // c_cell.style.backgroundColor = 'rgb(' + index_to_color(cIndex) + ')';
          c_row.append(c_cell);
        }
        cube_table.append(c_row);
        cell.append(cube_table);
      }
      row.append(cell);
    }
    table.append(row);
  }
  blueprint_area.append(table);

  writeMessage('creating tooltips...', 'inform');

  writeMessage('finished!', 'succeed');
  console.log(performance.now() - start);
}

// var getQTipContent = function(cell) {
//   var container = $('<div></div>').addClass('cell_metadata_container');
//
//   var x = parseInt(cell.attr('data-x'));
//   var y = parseInt(cell.attr('data-y'));
//   var color_data = cell.attr('data-colors');
//
//   color_data = color_data.split(',').map(function(val) {
//     return parseInt(val);
//   });
//
//   // Title
//   var title = $('<h1></h1>').append('Cube no. ' + (cubeWidth*(y-1)+x));
//   container.append(title);
//
//   // Coordinates
//   var coords = $('<p></p>').append('X: ' + x + ', Y: ' + y);
//   container.append(coords);
//
//   // Cube diagram
//   var table = $('<table></table>');
//   for (let i = 0; i < cubeSize; i++) {
//     var row = $('<tr></tr>');
//     for (let j = 0; j < cubeSize; j++) {
//       var rgbValues = index_to_color(color_data[i*cubeSize+j]);
//       var cell = $('<td></td>')
//       row.append(cell);
//       cell.css('background-color','rgb(' + rgbValues + ')');
//     }
//     table.append(row).css('border-spacing','1px');
//   }
//   container.append(table);
//
//   // Algorithm
//   if(cubeProfile == "rubiks3x3") {
//     var algorithm = $('<p></p>');
//     if(!all_same(color_data))
//       algorithm.append("Moves: <em>coming soon!</em>");
//     else
//       algorithm.append('No moves needed')
//     container.append(algorithm);
//   }
//
//   if(cubeProfile == "minecraft") {
//     var cubeName = $('<p></p>');
//     cubeName.append(profiles[cubeProfile].palette[color_data[0]].type);
//     container.append(cubeName);
//   }
//
//   return container.html();
// }

var index_to_color = function(i) {
  if(i < 0) {
    return 'white';
  }
  return profiles[cubeProfile].palette[i].color;
}

var all_same = function(arr) {
  var val = arr[0];
  for (let i = 1; i < arr.length; i++) {
    if(arr[i] != val) {
      return false;
    }
  }
  return true;
}

var updateSlider = function() {
  cubeWidth = parseInt(document.querySelector('input[name=width]').value);
  $('label[for=width]').html('Width: ' + cubeWidth + ' cubes');
}

// Message functions
var showMessage = function() {
  // $('#message_area').show();
}

var hideMessage = function() {
  // $('#message_area').fadeOut(300);
}

var writeMessage = function(text, level) {
  // if(!level)
  //   level = "inform";
  // $('#message').html(text);
  // $('#message_area').removeClass().addClass(level);
}

// Listen for mouse movement
var mX, mY, distance;
$(document).ready(function() {
  var ua, ms_ie;

  previewImage = $('#preview');
  previewContainer = $('#preview_area')

  ua = window.navigator.userAgent;
  ms_ie = ~ua.indexOf('MSIE ') || ~ua.indexOf('Trident/');

  if(ms_ie) {
    alert("Sorry!\n\nThis website doesn't currently support Internet Explorer.\n\
    \nPlease return using either Chrome or Firefox in order to use this page.");
    $('body').html("This is an unsupported browser.");
  }
});

$(document).mousemove(function(e) {
  mX = e.pageX;
  mY = e.pageY;
  if(previewImage.attr('src') &&
    !(mX > $(document).width() - previewContainer.width() - 90 && mY >
    $(document).height() - previewContainer.height() - 90))
    previewContainer.show();
  else
    previewContainer.hide();
});
