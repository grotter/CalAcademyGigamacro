var CalAcademyGigamacroPin = function () {
	var $ = jQuery;
	var _tiles;
	var _map = false;
	var _marker = false;

	var _injectMap = function (specimen) {
		if (!_map) {
			var mapDom = $('<div id="leaflet-map" />');
			$('.field-type-geolocation-latlng fieldset').append(mapDom);

			_map = L.map('leaflet-map');

			// specified zoom
			var z = parseInt($('#edit-field-priority-level-und-0-value').val());
			var zoom = isNaN(z) ? 1 : z;

			// center to preset pin if we have one
			var loc = [0, 0];
			var vals = _getPresetPinCoords();
			
			if (vals !== false) {
				loc = [
					parseFloat(vals.lat),
					parseFloat(vals.lng)
				];
			} 

			_map.setView(loc, zoom, {
				pan: {
					animate: false
				}
			});

			_map.on('zoomend', _onZoom);
			_onZoom();	
		}
		
		var tilesUrl = gigamacro.tilesLocation;
		tilesUrl += gigamacro.utils.getTilesMachineName(specimen) + '/{z}/{x}/{y}.png';

		// refreshing with a diff tileset
		if (_tiles) _map.removeLayer(_tiles);

		_tiles = L.tileLayer(tilesUrl, {
			minZoom: gigamacro.minZoom,
			maxZoom: gigamacro.maxZoom,
			noWrap: true
		});

		_map.addLayer(_tiles);
	}

	var _onZoom = function () {
		$('.leaflet-bottom.leaflet-left').html('Zoom level: <strong>' + _map.getZoom() + '</strong>');
	}

	var _onMarkerMove = function (e) {
		var coords = e.target.getLatLng();

		$('#edit-field-geolocation-und-0-lat').val(coords.lat);
		$('#edit-field-geolocation-und-0-lng').val(coords.lng);
	}

	var _getPresetPinCoords = function () {
		var isSet = true;

		var vals = {
			lat: $('#edit-field-geolocation-und-0-lat').val(),
			lng: $('#edit-field-geolocation-und-0-lng').val()
		};

		for (var i in vals) {
			if (isNaN(parseFloat(vals[i]))) {
				isSet = false;
				break;
			}
		}
		
		if (!isSet) return false;
		return vals;	
	}

	var _initPin = function () {
		var markerOptions = {
			draggable: true
		};

		// put pin in the center if no coordinates specified
		var loc = _map.getCenter();
		var vals = _getPresetPinCoords();

		if (vals !== false) {
			loc = [
				parseFloat(vals.lat),
				parseFloat(vals.lng)
			];
		}

		_marker = L.marker(loc, markerOptions).addTo(_map);

		// add listener
		_marker.on('drag', _onMarkerMove);
	}

	var _onSpecimenSelect = function () {
		var v = $(this).val();

		if (v == '_none') {
			// destroy map
			if (_map) {
				_map.remove();
				$('#leaflet-map').remove();
				_map = false;
				_marker = false;
			}

			return;
		}

		// init the map
		var selected = $('#edit-field-gigamacro-specimen select option[value="' + v + '"]');
		_injectMap(selected.html());
		
		// init pin
		if (!_marker) _initPin();
	}

	this.initialize = function () {
		// geoloc fields should be readonly
		var fields = $('.field-name-field-geolocation input');
		fields.attr('readonly', 'true');

		// icon image path
		L.Icon.Default.imagePath = '/sites/all/libraries/leaflet/images';

		// init speciment select
		$('#edit-field-gigamacro-specimen select').on('change', _onSpecimenSelect);
		$('#edit-field-gigamacro-specimen select').trigger('change');
	}

	this.initialize();
}
