$(function () {
  console.log('init')

  $("#image_1, #image_2").change(function() {
      if(uploadFile(this.files[0]))
          disableButton(this);
  });

  $("#kml_1, #kml_2").change(function() {
      // if()
      uploadKml(this.files[0]);
      disableButton(this);
  });

  $("#form").submit(function(e){
      e.preventDefault();
  });
  
  $('#start_comparison').click(function(){
      console.log('start')
      setLeafletData();
  });

  initLeaflet();
});

var map = null;
var center = [40.712216, -74.22655];
var imageBounds = [];
var imageCollection = [];
const max_resolution = 19000;

function uploadKml(input) {
  var reader = new FileReader();
  reader.readAsText(input);
  reader.onloadend = function(){
      var xmlDom = new DOMParser().parseFromString(reader.result, "text/xml");
      parseKml(xmlDom);



  };
}



function uploadFile(input) {
  var reader = new FileReader();
  //Read the contents of Image File.
  reader.readAsDataURL(input);
      reader.onload = function (e) {
      
      //Initiate the JavaScript Image object.
      var image = new Image();
      
      //Set the Base64 string return from FileReader as source.
      image.src = e.target.result;

      //Validate the File Height and Width.
      image.onload = function () {
        var width = this.width;
        var height = this.height;
        console.log("width:", width, "height:", height)
        
        if (height > max_resolution || width > max_resolution) {
            alert("Height and Width must not exceed " + max_resolution + ".");
            return false;
        }

        imageCollection.push(this);

        console.log(imageCollection);
        return true;
    };
  }  
}

function disableButton(selector) {
  $(selector).attr("disabled", true);
  $("label[for='" + $(selector).attr('id') + "']").addClass('disabled');
}

function setLeafletData() {

  // if(imageCollection.length < 2) {
  //     alert('Please select two image files.')
  //     return;
  // }
  // else if(imageBounds.length < 2) {
  //     alert('Please select two Kml files.')
  //     return
  // } 


  var leftLayer = L.imageOverlay(imageCollection[0].currentSrc, imageBounds[0], {pane: 'left'}).addTo(map);
  var rightLayer = L.imageOverlay(imageCollection[1].currentSrc, imageBounds[1], {pane: 'right'}).addTo(map);

  L.control.sideBySide(leftLayer, rightLayer).addTo(map);

  map.setView(imageBounds[1][0]);

  $("#map").css({ 'opacity': '1', 'z-index' : '10' });

  // var newark = 'http://www.lib.utexas.edu/maps/historical/newark_nj_1922.jpg';
  // var atlantis = 'https://img.vixdata.io/pd/jpg-large/es/sites/default/files/a/atlantis-ciudad-perdida.jpg';
  // imageBounds = [[7.9409, -131.1589], [29.2144, -82.6558]];
  // var leftLayer = L.imageOverlay(imageCollection[0].currentSrc, imageBounds, { pane: 'left' }).addTo(map);
  // imageBounds =  [[7.9409, -131.1589], [29.2144, -82.6558]];
  // var rightLayer = L.imageOverlay(imageCollection[1].currentSrc, imageBounds, { pane: 'right' }).addTo(map);



  // L.imageOverlay(round1, imageBounds).addTo(map);
  // var atlantis = 'http://localhost/leaflet-compare/0.2/images/round2.jpg',
}

function initLeaflet() {
  map = L.map('map').setView([0, 0], 15);

  map.createPane('left');
  map.createPane('right');

  // map.createPane('left');
  // map.createPane('right');

  // var round1 = './images/round3.jpg',
  // imageBounds = [[32.048316, 34.800225], [32.041330, 34.792927]];
  // var leftLayer = L.imageOverlay(round1, imageBounds, { pane: 'left' }).addTo(map);

  // var atlantis = 'http://localhost/leaflet-compare/0.2/images/round2.jpg',
  // imageBounds = [[7.9409, -131.1589], [29.2144, -82.6558]];
  // var rightLayer = L.imageOverlay(atlantis, imageBounds, { pane: 'right' }).addTo(map);
}

function parseKml(xmlDom) {
  var south = parseFloat(xmlDom.getElementsByTagName('south')[0].textContent);
  var west = parseFloat(xmlDom.getElementsByTagName('west')[0].textContent);
  var north = parseFloat(xmlDom.getElementsByTagName('north')[0].textContent) * 1;
  var east = parseFloat(xmlDom.getElementsByTagName('east')[0].textContent) * 1;

  var bounds = [[south, west], [north, east]];
  imageBounds.push(bounds);
  console.log(bounds);
}
