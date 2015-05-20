var CalAcademyGigamacroViewer = function (specimenData) {
	var $ = jQuery;
	var that = this;
	var _specimenData = specimenData;
	var _map;
	var _tiles;
	var _index = false;
	var _pinsData;
	var _pins = [];
	var _lastPin;
	var _slider;
	var _mapCollapseEvents = 'click zoomstart';
	
	var _timeoutHighlight;
	var _timeoutBubbleContent;
	var _timeoutDisableMoveListener;
	var _timeoutAnimation;
	var _timeoutSmartphoneLegend;
	var _timeoutSmartphoneLegendContent;

	var _isAnimating = false;
	var _fingerString = 'Use your fingers to zoom';
	var _returnString = 'Return to gallery';
	var _smartphoneDockOpenClass = 'smartphone-dock-open';

	var _smartphoneDockToggle = {
		open: 'Read More',
		close: 'Close Information'
	};

	var _timeouts = [
		_timeoutSmartphoneLegendContent,
		_timeoutSmartphoneLegend,
		_timeoutHighlight,
		_timeoutBubbleContent,
		_timeoutDisableMoveListener,
		_timeoutAnimation
	];

	var _svgs = {
		chevron: '',
		arrow_return: '',
		pin: '',
		buttons: '',
		reset: ''
	};

	var _hackLeaflet = function () {
		// shrink the minimap aiming rectangle
		// L.Path.CLIP_PADDING = -.23;

		// prevent leaflet from prematurely killing animations
		L.Map.include({
			_catchTransitionEnd: function (e) {
				if (_isAnimating) return;

				if (this._animatingZoom && e.propertyName.indexOf('transform') >= 0) {
					this._onZoomTransitionEnd();
				}
			}
		});
	}

	var _initPointerEvents = function () {
		var _off = function (e) {
			$(this).removeClass('active');
		}
		var _on = function (e) {
			$(this).addClass('active');
		}

		if (Modernizr.touch) {
			$('.pointer-button').touchleave(_off);
			$('.pointer-button').on('touchstart', _on);
			$('.pointer-button').on('touchend', _off);
		} else {
			$('.pointer-button').on('mousedown', _on);
			$('.pointer-button').on('mouseup mouseleave', _off);		
		}
	}

	var _initMap = function (tiles) {
		_tiles = gigamacro.utils.getTilesMachineName(tiles);

		// create container
		$('#content').append('<div id="leaflet-map-container"><div id="leaflet-map" /></div>');

		// create map
		_map = L.map('leaflet-map', {
			zoomControl: false
		});

		var zoomControl = new L.Control.Zoom({
			position: 'topright'
		}).addTo(_map);

		// tighter initial zoom for smartphones
		var z = $('html').hasClass('smartphone') ? 0 : 1;

		_map.setView([0, 0], z, {
			pan: {
				animate: false
			}
		});

		var tilesUrl = gigamacro.tilesLocation;
		tilesUrl += _tiles + '/{z}/{x}/{y}.png';

		var tiles = L.tileLayer(tilesUrl, {
			minZoom: gigamacro.minZoom,
			maxZoom: gigamacro.maxZoom,
			noWrap: true
		});

		// certain browsers don't layout smartphone stuff correctly
		// without this
		var onTilesLoad = function () {
			tiles.off('load', onTilesLoad);
			
			$('#smartphone-legend').addClass('smartphone-stuff');
			// $('#smartphone-legend, #smartphone-return, #smartphone-legend-toggle').addClass('smartphone-stuff');
			
			$('#smartphone-legend').addClass('no-animation');
			_setSmartphoneDockPosition(false);
			
			setTimeout(function () {
				$('#smartphone-legend').removeClass('no-animation');
			}, 25);
		}

		tiles.on('load', onTilesLoad);

		_map.addLayer(tiles);
		_addMiniMap(tilesUrl);
	}

	var _removeFingers = function () {
		_map.off('zoomstart', _removeFingers);
		_map.off('click move', _removeFingers);
		
		$('#fingers').css('opacity', 0);

		setTimeout(function () {
			$('#fingers').remove();
		}, 395);
	}

	var _setRemoveFingersListener = function () {
		$('.leaflet-map-pane').off('touchstart', _setRemoveFingersListener);
		_map.off('mousedown', _setRemoveFingersListener);
		
		_map.on('click move', _removeFingers);
	}

	var _addFingers = function () {
		$('#content').append('<div id="fingers"><div>' + _fingerString + '</div></div>');

		setTimeout(function () {
			$('#fingers').css('opacity', 1);
		}, 10);

		setTimeout(function () {
			$('#fingers div').addClass('pulse');
		}, 410);

		// remove fingers on any kind of movement
		_map.on('zoomstart', _removeFingers);
		_map.on('mousedown', _setRemoveFingersListener);
		$('.leaflet-map-pane').on('touchstart', _setRemoveFingersListener);
	}

	var _addMiniMap = function (tilesUrl) {
		var creature = new L.TileLayer(tilesUrl, {
			minZoom: _map.getMinZoom(),
			maxZoom: _map.getMaxZoom(),
			noWrap: true
		});
		
		var d = _getMinimapDimensions();
		
		var miniMap = new L.Control.MiniMap(creature, {
			width: d.w,
			height: d.h,
			zoomAnimation: false,
			zoomLevelOffset: -4,
			aimingRectOptions: {
				color: '#000000',
				opacity: 1,
				lineCap: 'square',
				lineJoin: 'miter',
				weight: 6,
				fill: false
			},
			shadowRectOptions: {
				fill: false,
				stroke: false
			}
		}).addTo(_map);
		
		$('.leaflet-bottom.leaflet-right').eq(0).append('<div class="minimap-bg" />');

		$(window).on('resize.minimap', function () {
			var d = _getMinimapDimensions();

			$('.leaflet-control-minimap').css('width', d.w);
			$('.leaflet-control-minimap').css('height', d.h);

			$('.minimap-bg').css('width', d.w / 2);
			$('.minimap-bg').css('height', d.h / 2);

			$('.leaflet-control-minimap svg').attr('shape-rendering', 'crispEdges');
		});

		$(window).trigger('resize.minimap');
	}

	var _getMinimapDimensions = function () {
		var w = Math.round($('#content').width() / 2.5);
		if (w % 2) w++;
		
		var h = Math.round($('#content').height() / 2.5);
		if (h % 2) h++;

		return {
			w: w,
			h: h
		};
	}

	var _addResetUI = function () {
		$('#content').prepend('<div class="control-reset pointer-button" />');
		$('.control-reset').html('<div class="text-container">Reset</div>' + _svgs.reset + _svgs.buttons);

		$('.control-reset').on('click dblclick touchend', function () {
			if (_isAnimating) return false;

			var z = $('html').hasClass('smartphone') ? 0 : 1;

			_map.setView([0, 0], z, {
				pan: {
					animate: false
				}
			});

			_setDefaultLegendContent();
			return false;
		});
	}

	var _initPins = function () {
		_pins = [];

		var iconWidth = 82;
		var iconHeight = 82;

		var mySize = [iconWidth, iconHeight];
		var myAnchor = [iconWidth / 2, 65];

		$.each(_pinsData, function (i, obj) {
			var loc = [
				parseFloat(obj.geolocation.lat),
				parseFloat(obj.geolocation.lng)
			];

			var myIcon = L.divIcon({
				className: 'calacademy-pin calacademy-pin-id-' + obj.nid,
				iconSize: mySize,
				iconAnchor: myAnchor,
				html: '<div class="svg-container">' + _svgs.pin + '</div><div class="shadow">shadow</div>'
			});

			var pin = L.marker(loc, {
				icon: myIcon,
				clickable: false
			});

			pin.pinData = obj;

			// add interaction
			pin.on('add', function (e) {
				var start = Modernizr.touch ? 'touchstart' : 'mousedown';
				var end = Modernizr.touch ? 'touchend' : 'click';

				$('.calacademy-pin-id-' + obj.nid).on(start, function () {
					if (!$(this).hasClass('selected')) {
						_map.off(_mapCollapseEvents, _setDefaultLegendContent);
					}

					return false;
				});
				$('.calacademy-pin-id-' + obj.nid).on(end + ' dblclick', function () {
					_onPinClick(obj, loc);
					return false;
				});
			});

			_pins.push(pin);
		});

		// collapse pins on any kind of movement
		_map.on(_mapCollapseEvents, _setDefaultLegendContent);
	}

	var _closeBubble = function () {
		$('#bubble').removeClass('show');
		
		if (_lastPin) {
			_lastPin.removeClass('selected');
			_lastPin = false;
		}
	}

	var _animateBubbleContent = function () {
		clearTimeout(_timeoutBubbleContent);
		
		var d = $('#bubble .dynamic');
		d.addClass('no-animation');	
	    d.css('opacity', 0);

		_timeoutBubbleContent = setTimeout(function () {
			d.removeClass('no-animation');
			d.css('opacity', 1);
		}, 10);
	}

	var _initBubbleView = function () {
		clearTimeout(_timeoutHighlight);

		if ($('#bubble').hasClass('show')) {
			// fade content
			_animateBubbleContent();
		} else {
			// no content fade
			var d = $('#bubble .dynamic');
			d.addClass('no-animation');	
	    	d.css('opacity', 1);
		}

		$('#bubble').removeClass('highlight');
		$('#bubble').addClass('highlight');
		$('#bubble').addClass('show');

		_timeoutHighlight = setTimeout(function () {
			$('#bubble').removeClass('highlight');
		}, 1000);
	}

	var _animateSmartphoneLegendContent = function () {
		var d = $('#smartphone-legend .dynamic');

		d.addClass('no-animation');	
		d.css('opacity', 0);

		clearTimeout(_timeoutSmartphoneLegend);

		_timeoutSmartphoneLegend = setTimeout(function () {
			d.removeClass('no-animation');	
			d.css('opacity', 1);
		}, 10);
	}

	var _updatePinDetailView = function (pinData) {
		_initBubbleView();

		var c = '#bubble, #smartphone-legend';

		$('.details', c).empty();
		_animateSmartphoneLegendContent();

		if (pinData.description) {
			if (pinData.description.value) {
				$('.details', c).html(pinData.description.value);
				gigamacro.utils.addPullQuoteClasses($('.details', c));
			}	
		}

		$('.commenter .name', c).html(pinData.commenter_name);
		$('.commenter .title', c).html(pinData.commenter_title);
		$('.commenter .institution', c).html(pinData.commenter_institution);

		if ($.trim($('.commenter', c).eq(0).text()) == '') {
			$('.commenter', c).addClass('empty');
		} else {
			$('.commenter', c).removeClass('empty');
		}
	}

	var _onPinClick = function (pinData, latlng) {
		var selectedPin = $('.calacademy-pin-id-' + pinData.nid);

		// prevent redundant clicks
		if (selectedPin.hasClass('selected')) return;

		// new pin selection
		selectedPin.addClass('selected');
		
		// keep track of selected pin
		if (_lastPin) _lastPin.removeClass('selected');
		_lastPin = selectedPin;
		
		// populate and style the bubble and smartphone legend
		_updatePinDetailView(pinData);

		// smartphone legend
		if ($('html').hasClass(_smartphoneDockOpenClass)) {
			// already open
			_setSmartphoneDockPosition(true);	
		} else {
			// ghost click button
			var myEvent = Modernizr.touch ? 'touchend' : 'click';
			$('#smartphone-legend').trigger(myEvent);
		}

		// some special map panning stuff
		var point = _map.latLngToContainerPoint(latlng);
		
		if ($('html').hasClass('floor')) {
			point.y += 125;
		} else {
			point.y += 50;
		}

		var targetLoc = _map.containerPointToLatLng(point);
		var doingSlowPanZoom = false;
		
		if ($('html').hasClass('zoom-on-pin-click')) {
			var pinZoom = _getPinZoom(pinData);
			
			if (pinZoom !== false) {
				if (pinZoom > _map.getZoom()) {
					_slowPanZoom(latlng, pinZoom);
					doingSlowPanZoom = true;			
				}
			}
		}

		if (!doingSlowPanZoom) {
			// if bubble overlaps pin, center the map
			if (_isBubbleCollide()) {
				_map.setView(targetLoc);
			}

			_map.on(_mapCollapseEvents, _setDefaultLegendContent);
		}
	}

	var _slowPanZoom = function (targetLocation, targetZoom) {			
		_removeFingers();

		// temporarily disable auto pin collapsing
		_map.off(_mapCollapseEvents, _setDefaultLegendContent);
		clearTimeout(_timeoutDisableMoveListener);
		
		_timeoutDisableMoveListener = setTimeout(function () {
			_map.on(_mapCollapseEvents, _setDefaultLegendContent);
		}, 1500);

		// do animation
		var transitionDuration = .9;
		$('html').addClass('slow-zoom');

		_isAnimating = true;
		clearTimeout(_timeoutAnimation);

		_timeoutAnimation = setTimeout(function () {
			_isAnimating = false;
			$('html').removeClass('slow-zoom');
		}, transitionDuration * 1000);

		_map.setView(targetLocation, targetZoom, {
			pan: {
				animate: true,
				duration: transitionDuration
			},
			zoom: {
				animate: true
			}
		});
	}

	var _doDefaultTextSet = function () {
		var c = '#legend, #smartphone-legend';

		if (_index) {
			$('.common_name', c).html(_specimenData.common_name);
			$('.scientific_name', c).html(_specimenData.scientific_name);
			$('.details', c).html(_specimenData.body.value);
		} else {
			$('.common_name', c).html(_specimenData.title);

			var s = _getField('field_scientific_name');
			if (s) $('.scientific_name', c).html(s.safe_value);

			var b = _getField('body');
			if (b) $('.details', c).html(b.value);
		}

		gigamacro.utils.addPullQuoteClasses($('.details', c));
		$('.commenter', c).addClass('empty');

		// account for crazy clicks
		if ($('html').hasClass(_smartphoneDockOpenClass)) {
			_setSmartphoneDockPosition(true);
		}
	}

	var _setDefaultLegendContent = function (fromSmartphoneToggle) {
		var smartphoneDockOpen = $('html').hasClass(_smartphoneDockOpenClass);

		if (typeof(fromSmartphoneToggle) != 'boolean') fromSmartphoneToggle = false;

		if (fromSmartphoneToggle === false) {
			// smartphone dock
			if ($('html').hasClass(_smartphoneDockOpenClass)) {
				// open
				var myEvent = Modernizr.touch ? 'touchend' : 'click';
				$('#smartphone-legend').trigger(myEvent);	
			} else {
				// already closed
				_setSmartphoneDockPosition(false);
			}	
		}
		
		if (_lastPin) _closeBubble();

		if (smartphoneDockOpen) {
			// wait until dock is done collapsing
			var delay = parseFloat($('#smartphone-legend').css('transition-duration'));
			calacademy.Utils.log('delay smartphone legend reset: ' + delay + 's');
			
			clearTimeout(_timeoutSmartphoneLegendContent);
			_timeoutSmartphoneLegendContent = setTimeout(_doDefaultTextSet, delay * 1000);
		} else {
			_doDefaultTextSet();
		}
	}

	var _initSmartphoneDockToggle = function () {
		var myEvent = Modernizr.touch ? 'touchend' : 'click';

		$('#smartphone-legend').on(myEvent, function (e) {
			var c = $('#smartphone-legend .dynamic');

			if ($('html').hasClass(_smartphoneDockOpenClass)) {
				if (!e.isTrigger) _setDefaultLegendContent(true);
				c.css('opacity', 0);
			} else {
				c.css('opacity', 1);
			}

			$('html').toggleClass(_smartphoneDockOpenClass);
			_setSmartphoneDockPosition($('html').hasClass(_smartphoneDockOpenClass));
			
			return false;
		});


		// prevent scrolling
		var scrollEvent = Modernizr.touch ? 'touchstart' : 'mousewheel';

		$('nav, #smartphone-legend').on(scrollEvent, function (e) {
			if (!$('html').hasClass('smartphone-nav-open') && $('html').hasClass('smartphone')) {
				e.preventDefault();
			}
		});

		$(window).resize(function () {
			_setSmartphoneDockPosition($('html').hasClass(_smartphoneDockOpenClass));
		});
	}

	var _setSmartphoneDockPosition = function (boo, duration) {
		var el = $('#smartphone-legend');

		if (!el || !el.is(':visible')) return;
		if (typeof(duration) == 'undefined') duration = 500;

		var _setPos = function (h) {
			if (!el.hasClass('no-animation')) {
				el.css('transition-duration', duration + 'ms');
			}

			if ($('html').hasClass('csstransforms3d')) {
				el.css('top', '0');
				el.css('transform', 'translate3d(0, ' + h + 'px, 0)');
			} else {
				el.css('top', h + 'px');
			}
		}

		var wH = $('#content').outerHeight(true);

		if (boo) {
			_setPos(wH - el.outerHeight(true) + parseInt(el.css('padding-bottom')));		
		} else {
			var offset = $('#smartphone-legend h1').outerHeight(true);
			_setPos(wH - offset);
		}
	}

	var _initLegend = function () {
		$('#content').prepend('<div id="legend" />');
		$('#content').prepend('<div id="smartphone-legend-toggle"><a href="#"><span></span><div class="chevron">&gt;</div></a></div>');
		$('#content').prepend('<div id="smartphone-legend" />');
		$('#content').prepend('<div id="smartphone-return" />');

		// content containers
		$('#legend, #smartphone-legend').html('<div id="chevron">' + _svgs.chevron + '</div><h1 class="common_name"></h1><h2 class="scientific_name"></h2><div class="dynamic"><h3 class="pin_title pin_stuff"></h3><div class="details"></div><div class="commenter pin_stuff"><div class="name"></div><div class="title"></div><div class="institution"></div></div><div class="return"><a href="#">' + _returnString + '</a></div></div>');
		
		// big return button
		$('#legend').prepend('<div class="return pointer-button"><div class="text-container">' + _returnString + '</div></div>');
		$('#legend .return').prepend(_svgs.arrow_return);

		// return button events
		var e = Modernizr.touch ? 'touchend' : 'click';
		var el = $('#legend .return, #smartphone-legend .return a');

		if (_index) {
			el.on(e, _index.onReturn);
		} else {
			el.on(e, function () {
				window.location.href = '/gigamacro';
				return false;
			});
		}

		_setDefaultLegendContent();
		_initSmartphoneDockToggle();
	}

	var _initBubble = function () {
		$('#content').prepend('<div id="bubble" />');
		$('#bubble').html('<div class="close pointer-button">Close</div><div class="dynamic"><h3 class="pin_title pin_stuff"></h3><div class="details"></div><div class="commenter pin_stuff"><div class="name"></div><div class="title"></div><div class="institution"></div></div></div>');
		$('#bubble .close').html(_svgs.buttons);
		$('#bubble .close').on('touchend click', _closeBubble);
	}

	var _initSharing = function () {
		// for defering display until iframes load (approx.)
		setTimeout(function () {
			$('#gigamacro-sharing').addClass('delay-fired');
		}, 1500);
	}

	var _setZoomClasses = function () {
		var mapZoom = _map.getZoom();
		
		if (mapZoom > 1) {
			$('html').addClass('zoom-gt1');
		} else {
			$('html').removeClass('zoom-gt1');
		}
	}

	var _addPins = function () {
		$.each(_pins, function (i, pin) {
			_map.addLayer(pin);
		});
	}

	var _togglePins = function () {
		if (!$('html').hasClass('toggle-specified-pins-on-zoom')) return;

		// selective zoom
		var mapZoom = _map.getZoom();

		$.each(_pins, function (i, pin) {
			var show = true;
			var pinZoom = _getPinZoom(pin.pinData);

			if (pinZoom !== false) {
				// pin zoom is greater than map zoom, hide
				if (pinZoom > mapZoom) {
					show = false;
				}	
			}
			
			// adding / removing layers causes Leaflet issues.
			// just toggle visibility.
			var el = $('.calacademy-pin-id-' + pin.pinData.nid);

			if (show) {
				el.show();
			} else {
				el.hide();
			}
		});
	}

	var _getPinZoom = function (pinData) {
		var z = pinData.appears_at_zoom;
			
		if (typeof(z) != 'undefined' && !$.isArray(z)) {
			var myInt = parseInt(z);

			if (isNaN(myInt)) {
				return false;
			} else {
				return myInt;
			}
		}
		
		return false; 	
	}

	var _onPinsData = function (data) {
		that.setPinData(data);
		that.initMap();
	}

	var _getField = function (key) {
		if (_specimenData[key]) {
			if ($.isArray(_specimenData[key].und)) {
				if (_specimenData[key].und.length == 1) {
					return _specimenData[key].und[0];
				}
			}
		}

		return false;
	}

	var _isBubbleCollide = function () {
		if ($('html').hasClass('smartphone')) return false;
		
		var collides = $('.calacademy-pin.selected .svg-container').overlaps($('#bubble.show'));
		
		if ($.isArray(collides.hits)) {
			if (collides.hits.length > 0) {
				return true;		
			}
		}

		return false;
	}

	this.getMap = function () {
		if (_map) return _map;
		return false;
	}

	this.setSpecimenData = function (data) {
		_specimenData = data;
	} 

	this.setPinData = function (data) {
		_pinsData = data;
	}

	this.initMap = function () {
		_initLegend();
		_initBubble();
		_initSharing();

		if (_index) {
			_initMap(_specimenData.tiles);
		} else {
			_initMap(_specimenData.field_gigamacro_specimen.und[0].taxonomy_term.name);	
		}
		
		_addResetUI();
		
		_slider = new CalAcademyGigamacroSlider(_map, _svgs.buttons);
		_slider.add();

		_initPins();
		_addFingers();
		_addPins();

		// if not selective zoom, no need for toggling pin visiblity
		var selective = $('html').hasClass('toggle-specified-pins-on-zoom');
		if (selective) _map.on('zoomend', _togglePins);

		_map.on('zoomend', _setZoomClasses);
		_initPointerEvents();

		// not waiting until user zooms to show pins
		if (!$('html').hasClass('defer-pin-view')) {
			_togglePins();
		}
	}

	this.destroy = function () {
		$.each(_timeouts, function (i, t) {
			if (t) clearTimeout(t);
		});

		if (_slider) _slider.destroy();

		if (_map) {
			// accomodate leaflet hack
			try {
				_map._onZoomTransitionEnd();
			} catch (e) {}

			_map.remove();
		}

		_lastPin = false;
		_isAnimating = false;

		$('html').removeClass('zoom-gt1');
		_emptyContent();
	}

	var _setTilesLocation = function () {
		var tiles = $.getQueryString('tiles');

		if (typeof(tiles) == 'string') {
			gigamacro.tilesLocation = tiles;
		}
	}

	var _onSvgsLoaded = function () {
		if (_specimenData) {
			// load pins and immediately load specimen
			var spec = _getField('field_gigamacro_specimen');
			if (!spec) return;

			gigamacro.utils.jsonRequest('gigamacro-pins', { tid: spec.tid }, _onPinsData);
		} else {
			// display index
			_index = new CalAcademyGigamacroIndex(that);
		}
	}

	var _loadSvgs = function (i, arr) {
		if (i == arr.length) {
			_onSvgsLoaded();
			return;
		}

		var str = arr[i];
		var foo = $('<div />');

		foo.load(gigamacro.assetsPath + str + '.svg', function () {
			_svgs[str] = $(this).html();
			_loadSvgs(i + 1, arr);
		});
	}

	var _emptyContent = function () {
		$('#content > *').not('#gigamacro-sharing').remove();
	}

	this.initialize = function () {
		if (_specimenData) $('html').addClass('web');

		_setTilesLocation();
		_hackLeaflet();

		$('html').addClass('toggle-specified-pins-on-zoom');
		_emptyContent();

		// insert leaf svg for styling reference
		if ($('html').hasClass('leaf-ref')) {
			$($('#content').prepend('<div id="leaf-ref" />'));
			$('#leaf-ref').draggable();
		}

		// init svg load
		var arr = [];

		for (var i in _svgs) {
			arr.push(i);
		}

		// start
		_loadSvgs(0, arr);
	}

	this.initialize();

	// account for weird bfcaching (back-forward cache) behavior
	$(window).bind('pageshow', function (e) {
	    try {
		    if (e.originalEvent.persisted) {
		    	calacademy.Utils.log('persisted');
		    	that.initialize();    
		    }
	    } catch (err) {}
	});
}
