$(function () {
  initApp()

  $(".loader").fadeOut(500, function () {
      $(".body").animate({ opacity: 1, }, 700);
  });
});

function initApp() {
  console.log('init')

  $("#image_1, #image_2").on("change", function() {
    if (!isUploading) {
      showLoader();
      uploadImage(this.files[0]);
      disableButton(this);
    }
  });

  $("#kml_1, #kml_2").on("change", function() {
      showLoader();
      uploadKml(this.files[0]);
      disableButton(this);
  });

  $(".return_button").click(function () {
      resetApp()
  });

  $("#form").submit(function (e) {
      e.preventDefault();
  });

  $('#start_comparison').click(function () {
      showLoader();
      result = setLeafletData();
      if (result) {
        setTimeout(function(){
          hideLoader();
          showLeaflet();
        }, 2500);
      }
  });

  initLeaflet();
}

var map = null;
var imageBounds = [];
var imageCollection = [];
var disabledButtons = [];
var isUploading = false;
const max_resolution = 19000;

function uploadKml(input) {
  var reader = new FileReader();
  reader.readAsText(input);
  reader.onload = function (e) {
    var xmlDom = new DOMParser().parseFromString(e.target.result, "text/xml");
    hideLoader();
    parseResult = parseKml(xmlDom);
    if (!parseResult) {
      enableLastButton();
      showMessage('אירעה שגיאה בקריאת הנתונים של קובץ ה-KML.', 'red')
    }
    else{
      showMessage('הקובץ נקלט בהצלחה.')
    }
  };
}

var imageCallback = null;
function uploadImage(input) {
  isUploading = true;
  const worker = new Worker("./src/worker.js");
  worker.postMessage(input);

  worker.addEventListener('message', event => {
    var image = new Image();
    image.src = event.data;
    image.onload = function () {
      var width = this.width;
      var height = this.height;
      console.log("width:", width, "height:", height)
      isUploading = false;
      hideLoader();
      if (height > max_resolution || width > max_resolution) {
        var msg = 'אירעה שגיאה בהעלאת התמונה, אנא העלה תמונה האינה עולה מעל גובה ורוחב מקסימלי של 20,000 פיקסלים.';
        showMessage(msg, 'red', 6000);
        enableLastButton();
        clearTimeout(imageCallback);
        return;
      }

      imageCollection.push(this);
      clearTimeout(imageCallback);
      showMessage('התמונה נקלטה בהצלחה.')
    }
  });

  imageCallback = setTimeout(function () {
    if (isUploading) {
      var msg = 'אירעה שגיאה בהעלאת התמונה, אנא העלה תמונה האינה עולה מעל גובה ורוחב מקסימלי של 20,000 פיקסלים.';
      showMessage(msg, 'red', 6000);
      hideLoader();
      enableLastButton();
      isUploading = false;
    }
  }, 6000);
}

function disableButton(selector) {
  disabledButtons.push(selector);
  $(selector).attr("disabled");
  $("label[for='" + $(selector).attr('id') + "']").addClass('disabled');
}

function enableLastButton() {
  var selector = disabledButtons[disabledButtons.length - 1];
  $(selector).attr("disabled");
  $("label[for='" + $(selector).attr('id') + "']").removeClass('disabled');
  disabledButtons.pop();
}

function showLoader() {
    $('.upload_loader').animate({ opacity: 1 });
}

function hideLoader() {
    $('.upload_loader').animate({ opacity: 0 });
}

var messageCallback = null;

function showMessage(message, color = 'green', time = 2500) {
    clearTimeout(messageCallback);
    $('#error_message').text(message).css('color', color).animate({ opacity: 1 });
    messageCallback = setTimeout(function () {
        $('#error_message').animate({ opacity: 0 });
    }, time);

    console.log('msg:', time);
}

function setLeafletData() {
  if (imageCollection.length < 2) {
    showMessage('אנא בחר שני תמונות.', 'red')
    hideLoader();
    return false;
  }
  else if (imageBounds.length < 2) {
    showMessage('אנא בחר שני קבצי KML.', 'red')
    hideLoader();
    return false;
  }

  var leftLayer = L.imageOverlay(imageCollection[0].currentSrc, imageBounds[0], { pane: 'left' }).addTo(map);
  var rightLayer = L.imageOverlay(imageCollection[1].currentSrc, imageBounds[1], { pane: 'right' }).addTo(map);

  L.control.sideBySide(leftLayer, rightLayer).addTo(map);
  map.setView(imageBounds[1][0]);

  return true;
}

function showLeaflet() {
  $(".main_container").animate({ opacity: 0 }, function(){
      $('.return_button').css({ 'display': 'block' });
      $("#map").animate({ opacity: 1 }).css({ 'z-index': '10' });
  });
}

function resetApp() {
  $("#map").animate({ opacity: 0 }, function(){
    $('.return_button').css({ 'display': 'none' });
    $("#image_1, #image_2, #kml_1, #kml_2").each(function() {
        console.log('reset:', this);
        $(this).attr("disabled");
        $("label[for='" + $(this).attr('id') + "']").removeClass('disabled');
    });
    $("#image_1, #image_2, #kml_1, #kml_2").val('');
    map.off();
    map.remove();
    imageBounds = [];
    imageCollection = [];
    disabledButtons = [];
    isUploading = false;
    initLeaflet();
    $('.main_container').animate({ opacity: 1 })
  }).css({ 'z-index': '0' });
}

function initLeaflet() {
  map = L.map('map').setView([0, 0], 15);

  map.createPane('left');
  map.createPane('right');
}

function parseKml(xmlDom) {
  try {
      var south = parseFloat(xmlDom.getElementsByTagName('south')[0].textContent);
      var west = parseFloat(xmlDom.getElementsByTagName('west')[0].textContent);
      var north = parseFloat(xmlDom.getElementsByTagName('north')[0].textContent) * 1;
      var east = parseFloat(xmlDom.getElementsByTagName('east')[0].textContent) * 1;

      var bounds = [[south, west], [north, east]];
      imageBounds.push(bounds);
      console.log(bounds);
      return true;
    }
    catch {
      return false;
    }
}
