$(function () {
  initApp()

  $(".loader").fadeOut(500, function () {
    $(".body").animate({ opacity: 1, }, 700);
  });
});

function initApp() {
  console.log('init')

  $("#image_1, #image_2").on("change", function () {
    if (!isUploading) {
      showLoader();
      uploadImage(this.files[0]);
      disableButton(this);
    }
  });

  $("#kml_1, #kml_2").on("change", function () {
    showLoader();
    uploadKml(this.files[0]);
    disableButton(this);
  });



  $("#form").submit(function (e) {
    e.preventDefault();
  });

  $('#start_comparison').click(function () {
    showLoader();
    result = setLeafletData();
    if (result) {
      setTimeout(function () {
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
var mapSelectorColor = "#6ba3ff";
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
    else {
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

  // FeatureGroup is to store editable layers
  var drawnItems = new L.FeatureGroup();
  map.addLayer(drawnItems);
  var drawControl = new L.Control.Draw({
      edit: {
          featureGroup: drawnItems
      }
  });

  L.drawLocal = {
    draw: {
      toolbar: {
        // #TODO: this should be reorganized where actions are nested in actions
        // ex: actions.undo  or actions.cancel
        actions: {
          title: 'ביטול',
          text: 'ביטול'
        },
        finish: {
          title: 'שמירה',
          text: 'שמירה'
        },
        undo: {
          title: 'ביטול פעולה אחרונה',
          text: 'ביטול פעולה אחרונה'
        },
        buttons: {
          polyline: 'קו',
          polygon: 'מצולע',
          rectangle: 'מלבן',
          circle: 'עיגול',
          marker: 'סימון נקודה',
        }
      },
      handlers: {
        circle: {
          tooltip: {
            start: 'לחץ לציור עיגול על המפה, גרור את העכבר כדי להגדיל את הקוטר.'
          },
          radius: 'רדיוס'
        },
        marker: {
          tooltip: {
            start: 'בחר נקודה על המפה.'
          }
        },
        polygon: {
          tooltip: {
            start: 'לחץ להתחלת ציור מצולע',
            cont: 'המשך לבחור פינות',
            end: 'לחץ על כפתור הסיום כדי לשמור את השינויים.'
          }
        },
        polyline: {
          error: '<strong>Error:</strong> shape edges cannot cross!',
          tooltip: {
            start: 'לחץ להתחלת ציור קו',
            cont: 'לחץ כדי להמשיך לצייר קווים נוספים.',
            end: 'לחץ על הנקודה האחרונה כדי לסיים.'
          }
        },
        rectangle: {
          tooltip: {
            start: 'מצולע'
          }
        },
        simpleshape: {
          tooltip: {
            end: 'שחרר את העכבר כדי לסיים עריכה.'
          }
        }
      }
    },
    edit: {
      toolbar: {
        actions: {
          save: {
            title: 'שמירת שינויים',
            text: 'שמירה'
          },
          cancel: {
            title: 'ביטול עריכה, מחיקת כל השינויים.',
            text: 'ביטול'
          },
          clearAll: {
            title: 'מחיקת כל השכבות',
            text: 'מחיקה'
          }
        },
        buttons: {
          edit: 'עריכת שכבות',
          editDisabled: 'אין שכבות לעריכה.',
          remove: 'מחיקת שכבות',
          removeDisabled: 'אין שכבות למחיקה.'
        }
      },
      handlers: {
        edit: {
          tooltip: {
            text: 'גרור סימונים או פינות כדי לערוך את הסימונים.',
            subtext: 'לחץ על ביטול כדי לבטל את השינויים.'
          }
        },
        remove: {
          tooltip: {
            text: 'לחץ על צורה שברצונך למחוק'
          }
        }
      }
    }
  };

  map.addControl(drawControl);
  // Object created - bind popup to layer, add to feature group
  map.on(L.Draw.Event.CREATED, function(event) {
      var layer = event.layer;
      layer.options.color = mapSelectorColor;
      var content = getPopupContent(layer);
      if (content !== null) {
          layer.bindPopup(content, {removable: true, editable: true});
      }
      drawnItems.addLayer(layer);
  });

  L.control.layers(null, { 'שכבת ציור': drawnItems }, { position: 'topright', collapsed: false }).addTo(map);
  L.control.sideBySide(leftLayer, rightLayer).addTo(map);

  map.setView(imageBounds[1][0]);
  return true;
}

function showLeaflet() {
  $(".main_container").animate({ opacity: 0 }, function () {
    $('.return_button').css({ 'display': 'block' });
    $("#map").animate({ opacity: 1 }).css({ 'z-index': '10' });
  });
}

function resetApp() {
  $("#map").animate({ opacity: 0 }, function () {
    $('.return_button').css({ 'display': 'none' });
    $("#image_1, #image_2, #kml_1, #kml_2").each(function () {
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

  $(".return_button").click(function () {
    resetApp()
  });
}

// Generate popup content based on layer type
// - Returns HTML string, or null if unknown object
var getPopupContent = function(layer) {
  // Marker - add lat/long
  if (layer instanceof L.Marker) {
      return "נ.צ. " + strLatLng(layer.getLatLng());
  // Circle - lat/long, radius
  } else if (layer instanceof L.Circle || layer instanceof L.CircleMarker ) {
      var center = layer.getLatLng(),
          radius = layer.getRadius();
      return "נ.צ. מרכז העיגול: "+strLatLng(center) + "<br />" +
             "רדיוס: " + _round(radius, 2) + " מטרים" + "<br />" +
             "שטח: " + Math.PI * radius * radius + " ²מ";
  // Rectangle/Polygon - area
  } else if (layer instanceof L.Polygon) {
      var latlngs = layer._defaultShape ? layer._defaultShape() : layer.getLatLngs(),
          area = L.GeometryUtil.geodesicArea(latlngs);
          var readableArea = L.GeometryUtil.readableArea(area, true);
          var hectares = readableArea.substring(0, readableArea.length - 2);
          var metersSquared = _round(hectares / 100, 5);
          var returnStr = "שטח : " + metersSquared + ' ק"מ² <br>';
          returnStr += "הקטר: " + hectares;
      return returnStr;
  // Polyline - distance
  } else if (layer instanceof L.Polyline) {
      var latlngs = layer._defaultShape ? layer._defaultShape() : layer.getLatLngs(),
          distance = 0;
      if (latlngs.length < 2) {
          return "מרחק: N/A";
      } else {
          for (var i = 0; i < latlngs.length-1; i++) {
              distance += latlngs[i].distanceTo(latlngs[i+1]);
          }
          return "מרחק: "+_round(distance, 2)+" מטרים";
      }
  }
  return null;
};

// Truncate value based on number of decimals
var _round = function(num, len) {
  return Math.round(num*(Math.pow(10, len)))/(Math.pow(10, len));
};
// Helper method to format LatLng object (x.xxxxxx, y.yyyyyy)
var strLatLng = function(latlng) {
  return "("+_round(latlng.lat, 6)+", "+_round(latlng.lng, 6)+")";
};

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
