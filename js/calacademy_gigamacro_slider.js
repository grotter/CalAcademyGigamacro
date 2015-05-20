var CalAcademyGigamacroSlider = function (map, buttonsSvg) {
	var $ = jQuery;
	var _map = map;
	var _buttonsSvg = buttonsSvg;

	var _hackSlider = function () {
		// use a more performant transform animation when possible
		if (!Modernizr.csstransforms3d) return;

		$.ui.slider.prototype._refreshValue = function () {
			var lastValPercent, valPercent, value, valueMin, valueMax,
			oRange = this.options.range,
			o = this.options,
			that = this,
			animate = ( !this._animateOff ) ? o.animate : false,
			_set = {};

			if ( this.options.values && this.options.values.length ) {
				this.handles.each(function( i ) {
					valPercent = ( that.values(i) - that._valueMin() ) / ( that._valueMax() - that._valueMin() ) * 100;
					_set[ that.orientation === "horizontal" ? "left" : "bottom" ] = valPercent + "%";
					
					$( this ).stop( 1, 1 )[ animate ? "animate" : "css" ]( _set, o.animate );
					
					if ( that.options.range === true ) {
						if ( that.orientation === "horizontal" ) {
							if ( i === 0 ) {
								that.range.stop( 1, 1 )[ animate ? "animate" : "css" ]( { left: valPercent + "%" }, o.animate );
							}
							if ( i === 1 ) {
								that.range[ animate ? "animate" : "css" ]( { width: ( valPercent - lastValPercent ) + "%" }, { queue: false, duration: o.animate } );
							}
						} else {
							if ( i === 0 ) {
								that.range.stop( 1, 1 )[ animate ? "animate" : "css" ]( { bottom: ( valPercent ) + "%" }, o.animate );
							}
							if ( i === 1 ) {
								that.range[ animate ? "animate" : "css" ]( { height: ( valPercent - lastValPercent ) + "%" }, { queue: false, duration: o.animate } );
							}
						}
					}
					lastValPercent = valPercent;
				});
			} else {
				value = this.value();
				valueMin = this._valueMin();
				valueMax = this._valueMax();
				valPercent = ( valueMax !== valueMin ) ?
						( value - valueMin ) / ( valueMax - valueMin ) * 100 :
						0;
				
				// _set[ this.orientation === "horizontal" ? "left" : "bottom" ] = valPercent + "%";
				//
				var xPos = Math.ceil((valPercent / 100) * $('#slider').width());
				var w = $('#slider span div').width();

				if (xPos < w) xPos = w;
				_set[ this.orientation === "horizontal" ? "transform" : "bottom" ] = "translate3d(" + xPos + "px, 0, 0)";
				//

				this.handle.stop( 1, 1 )[ animate ? "animate" : "css" ]( _set, o.animate );

				if ( oRange === "min" && this.orientation === "horizontal" ) {
					this.range.stop( 1, 1 )[ animate ? "animate" : "css" ]( { width: valPercent + "%" }, o.animate );
				}
				if ( oRange === "max" && this.orientation === "horizontal" ) {
					this.range[ animate ? "animate" : "css" ]( { width: ( 100 - valPercent ) + "%" }, { queue: false, duration: o.animate } );
				}
				if ( oRange === "min" && this.orientation === "vertical" ) {
					this.range.stop( 1, 1 )[ animate ? "animate" : "css" ]( { height: valPercent + "%" }, o.animate );
				}
				if ( oRange === "max" && this.orientation === "vertical" ) {
					this.range[ animate ? "animate" : "css" ]( { height: ( 100 - valPercent ) + "%" }, { queue: false, duration: o.animate } );
				}
			}
		};
	}

	var _cloneZoomButtons = function () {
		// clone zoom buttons into container
		var zoomButton = $('<div />');
		zoomButton.addClass('zoom-button');
		zoomButton.addClass('pointer-button');
		zoomButton.html(_buttonsSvg);
		
		$('.slider-container').prepend(zoomButton.addClass('zoom-in'));
		$('.slider-container').append(zoomButton.clone().removeClass('zoom-in').addClass('zoom-out'));

		$('.slider-container .zoom-in').on('click touchend', function () {
			_map.zoomIn(1);
			return false;
		});

		$('.slider-container .zoom-out').on('click touchend', function () {
			_map.zoomOut(1);
			return false;
		});

		_map.on('zoomend zoomlevelschange', function () {
			var outEl = $('.slider-container .zoom-out');
			var inEl = $('.slider-container .zoom-in');

			if (_map.getZoom() == _map.getMinZoom()) {
				outEl.removeClass('active');
				outEl.addClass('disabled');
			} else {
				outEl.removeClass('disabled');
			}
			
			if (_map.getZoom() == _map.getMaxZoom()) {
				inEl.removeClass('active');
				inEl.addClass('disabled');
			} else {
				inEl.removeClass('disabled');
			}
		});
	}

	var _getHandlePosition = function (e) {
		var t = e.originalEvent.touches[0];
		var s = $('#slider');
		var l = t.clientX - s.offset().left;

		if (l < $('#slider span div').outerWidth()) {
			l = $('#slider span div').outerWidth();
		}

		if (l > s.outerWidth()) {
			l = s.outerWidth();
		}

		return l;
	}

	var _onHandleTouchStart = function (e) {
		var l = _getHandlePosition(e);
		$(this).data('target-position', l);
	}

	var _onHandleTouchMove = function (e) {
		$(this).addClass('no-animation');
		var l = _getHandlePosition(e);

		$(this).data('target-position', l);
		$(this).css('transform', 'translate3d(' + l + 'px, 0, 0)');

		return false;
	}

	var _onHandleTouchEnd = function (e) {
		var currentZoom = _map.getZoom();
		if (isNaN(currentZoom)) return false;

		$(this).removeClass('no-animation');

		var per = $(this).data('target-position') / $('#slider').width();
		var z = Math.round(per * _map.getMaxZoom());
		
		_map.setZoom(z);
	}

	var _onTrackClick = function (e) {
		var currentZoom = _map.getZoom();
		if (isNaN(currentZoom)) return false;

		// calculate nearest step
		var xPos = Modernizr.touch ? e.originalEvent.changedTouches[0].clientX : e.clientX;
		var per = (xPos - $('#slider').offset().left) / $('#slider').width();
		var z = Math.round(per * _map.getMaxZoom());
		var l = $('#slider span').offset().left;

		if (z == currentZoom) {
			// if nearest step is the same as the current zoom,
			// check if clicking on either side of the handle
			if (xPos < l) {
				_map.zoomOut(1);	
			} else if (xPos > (l + $('#slider span div').outerWidth())) {
				_map.zoomIn(1);
			}
		} else {
			_map.setZoom(z);	
		}
		
		return false;
	}

	this.add = function () {
		$('#content').append('<div class="slider-container"><div id="slider" /><div id="slider-bg" /></div>');

		_cloneZoomButtons();

		// init slider
		$('#slider').slider({
			min: _map.getMinZoom(),
			max: _map.getMaxZoom(),
			stop: function (e, ui) {
				_map.setZoom(ui.value);
			}
		});

		$('#slider span').html('<div />');

		// custom slider event handlers
		if (Modernizr.touch && Modernizr.csstransforms3d) {
			$('#slider').off('mousedown click');
			$('#slider').on('touchend', _onTrackClick);

			$('#slider span').off('mouseover mouseout focusin focusout');
			$('#slider span').on('touchstart', _onHandleTouchStart);
			$('#slider span').on('touchmove', _onHandleTouchMove);
			$('#slider span').on('touchend', _onHandleTouchEnd);
		} else {
			$('#slider').on('mousedown', _onTrackClick);
			$('#slider span').on('click', _onTrackClick);

			$('#slider span').hover(function () {
				$('#slider').off('mousedown', _onTrackClick);
			}, function () {
				$('#slider').on('mousedown', _onTrackClick);
			});
		}

		// @see
		// https://github.com/Leaflet/Leaflet/pull/1600#issuecomment-77186793
		_map.on('zoomend', function () {
			$('#slider').slider('value', _map.getZoom());
		});

		$(window).on('resize.slider-reset', function () {
			$('#slider').slider('value', _map.getZoom());	
		});
		
		$(window).trigger('resize.slider-reset');
	}

	this.destroy = function () {
		$('#slider').slider('destroy');
		$('.slider-container').remove();
	}

	this.initialize = function () {
		_hackSlider();
	}

	this.initialize();
}
